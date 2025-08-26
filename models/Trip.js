const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: String,
  email: String,
  qrCodeUrl: String
});

const expenseSchema = new mongoose.Schema({
  paidBy: String,
  amount: Number,
  participants: [String],
  description: String,
  timestamp: Date,
  addedBy: String,
  category: { type: String, default: "General" },
  receiptUrl: String
});

const settlementSchema = new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  status: { type: String, default: "pending" },
  settledAt: Date,
  screenshotUrl: String,
  proofUrl: String 
});

const tripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  groupTitle: String,
  groupMembers: [memberSchema],   // 👈 now name + email
  expenses: [expenseSchema],
  settlements: [settlementSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Trip', tripSchema);
