const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // Add other user fields as needed
}, { timestamps: true });

// TODO: Add pre-save hook to hash password before saving
// TODO: Add method to compare password

module.exports = mongoose.model('User', userSchema);
