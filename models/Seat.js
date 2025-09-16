const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  code: { type: String, required: true }, // Ej: "1A", "6B"
  floor: Number,
  type: String, // Salón-Cama, Semi-Cama, etc.
  isAvailable: { type: Boolean, default: true },
  holdUntil: { type: Date, default: null }, // Fecha de expiración del hold
  passenger: {
    name: String,
    id: String,
    origin: String,
    destination: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Seat', seatSchema);

