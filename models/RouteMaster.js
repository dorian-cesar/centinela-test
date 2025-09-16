const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: String,
  offsetMinutes: Number,// tiempo acumulado desde inicio
  order: Number,
  price: Number
}, { _id: false });

const routeMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  origin: { type: String, required: true },
  baseDepartureTime: { type: String, required: true }, // Ej: "11:30"
  destination: { type: String, required: true },
  direction: { type: String, enum: ['subida', 'bajada'], required: true },
  stops: [stopSchema], // incluye origen y destino
  layout: { type: mongoose.Schema.Types.ObjectId, ref: 'BusLayout' }
}, { timestamps: true });

module.exports = mongoose.model('RouteMaster', routeMasterSchema);
