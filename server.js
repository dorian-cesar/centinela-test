const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/transporte';

// routes
const routeMasterRoutes = require('./routes/routeMasters');
const servicesRoutes = require('./routes/services');
const reservationRoutes = require('./routes/reservations');
const seatRoutes = require('./routes/seats');
const busLayoutRoutes = require('./routes/busLayoutRoutes');
app.use('/api/seats', seatRoutes);

app.use('/api/route-masters', routeMasterRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/bus-layouts', busLayoutRoutes);

app.get('/', (req, res) => res.json({ ok: true, message: 'Transporte Centinela API' }));

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });
