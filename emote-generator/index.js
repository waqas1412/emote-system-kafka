/**
 * Emote Generator Service
 * 
 * This service simulates real-time emote data generation for the emote system.
 * It generates random emotes and sends them to a Kafka topic for processing.
 * The service creates both single emotes and bursts of emotes to simulate
 * realistic user behavior patterns.
 */

const { Kafka } = require('kafkajs');

// Available emotes that can be generated
// These represent the full set of emotions the system can track
const EMOTES = ['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥'];

// Kafka configuration for connecting to the message broker
// Uses environment variables for flexibility in different deployment environments
const kafka = new Kafka({
  clientId: 'emote-generator', // Unique identifier for this Kafka client
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'] // Kafka broker address
});

// Create a Kafka producer to send messages to topics
const producer = kafka.producer();
// Topic where raw emote data will be published for processing by other services
const topic = process.env.KAFKA_TOPIC || 'raw-emote-data';

/**
 * Generates a random emote from the available EMOTES array
 * @returns {string} A random emote character
 */
function getRandomEmote() {
  const randomIndex = Math.floor(Math.random() * EMOTES.length);
  return EMOTES[randomIndex];
}

/**
 * Generates emote data with realistic patterns
 * 
 * This function simulates real user behavior by creating:
 * - 80% single emotes (normal usage)
 * - 20% bursts of emotes (high engagement moments)
 * 
 * Bursts simulate scenarios like viral moments, celebrations, or
 * emotional reactions where users send multiple emotes rapidly.
 */
function generateEmoteData() {
  const timestamp = new Date().toISOString(); // Current ISO timestamp
  const emote = getRandomEmote();
  
  // Probability distribution: 80% single emote, 20% burst pattern
  // This creates more realistic emote generation patterns
  const isBurst = Math.random() < 0.2;
  
  if (isBurst) {
    // Generate a burst of 3-10 emotes with the same timestamp
    // This simulates multiple users reacting to the same moment
    const burstCount = Math.floor(Math.random() * 8) + 3;
    console.log(`Generating burst of ${burstCount} ${emote} emotes`);
    
    // Send multiple emotes rapidly with the same timestamp
    // In real scenarios, this would represent multiple users reacting simultaneously
    for (let i = 0; i < burstCount; i++) {
      sendEmote(emote, timestamp);
    }
  } else {
    // Send a single emote (normal usage pattern)
    console.log(`Generating single emote: ${emote}`);
    sendEmote(emote, timestamp);
  }
}

/**
 * Sends an emote message to the Kafka topic
 * 
 * @param {string} emote - The emote character to send
 * @param {string} timestamp - ISO timestamp when the emote was generated
 */
async function sendEmote(emote, timestamp) {
  try {
    await producer.send({
      topic,
      messages: [
        { 
          // Message payload containing emote data
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

/**
 * Main function to start the emote generator service
 * 
 * This function:
 * 1. Connects to Kafka broker
 * 2. Starts the emote generation loop (every second)
 * 3. Sets up graceful shutdown handlers
 */
async function run() {
  try {
    // Establish connection to Kafka broker
    await producer.connect();
    console.log('Connected to Kafka');
    
    // Start the emote generation loop - generates new emotes every second
    // This creates a continuous stream of data for the system to process
    const interval = setInterval(generateEmoteData, 1000);
    
    /**
     * Graceful shutdown handler
     * Ensures proper cleanup of resources when the service is terminated
     */
    const shutdown = async () => {
      clearInterval(interval); // Stop the generation loop
      await producer.disconnect(); // Close Kafka connection
      console.log('Disconnected from Kafka');
      process.exit(0);
    };
    
    // Register shutdown handlers for different termination signals
    process.on('SIGINT', shutdown);  // Ctrl+C
    process.on('SIGTERM', shutdown); // Docker stop or kill command
    
  } catch (error) {
    console.error('Error in emote generator:', error);
    process.exit(1);
  }
}

// Start the emote generator service
run().catch(console.error);
