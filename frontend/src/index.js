/**
 * React Application Entry Point
 * 
 * This file initializes the React application and renders the main App component.
 * It uses React 18's createRoot API for improved performance and features.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Create a React root for the application
// This replaces the legacy ReactDOM.render() method
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the main App component wrapped in StrictMode
// StrictMode enables additional checks and warnings for development
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
