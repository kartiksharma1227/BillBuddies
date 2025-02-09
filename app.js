// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const path = require('path');
// const { v4: uuidv4 } = require('uuid');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Serve static files from public directory
// // app.use(express.static('public'));

// // MongoDB Connection
// const MONGODB_URI = process.env.MONGODB_URI;

// mongoose.connect(MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => {
//   console.log('Connected to MongoDB successfully');
// })
// .catch((error) => {
//   console.error('MongoDB connection error:', error);
// });

// // Add error handler for MongoDB connection
// mongoose.connection.on('error', err => {
//   console.error('MongoDB connection error:', err);
// });

// mongoose.connection.on('disconnected', () => {
//   console.log('MongoDB disconnected');
// });

// mongoose.connection.on('connected', () => {
//   console.log('MongoDB connected');
// });

// // Trip Schema
// const tripSchema = new mongoose.Schema({
//   tripId: { type: String, required: true, unique: true },
//   groupTitle: String,
//   groupMembers: [String],
//   expenses: [{
//     paidBy: String,
//     amount: Number,
//     participants: [String],
//     description: String,
//     timestamp: Date
//   }],
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// const Trip = mongoose.model('Trip', tripSchema);

// // Routes
// app.post('/api/trips', async (req, res) => {
//   try {
//     const tripId = uuidv4();
//     const trip = new Trip({
//       tripId,
//       groupTitle: req.body.groupTitle,
//       groupMembers: req.body.groupMembers,
//       expenses: []
//     });
//     await trip.save();
//     res.json({ tripId });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get('/api/trips/:tripId', async (req, res) => {
//   try {
//     const trip = await Trip.findOne({ tripId: req.params.tripId });
//     if (!trip) {
//       return res.status(404).json({ error: 'Trip not found' });
//     }
//     res.json(trip);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.put('/api/trips/:tripId', async (req, res) => {
//   try {
//     const trip = await Trip.findOneAndUpdate(
//       { tripId: req.params.tripId },
//       {
//         $set: {
//           groupTitle: req.body.groupTitle,
//           groupMembers: req.body.groupMembers,
//           expenses: req.body.expenses,
//           updatedAt: new Date()
//         }
//       },
//       { new: true }
//     );
//     res.json(trip);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Serve index.html for all other routes
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`Access the app at http://localhost:${PORT}`);
// }); 

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the same directory as app.js
app.use(express.static(__dirname));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Add error handler for MongoDB connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

// Trip Schema
const tripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  groupTitle: String,
  groupMembers: [String],
  expenses: [{
    paidBy: String,
    amount: Number,
    participants: [String],
    description: String,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Trip = mongoose.model('Trip', tripSchema);

// Routes
app.post('/api/trips', async (req, res) => {
  try {
    const tripId = uuidv4();
    const trip = new Trip({
      tripId,
      groupTitle: req.body.groupTitle,
      groupMembers: req.body.groupMembers,
      expenses: []
    });
    await trip.save();
    res.json({ tripId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trips/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId });
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/trips/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { tripId: req.params.tripId },
      {
        $set: {
          groupTitle: req.body.groupTitle,
          groupMembers: req.body.groupMembers,
          expenses: req.body.expenses,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the app at http://localhost:${PORT}`);
});
