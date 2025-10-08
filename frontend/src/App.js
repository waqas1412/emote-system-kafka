/**
 * Emote System Frontend Application
 * 
 * This React application provides a real-time dashboard for monitoring
 * and configuring the emote analysis system. It connects to both the
 * WebSocket service (Server A) for real-time updates and the REST API
 * (Server B) for configuration management.
 * 
 * Key features:
 * - Real-time display of significant emote moments
 * - Configuration panel for analysis parameters
 * - Animated emote effects for significant moments
 * - WebSocket connection management with auto-reconnect
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  // ==================== STATE MANAGEMENT ====================
  
  // WebSocket connection state
  const [connected, setConnected] = useState(false);
  
  // Significant moments received from the backend
  const [significantMoments, setSignificantMoments] = useState([]);
  
  // Configuration settings (synced with backend)
  const [interval, setInterval] = useState(30);           // Analysis interval
  const [threshold, setThreshold] = useState(0.3);        // Significance threshold
  const [allowedEmotes, setAllowedEmotes] = useState(['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥']);
  
  // Animation state for floating emote effects
  const [animatingEmotes, setAnimatingEmotes] = useState([]);
  
  // WebSocket connection reference for lifecycle management
  const wsRef = useRef(null);
  
  // ==================== CONFIGURATION ====================
  
  // API endpoints from environment variables (with fallbacks for development)
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3002';
  
  // ==================== WEBSOCKET CONNECTION ====================
  
  /**
   * WebSocket connection management with auto-reconnect
   * Establishes real-time communication with Server A for receiving significant moments
   */
  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      // Handle successful connection
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };
      
      // Handle connection close with automatic reconnection
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // Attempt to reconnect after 3 seconds
        // This ensures the app maintains real-time functionality even after network issues
        setTimeout(connectWebSocket, 3000);
      };
      
      // Handle WebSocket errors
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      // Process incoming messages from the backend
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle significant moments data
          if (message.type === 'significant-moments' && Array.isArray(message.data)) {
            // Update the significant moments state with new data
            setSignificantMoments(prevMoments => {
              // Merge new moments with existing ones (newest first)
              const newMoments = [...message.data, ...prevMoments];
              
              // Sort by timestamp to maintain chronological order
              newMoments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              
              // Limit to 20 moments to prevent performance degradation
              return newMoments.slice(0, 20);
            });
            
            // Trigger visual animations for each significant moment
            message.data.forEach(moment => {
              triggerEmoteAnimation(moment.emote);
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    };
    
    // Establish initial connection
    connectWebSocket();
    
    // Cleanup function to close WebSocket on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl]);
  
  // ==================== SETTINGS INITIALIZATION ====================
  
  /**
   * Fetch initial configuration settings from Server B
   * This ensures the UI displays the current backend configuration
   */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch all configuration settings in parallel for better performance
        const [intervalResponse, thresholdResponse, emotesResponse] = await Promise.all([
          axios.get(`${apiUrl}/settings/interval`),
          axios.get(`${apiUrl}/settings/threshold`),
          axios.get(`${apiUrl}/settings/allowed-emotes`)
        ]);
        
        // Update local state with fetched settings
        setInterval(intervalResponse.data.interval);
        setThreshold(thresholdResponse.data.threshold);
        setAllowedEmotes(emotesResponse.data.allowedEmotes);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchSettings();
  }, [apiUrl]);
  
  // ==================== SETTINGS UPDATE FUNCTIONS ====================
  
  /**
   * Updates the analysis interval setting on the backend
   * This controls how many messages are collected before analysis
   */
  const updateInterval = async () => {
    try {
      await axios.put(`${apiUrl}/settings/interval`, { interval });
      alert('Interval updated successfully');
    } catch (error) {
      console.error('Error updating interval:', error);
      alert('Error updating interval');
    }
  };
  
  /**
   * Updates the significance threshold setting on the backend
   * This controls the minimum ratio for an emote to be considered significant
   */
  const updateThreshold = async () => {
    try {
      await axios.put(`${apiUrl}/settings/threshold`, { threshold });
      alert('Threshold updated successfully');
    } catch (error) {
      console.error('Error updating threshold:', error);
      alert('Error updating threshold');
    }
  };
  
  /**
   * Updates the allowed emotes list on the backend
   * This controls which emotes are tracked and analyzed
   */
  const updateAllowedEmotes = async () => {
    try {
      await axios.put(`${apiUrl}/settings/allowed-emotes`, { allowedEmotes });
      alert('Allowed emotes updated successfully');
    } catch (error) {
      console.error('Error updating allowed emotes:', error);
      alert('Error updating allowed emotes');
    }
  };
  
  /**
   * Toggles an emote in the allowed emotes list
   * This allows users to enable/disable specific emotes for analysis
   * 
   * @param {string} emote - The emote character to toggle
   */
  const toggleEmote = (emote) => {
    setAllowedEmotes(prevEmotes => {
      if (prevEmotes.includes(emote)) {
        // Remove emote from the list
        return prevEmotes.filter(e => e !== emote);
      } else {
        // Add emote to the list
        return [...prevEmotes, emote];
      }
    });
  };
  
  /**
   * Triggers animated emote effects for significant moments
   * Creates floating emotes that animate across the screen
   * 
   * @param {string} emote - The emote character to animate
   */
  const triggerEmoteAnimation = (emote) => {
    // Create multiple animated emote instances for visual impact
    const newEmotes = [];
    const count = Math.floor(Math.random() * 8) + 5; // Random count between 5-12 emotes
    
    for (let i = 0; i < count; i++) {
      newEmotes.push({
        id: Date.now() + i,                    // Unique ID for React key
        emote,                                 // The emote character to display
        left: Math.random() * 100,             // Random horizontal position (0-100%)
        delay: Math.random() * 2               // Random animation delay (0-2s)
      });
    }
    
    // Add new animated emotes to the state
    setAnimatingEmotes(prev => [...prev, ...newEmotes]);
    
    // Clean up animated emotes after animation completes
    // This prevents memory leaks from accumulating animation objects
    setTimeout(() => {
      setAnimatingEmotes(prev => prev.filter(e => !newEmotes.includes(e)));
    }, 6000); // Animation duration (4s) + maximum delay (2s)
  };
  
  /**
   * Formats a timestamp for display in the UI
   * 
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted time string
   */
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  // ==================== RENDER COMPONENT ====================
  
  return (
    <div className="container">
      {/* Application header with connection status */}
      <div className="header">
        <h1>Emote System</h1>
        <p>WebSocket Status: {connected ? 'Connected' : 'Disconnected'}</p>
      </div>
      
      {/* Configuration panel for system settings */}
      <div className="card">
        <h2>Settings</h2>
        <div className="settings-panel">
          {/* Analysis interval setting */}
          <div className="setting-item">
            <label>Analysis Interval (messages):</label>
            <div className="setting-row">
              <input 
                type="number" 
                value={interval} 
                onChange={(e) => setInterval(Number(e.target.value))}
                min="1"
              />
              <button onClick={updateInterval}>Update</button>
            </div>
          </div>
          
          {/* Significance threshold setting */}
          <div className="setting-item">
            <label>Significance Threshold (0-1):</label>
            <div className="setting-row">
              <input 
                type="number" 
                value={threshold} 
                onChange={(e) => setThreshold(Number(e.target.value))}
                min="0.01"
                max="0.99"
                step="0.01"
              />
              <button onClick={updateThreshold}>Update</button>
            </div>
          </div>
          
          {/* Allowed emotes configuration */}
          <div className="setting-item">
            <label>Allowed Emotes:</label>
            <div className="setting-row">
              {['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥'].map(emote => (
                <button 
                  key={emote}
                  style={{
                    backgroundColor: allowedEmotes.includes(emote) ? '#4caf50' : '#f44336',
                    margin: '0 5px'
                  }}
                  onClick={() => toggleEmote(emote)}
                >
                  {emote}
                </button>
              ))}
              <button onClick={updateAllowedEmotes}>Update</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Significant moments display */}
      <div className="card">
        <h2>Significant Moments</h2>
        {significantMoments.length === 0 ? (
          <p>No significant moments detected yet.</p>
        ) : (
          <div className="moments-container">
            {significantMoments.map((moment, index) => (
              <div key={index} className="moment-item">
                <div>
                  <span className="emote-display">{moment.emote}</span>
                  <span>Time: {formatTimestamp(moment.timestamp)}</span>
                </div>
                <div>
                  <span>Count: {moment.count}</span>
                  <span style={{ marginLeft: '10px' }}>
                    Ratio: {(moment.ratio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Floating emote animation overlay */}
      {/* This container covers the entire screen for emote animations */}
      <div className="emote-animation-container">
        {animatingEmotes.map(({ id, emote, left, delay }) => (
          <div
            key={id}
            className="floating-emote"
            style={{
              left: `${left}%`,        // Random horizontal position
              bottom: '-50px',        // Start below viewport
              animationDelay: `${delay}s` // Random animation delay
            }}
          >
            {emote}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
