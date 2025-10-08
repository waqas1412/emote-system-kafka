/**
 * Server B - Data Processing Service
 * 
 * This service processes raw emote data from the generator and identifies
 * significant moments based on configurable thresholds. It acts as the
 * data processing layer in the emote system architecture.
 * 
 * Key responsibilities:
 * - Consumes raw emote data from Kafka
 * - Aggregates emotes by time windows (minute granularity)
 * - Identifies significant moments based on emote ratios
 * - Provides REST API for configuration management
 * - Publishes significant moments to downstream services
 */

const express = require('express');
const { Kafka } = require('kafkajs');
const cors = require('cors');
const bodyParser = require('body-parser');

// Express application setup
const app = express();
const port = process.env.PORT || 3001;

// Middleware configuration
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON request bodies

// Kafka configuration for message processing
const kafka = new Kafka({
  clientId: 'server-b', // Unique identifier for this Kafka client
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'] // Kafka broker address
});

// Kafka consumer for reading raw emote data
const consumer = kafka.consumer({ groupId: 'server-b-group' });
// Kafka producer for publishing significant moments
const producer = kafka.producer();

// Kafka topic configuration
const topicIn = process.env.KAFKA_TOPIC_IN || 'raw-emote-data';     // Input topic (from emote generator)
const topicOut = process.env.KAFKA_TOPIC_OUT || 'aggregated-emote-data'; // Output topic (to server-a)

/**
 * Configuration settings for the emote analysis system
 * These can be dynamically updated via REST API
 */
let settings = {
  interval: 30, // Number of messages to collect before performing analysis
  threshold: 0.3, // Minimum ratio (0-1) for an emote to be considered significant
  allowedEmotes: ['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥'] // Emotes to track and analyze
};

// Buffer for storing incoming messages before analysis
// Messages are processed in batches to improve efficiency
let collectedMessages = [];

// Aggregated emote counts organized by minute-level timestamps
// Structure: { timestamp: { emote: count, total: totalCount } }
let emoteCounts = {};

/**
 * Analyzes collected emote messages to identify significant moments
 * 
 * This function performs the core analysis logic:
 * 1. Aggregates emotes by minute-level time windows
 * 2. Calculates emote ratios within each time window
 * 3. Identifies moments where emote ratios exceed the threshold
 * 
 * @returns {Array} Array of significant moments with metadata
 */
