const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 🆕 Import cors
const bookingRoutes = require('./routes/bookingRoutes');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = 5000;

// 🆕 Use CORS middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow only your React app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Middleware to parse JSON
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/event_tickets', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', bookingRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});