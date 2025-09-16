import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  // State for WebSocket connection
  const [connected, setConnected] = useState(false);
  const [significantMoments, setSignificantMoments] = useState([]);
  
  // State for settings
  const [interval, setInterval] = useState(30);
  const [threshold, setThreshold] = useState(0.3);
  const [allowedEmotes, setAllowedEmotes] = useState(['😀', '😡', '😢', '😮', '❤️', '👍', '👎', '🔥']);
  
  // State for animations
  const [animatingEmotes, setAnimatingEmotes] = useState([]);
  
  // WebSocket reference
  const wsRef = useRef(null);
  
  // API URL from environment variable
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3002';
  
  // Connect to WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'significant-moments' && Array.isArray(message.data)) {
            // Add new moments to the state
            setSignificantMoments(prevMoments => {
              // Combine new moments with existing ones, avoiding duplicates
              const newMoments = [...message.data, ...prevMoments];
              
              // Sort by timestamp (newest first)
              newMoments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              
              // Limit to 20 moments to avoid performance issues
              return newMoments.slice(0, 20);
            });
            
            // Trigger animation for each significant moment
            message.data.forEach(moment => {
              triggerEmoteAnimation(moment.emote);
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    };
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl]);
  
  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch interval setting
        const intervalResponse = await axios.get(`${apiUrl}/settings/interval`);
        setInterval(intervalResponse.data.interval);
        
        // Fetch threshold setting
        const thresholdResponse = await axios.get(`${apiUrl}/settings/threshold`);
        setThreshold(thresholdResponse.data.threshold);
        
        // Fetch allowed emotes setting
        const emotesResponse = await axios.get(`${apiUrl}/settings/allowed-emotes`);
        setAllowedEmotes(emotesResponse.data.allowedEmotes);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchSettings();
  }, [apiUrl]);
  
  // Function to update interval setting
  const updateInterval = async () => {
    try {
      await axios.put(`${apiUrl}/settings/interval`, { interval });
      alert('Interval updated successfully');
    } catch (error) {
      console.error('Error updating interval:', error);
      alert('Error updating interval');
    }
  };
  
  // Function to update threshold setting
  const updateThreshold = async () => {
    try {
      await axios.put(`${apiUrl}/settings/threshold`, { threshold });
      alert('Threshold updated successfully');
    } catch (error) {
      console.error('Error updating threshold:', error);
      alert('Error updating threshold');
    }
  };
  
  // Function to update allowed emotes setting
  const updateAllowedEmotes = async () => {
    try {
      await axios.put(`${apiUrl}/settings/allowed-emotes`, { allowedEmotes });
      alert('Allowed emotes updated successfully');
    } catch (error) {
      console.error('Error updating allowed emotes:', error);
      alert('Error updating allowed emotes');
    }
  };
  
  // Function to toggle an emote in the allowed emotes list
  const toggleEmote = (emote) => {
    setAllowedEmotes(prevEmotes => {
      if (prevEmotes.includes(emote)) {
        return prevEmotes.filter(e => e !== emote);
      } else {
        return [...prevEmotes, emote];
      }
    });
  };
  
  // Function to trigger emote animation
  const triggerEmoteAnimation = (emote) => {
    // Create multiple emotes for the animation
    const newEmotes = [];
    const count = Math.floor(Math.random() * 8) + 5; // 5-12 emotes
    
    for (let i = 0; i < count; i++) {
      newEmotes.push({
        id: Date.now() + i,
        emote,
        left: Math.random() * 100, // Random horizontal position (0-100%)
        delay: Math.random() * 2 // Random delay (0-2s)
      });
    }
    
    setAnimatingEmotes(prev => [...prev, ...newEmotes]);
    
    // Remove emotes after animation completes
    setTimeout(() => {
      setAnimatingEmotes(prev => prev.filter(e => !newEmotes.includes(e)));
    }, 6000); // Animation duration + max delay
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  return (
    <div className="container">
      <div className="header">
        <h1>Emote System</h1>
        <p>WebSocket Status: {connected ? 'Connected' : 'Disconnected'}</p>
      </div>
      
      <div className="card">
        <h2>Settings</h2>
        <div className="settings-panel">
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
      
      {/* Emote animation container */}
      <div className="emote-animation-container">
        {animatingEmotes.map(({ id, emote, left, delay }) => (
          <div
            key={id}
            className="floating-emote"
            style={{
              left: `${left}%`,
              bottom: '-50px',
              animationDelay: `${delay}s`
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