function analyzeEmotes() {
  if (collectedMessages.length === 0) {
    return [];
  }

  console.log(`Analyzing ${collectedMessages.length} messages`);
  
  // Reset emote counts for fresh analysis
  emoteCounts = {};
  
  // Process each collected message
  collectedMessages.forEach(message => {
    try {
      // Parse the message payload to extract emote and timestamp
      const { emote, timestamp } = JSON.parse(message.value.toString());
      
      // Filter out emotes not in the allowed list for analysis
      if (!settings.allowedEmotes.includes(emote)) {
        return;
      }
      
      // Normalize timestamp to minute-level granularity for aggregation
      // This groups emotes by minute to identify trends over time
      const date = new Date(timestamp);
      const minuteTimestamp = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes()
      ).toISOString();
      
      // Initialize aggregation structure for this time window
      if (!emoteCounts[minuteTimestamp]) {
        emoteCounts[minuteTimestamp] = {
          total: 0 // Total emote count in this minute
        };
        
        // Initialize individual emote counters
        settings.allowedEmotes.forEach(e => {
          emoteCounts[minuteTimestamp][e] = 0;
        });
      }
      
      // Increment counters for this emote and time window
      emoteCounts[minuteTimestamp][emote]++;
      emoteCounts[minuteTimestamp].total++;
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Identify significant moments based on emote ratios
  const significantMoments = [];
  
  // Iterate through each time window and emote type
  Object.entries(emoteCounts).forEach(([timestamp, counts]) => {
    settings.allowedEmotes.forEach(emote => {
      if (counts[emote] && counts.total > 0) {
        // Calculate the ratio of this emote to total emotes in this time window
        const ratio = counts[emote] / counts.total;
        
        // Check if this emote exceeds the significance threshold
        if (ratio > settings.threshold) {
          significantMoments.push({
            timestamp,           // Time window when this occurred
            emote,              // The significant emote
            count: counts[emote], // Number of occurrences of this emote
            total: counts.total, // Total emotes in this time window
            ratio               // Calculated significance ratio
          });
        }
      }
    });
  });
  
  // Clear the message buffer for the next analysis cycle
  collectedMessages = [];
  
  return significantMoments;
}

/**
 * Publishes significant moments to the output Kafka topic
 * 
 * @param {Array} moments - Array of significant moment objects to publish
 */
async function sendSignificantMoments(moments) {
  if (moments.length === 0) {
    return;
  }
  
  try {
    await producer.send({
      topic: topicOut,
      messages: [
        { 
          // Serialize the significant moments array for transmission
          value: JSON.stringify(moments)
        }
      ]
    });
    
    console.log(`Sent ${moments.length} significant moments to Kafka`);
  } catch (error) {
    console.error('Error sending significant moments to Kafka:', error);
  }
}

// ==================== REST API ROUTES ====================
// These endpoints allow the frontend to configure analysis parameters

/**
 * GET /settings/interval
 * Retrieves the current analysis interval setting
 */
app.get('/settings/interval', (req, res) => {
  res.json({ interval: settings.interval });
});

/**
 * PUT /settings/interval
 * Updates the analysis interval (number of messages before analysis)
 */
app.put('/settings/interval', (req, res) => {
  const { interval } = req.body;
  
  // Validate input - interval must be a positive number
  if (typeof interval !== 'number' || interval <= 0) {
    return res.status(400).json({ error: 'Interval must be a positive number' });
  }
  
  settings.interval = interval;
  res.json({ interval: settings.interval });
});

/**
 * GET /settings/threshold
 * Retrieves the current significance threshold setting
 */
app.get('/settings/threshold', (req, res) => {
  res.json({ threshold: settings.threshold });
});

/**
 * PUT /settings/threshold
 * Updates the significance threshold (0-1, ratio for significant moments)
 */
app.put('/settings/threshold', (req, res) => {
  const { threshold } = req.body;
  
  // Validate input - threshold must be between 0 and 1
  if (typeof threshold !== 'number' || threshold <= 0 || threshold >= 1) {
    return res.status(400).json({ error: 'Threshold must be a number between 0 and 1' });
  }
  
  settings.threshold = threshold;
  res.json({ threshold: settings.threshold });
});

/**
 * GET /settings/allowed-emotes
 * Retrieves the current list of allowed emotes for analysis
 */
app.get('/settings/allowed-emotes', (req, res) => {
  res.json({ allowedEmotes: settings.allowedEmotes });
});

/**
 * PUT /settings/allowed-emotes
 * Updates the list of emotes to track and analyze
 */
app.put('/settings/allowed-emotes', (req, res) => {
  const { allowedEmotes } = req.body;
  
  // Validate input - must be a non-empty array
  if (!Array.isArray(allowedEmotes) || allowedEmotes.length === 0) {
    return res.status(400).json({ error: 'Allowed emotes must be a non-empty array' });
  }
  
  settings.allowedEmotes = allowedEmotes;
  res.json({ allowedEmotes: settings.allowedEmotes });
});

/**
 * Main function to start Server B
 * 
 * This function initializes all components:
 * 1. Connects to Kafka (consumer and producer)
 * 2. Starts consuming raw emote data
 * 3. Starts the Express REST API server
 * 4. Sets up graceful shutdown handlers
 */
async function run() {
  try {
    // Establish Kafka connections
    await consumer.connect();
    await producer.connect();
    console.log('Connected to Kafka');
    
    // Subscribe to the input topic for raw emote data
    await consumer.subscribe({ topic: topicIn, fromBeginning: false });
    console.log(`Subscribed to topic: ${topicIn}`);
    
    // Start the message consumption loop
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        // Buffer the incoming message for batch processing
        collectedMessages.push(message);
        
        // Trigger analysis when we have collected enough messages
        if (collectedMessages.length >= settings.interval) {
          const significantMoments = analyzeEmotes();
          await sendSignificantMoments(significantMoments);
        }
      },
    });
    
    // Start the Express HTTP server for REST API
    app.listen(port, () => {
      console.log(`Server B listening on port ${port}`);
    });
    
    /**
     * Graceful shutdown handler
     * Ensures proper cleanup of Kafka connections
     */
    const shutdown = async () => {
      await consumer.disconnect();
      await producer.disconnect();
      console.log('Disconnected from Kafka');
      process.exit(0);
    };
    
    // Register shutdown handlers for different termination signals
    process.on('SIGINT', shutdown);  // Ctrl+C
    process.on('SIGTERM', shutdown); // Docker stop or kill command
    
  } catch (error) {
    console.error('Error in Server B:', error);
    process.exit(1);
  }
}

// Start the server
run().catch(console.error);
