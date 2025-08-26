require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import configurations and routes
const connectDB = require('./config/database');
const apiRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// API Routes
app.use('/api', apiRoutes);

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
}); 