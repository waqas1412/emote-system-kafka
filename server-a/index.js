const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Kafka } = require('kafkajs');
const cors = require('cors');

// Express app setup
const app = express();
const port = process.env.PORT || 3002;

// Enable CORS
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Kafka configuration
const kafka = new Kafka({
  clientId: 'server-a',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'server-a-group' });
const topic = process.env.KAFKA_TOPIC || 'aggregated-emote-data';

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Add client to set
  clients.add(ws);
  
  // Send initial message
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to Server A' }));
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Function to broadcast message to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Main function to start the server
async function run() {
  try {
    // Connect to Kafka
    await consumer.connect();
    console.log('Connected to Kafka');
    
    // Subscribe to topic
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`Subscribed to topic: ${topic}`);
    
    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const significantMoments = JSON.parse(message.value.toString());
          console.log(`Received ${significantMoments.length} significant moments`);
          
          // Broadcast to all connected clients
          broadcast({
            type: 'significant-moments',
            data: significantMoments
          });
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
    
    // Start HTTP server
    server.listen(port, () => {
      console.log(`Server A listening on port ${port}`);
    });
    
    // Handle shutdown gracefully
    const shutdown = async () => {
      await consumer.disconnect();
      console.log('Disconnected from Kafka');
      
      // Close all WebSocket connections
      wss.clients.forEach((client) => {
        client.close();
      });
      
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('Error in Server A:', error);
    process.exit(1);
  }
}

// Start the server
run().catch(console.error);
