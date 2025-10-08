/**
 * Server A - WebSocket Service
 * 
 * This service acts as the real-time communication layer, delivering
 * significant moments to connected frontend clients via WebSocket connections.
 * It consumes processed data from Server B and broadcasts it to all
 * connected WebSocket clients.
 * 
 * Key responsibilities:
 * - Maintain WebSocket connections with frontend clients
 * - Consume significant moments from Kafka
 * - Broadcast real-time updates to all connected clients
 * - Handle client connection lifecycle
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Kafka } = require('kafkajs');
const cors = require('cors');

// Express application setup (minimal setup for WebSocket server)
const app = express();
const port = process.env.PORT || 3002;

// Enable Cross-Origin Resource Sharing for WebSocket connections
app.use(cors());

// Create HTTP server instance
const server = http.createServer(app);

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

// Kafka configuration for consuming significant moments
const kafka = new Kafka({
  clientId: 'server-a', // Unique identifier for this Kafka client
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'] // Kafka broker address
});

// Kafka consumer for receiving significant moments from Server B
const consumer = kafka.consumer({ groupId: 'server-a-group' });
// Topic containing aggregated significant moments
const topic = process.env.KAFKA_TOPIC || 'aggregated-emote-data';

// Set to track all connected WebSocket clients
const clients = new Set();

/**
 * WebSocket connection handler
 * Manages the lifecycle of client connections
 */
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Add the new client to our tracking set
  clients.add(ws);
  
  // Send a welcome message to confirm connection
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to Server A' }));
  
  /**
   * Handle client disconnection
   * Removes client from tracking and logs the event
   */
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  /**
   * Handle WebSocket errors
   * Removes client from tracking and logs the error
   */
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

/**
 * Broadcasts a message to all connected WebSocket clients
 * 
 * @param {Object} data - The data object to broadcast to all clients
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  
  // Iterate through all connected clients
  clients.forEach((client) => {
    // Only send to clients with an open connection
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Main function to start Server A
 * 
 * This function initializes all components:
 * 1. Connects to Kafka to consume significant moments
 * 2. Starts the HTTP/WebSocket server
 * 3. Sets up graceful shutdown handlers
 */
async function run() {
  try {
    // Establish connection to Kafka broker
    await consumer.connect();
    console.log('Connected to Kafka');
    
    // Subscribe to the topic containing significant moments from Server B
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`Subscribed to topic: ${topic}`);
    
    // Start consuming messages from Kafka
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // Parse the significant moments data from the message
          const significantMoments = JSON.parse(message.value.toString());
          console.log(`Received ${significantMoments.length} significant moments`);
          
          // Broadcast the significant moments to all connected WebSocket clients
          broadcast({
            type: 'significant-moments',
            data: significantMoments
          });
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
    
    // Start the HTTP server with WebSocket support
    server.listen(port, () => {
      console.log(`Server A listening on port ${port}`);
    });
    
    /**
     * Graceful shutdown handler
     * Ensures proper cleanup of all connections and resources
     */
    const shutdown = async () => {
      await consumer.disconnect();
      console.log('Disconnected from Kafka');
      
      // Close all active WebSocket connections
      wss.clients.forEach((client) => {
        client.close();
      });
      
      // Close the HTTP server
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };
    
    // Register shutdown handlers for different termination signals
    process.on('SIGINT', shutdown);  // Ctrl+C
    process.on('SIGTERM', shutdown); // Docker stop or kill command
    
  } catch (error) {
    console.error('Error in Server A:', error);
    process.exit(1);
  }
}

// Start the server
run().catch(console.error);
