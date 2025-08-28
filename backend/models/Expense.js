const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Others']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// TODO: Add pre-save hook for any data validation
// TODO: Add static methods for expense aggregation (monthly, by category, etc.)

module.exports = mongoose.model('Expense', expenseSchema);
