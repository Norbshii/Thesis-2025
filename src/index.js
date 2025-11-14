import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Temporarily disabled StrictMode to prevent double API calls causing 429 errors
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
