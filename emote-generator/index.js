const { Kafka } = require('kafkajs');

// Available emotes
const EMOTES = ['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥'];

// Kafka configuration
const kafka = new Kafka({
  clientId: 'emote-generator',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();
const topic = process.env.KAFKA_TOPIC || 'raw-emote-data';

// Function to generate a random emote
function getRandomEmote() {
  const randomIndex = Math.floor(Math.random() * EMOTES.length);
  return EMOTES[randomIndex];
}

// Function to generate emote data
function generateEmoteData() {
  const timestamp = new Date().toISOString();
  const emote = getRandomEmote();
  
  // 80% chance for single emote, 20% chance for burst
  const isBurst = Math.random() < 0.2;
  
  if (isBurst) {
    // Generate a burst of 3-10 emotes
    const burstCount = Math.floor(Math.random() * 8) + 3;
    console.log(`Generating burst of ${burstCount} ${emote} emotes`);
    
    // Send multiple emotes with the same timestamp
    for (let i = 0; i < burstCount; i++) {
      sendEmote(emote, timestamp);
    }
  } else {
    // Send a single emote
    console.log(`Generating single emote: ${emote}`);
    sendEmote(emote, timestamp);
  }
}

// Function to send emote to Kafka
async function sendEmote(emote, timestamp) {
  try {
    await producer.send({
      topic,
      messages: [
        { 
          value: JSON.stringify({ 
            emote, 
            timestamp 
          }) 
        }
      ]
    });
  } catch (error) {
    console.error('Error sending emote to Kafka:', error);
  }
}

// Main function to start the emote generator
async function run() {
  try {
    // Connect to Kafka
    await producer.connect();
    console.log('Connected to Kafka');
    
    // Generate emote data every second
    setInterval(generateEmoteData, 1000);
    
    // Handle shutdown gracefully
    const shutdown = async () => {
      clearInterval(interval);
      await producer.disconnect();
      console.log('Disconnected from Kafka');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('Error in emote generator:', error);
    process.exit(1);
  }
}

// Start the emote generator
run().catch(console.error);
