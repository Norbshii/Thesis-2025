// API Configuration
const config = {
  // Use environment variable if available, otherwise fallback to localhost
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000'
};

export default config;

