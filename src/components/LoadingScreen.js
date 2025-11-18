import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading your dashboard...' }) => {
  return (
    <div className="loading-screen-overlay">
      <div className="loading-screen-content">
        {/* Animated Logo Spinner */}
        <div className="logo-spinner-container">
          <svg className="logo-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
            <defs>
              <style>
                {`.pin-outline { fill: none; stroke: #1a365d; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
                 .pin-fill { fill: #1a365d; }
                 .grad-cap { fill: #1a365d; }
                 .checkmark { fill: #1a365d; }
                 .ripple { fill: none; stroke: #1a365d; stroke-width: 2; opacity: 0.6; }`}
              </style>
            </defs>
            
            {/* PinPoint Logo */}
            <path className="pin-outline" d="M50 15 C35 15, 25 25, 25 40 C25 55, 50 80, 50 80 C50 80, 75 55, 75 40 C75 25, 65 15, 50 15 Z"/>
            <path className="pin-fill" d="M50 18 C38 18, 28 27, 28 40 C28 52, 50 75, 50 75 C50 75, 72 52, 72 40 C72 27, 62 18, 50 18 Z"/>
            <rect className="grad-cap" x="40" y="30" width="20" height="8" rx="1"/>
            <rect className="grad-cap" x="38" y="32" width="24" height="2"/>
            <line className="pin-outline" x1="58" y1="32" x2="62" y2="28"/>
            <circle className="grad-cap" cx="62" cy="28" r="1.5"/>
            <path className="checkmark" d="M35 50 L42 57 L52 47" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle className="ripple" cx="50" cy="75" r="8"/>
            <circle className="ripple" cx="50" cy="75" r="12"/>
          </svg>
          
          {/* Orbiting Dots */}
          <div className="orbit-container">
            <div className="orbit-dot orbit-dot-1"></div>
            <div className="orbit-dot orbit-dot-2"></div>
            <div className="orbit-dot orbit-dot-3"></div>
          </div>
        </div>
        
        {/* Loading Text */}
        <div className="loading-text-container">
          <h2 className="loading-title">PinPoint</h2>
          <p className="loading-message">{message}</p>
          
          {/* Animated Dots */}
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;


