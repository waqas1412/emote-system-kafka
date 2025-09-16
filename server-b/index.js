const express = require('express');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const bodyParser = require('body-parser');

// Express app setup
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Kafka configuration
const kafka = new Kafka({
  clientId: 'server-b',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'server-b-group' });
const producer = kafka.producer();

const topicIn = process.env.KAFKA_TOPIC_IN || 'raw-emote-data';
const topicOut = process.env.KAFKA_TOPIC_OUT || 'aggregated-emote-data';

// Settings with default values
let settings = {
  interval: 30, // Number of messages to consume before analysis
  threshold: 0.3, // Threshold for significant moments
  allowedEmotes: ['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥'] // List of allowed emotes
};

// Storage for collected messages
let collectedMessages = [];

// Storage for emote counts by timestamp (minute granularity)
let emoteCounts = {};

// Function to analyze emotes and find significant moments
function analyzeEmotes() {
  if (collectedMessages.length === 0) {
    return [];
  }

  console.log(`Analyzing ${collectedMessages.length} messages`);
  
  // Reset emote counts
  emoteCounts = {};
  
  // Process each message
  collectedMessages.forEach(message => {
    try {
      const { emote, timestamp } = JSON.parse(message.value.toString());
      
      // Skip if emote is not in allowed list
      if (!settings.allowedEmotes.includes(emote)) {
        return;
      }
      
      // Extract minute-level timestamp for aggregation
      const date = new Date(timestamp);
      const minuteTimestamp = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes()
      ).toISOString();
      
      // Initialize counts for this timestamp if not exists
      if (!emoteCounts[minuteTimestamp]) {
        emoteCounts[minuteTimestamp] = {
          total: 0
        };
        
        // Initialize count for each allowed emote
        settings.allowedEmotes.forEach(e => {
          emoteCounts[minuteTimestamp][e] = 0;
        });
      }
      
      // Increment counts
      emoteCounts[minuteTimestamp][emote]++;
      emoteCounts[minuteTimestamp].total++;
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Find significant moments
  const significantMoments = [];
  
  Object.entries(emoteCounts).forEach(([timestamp, counts]) => {
    settings.allowedEmotes.forEach(emote => {
      if (counts[emote] && counts.total > 0) {
        const ratio = counts[emote] / counts.total;
        
        if (ratio > settings.threshold) {
          significantMoments.push({
            timestamp,
            emote,
            count: counts[emote],
            total: counts.total,
            ratio
          });
        }
      }
    });
  });
  
  // Clear collected messages
  collectedMessages = [];
  
  return significantMoments;
}

// Function to send significant moments to Kafka
async function sendSignificantMoments(moments) {
  if (moments.length === 0) {
    return;
  }
  
  try {
    await producer.send({
      topic: topicOut,
      messages: [
        { 
          value: JSON.stringify(moments)
        }
      ]
    });
    
    console.log(`Sent ${moments.length} significant moments to Kafka`);
  } catch (error) {
    console.error('Error sending significant moments to Kafka:', error);
  }
}

// REST API routes
// Get interval setting
app.get('/settings/interval', (req, res) => {
  res.json({ interval: settings.interval });
});

// Update interval setting
app.put('/settings/interval', (req, res) => {
  const { interval } = req.body;
  
  if (typeof interval !== 'number' || interval <= 0) {
    return res.status(400).json({ error: 'Interval must be a positive number' });
  }
  
  settings.interval = interval;
  res.json({ interval: settings.interval });
});

// Get threshold setting
app.get('/settings/threshold', (req, res) => {
  res.json({ threshold: settings.threshold });
});

// Update threshold setting
app.put('/settings/threshold', (req, res) => {
  const { threshold } = req.body;
  
  if (typeof threshold !== 'number' || threshold <= 0 || threshold >= 1) {
    return res.status(400).json({ error: 'Threshold must be a number between 0 and 1' });
  }
  
  settings.threshold = threshold;
  res.json({ threshold: settings.threshold });
});

// Get allowed emotes setting
app.get('/settings/allowed-emotes', (req, res) => {
  res.json({ allowedEmotes: settings.allowedEmotes });
});

// Update allowed emotes setting
app.put('/settings/allowed-emotes', (req, res) => {
  const { allowedEmotes } = req.body;
  
  if (!Array.isArray(allowedEmotes) || allowedEmotes.length === 0) {
    return res.status(400).json({ error: 'Allowed emotes must be a non-empty array' });
  }
  
  settings.allowedEmotes = allowedEmotes;
  res.json({ allowedEmotes: settings.allowedEmotes });
});

// Main function to start the server
async function run() {
  try {
    // Connect to Kafka
    await consumer.connect();
    await producer.connect();
    console.log('Connected to Kafka');
    
    // Subscribe to input topic
    await consumer.subscribe({ topic: topicIn, fromBeginning: false });
    console.log(`Subscribed to topic: ${topicIn}`);
    
    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        // Add message to collection
        collectedMessages.push(message);
        
        // Check if we have enough messages to analyze
        if (collectedMessages.length >= settings.interval) {
          const significantMoments = analyzeEmotes();
          await sendSignificantMoments(significantMoments);
        }
      },
    });
    
    // Start Express server
    app.listen(port, () => {
      console.log(`Server B listening on port ${port}`);
    });
    
    // Handle shutdown gracefully
    const shutdown = async () => {
      await consumer.disconnect();
      await producer.disconnect();
      console.log('Disconnected from Kafka');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('Error in Server B:', error);
    process.exit(1);
  }
}

// Start the server
run().catch(console.error);
