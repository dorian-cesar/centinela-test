const Seat = require('../models/Seat');

// RESERVAR asiento (hold temporal)
async function reserveSeat(req, res) {
  try {
    const { serviceId, seatCode, passengerName, passengerId, origin, destination } = req.body;

    if (!serviceId || !seatCode || !passengerName || !passengerId || !origin || !destination) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const seat = await Seat.findOne({ service: serviceId, code: seatCode });
    if (!seat) return res.status(404).json({ message: 'Asiento no encontrado' });

    const now = new Date();
    if (!seat.isAvailable || (seat.holdUntil && seat.holdUntil > now)) {
      return res.status(400).json({ message: 'Asiento no disponible' });
    }

    seat.isAvailable = false;
    seat.holdUntil = new Date(now.getTime() + 10 * 60 * 1000); // hold 10 min
    seat.passenger = { name: passengerName, id: passengerId, origin, destination };

    await seat.save();

    res.status(201).json({ message: `Asiento ${seat.code} reservado temporalmente`, seat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al reservar asiento' });
  }
}

// CONFIRMAR asiento (ocupado hasta destino)
async function confirmSeat(req, res) {
  try {
    const { serviceId, seatCode } = req.body;
    if (!serviceId || !seatCode) return res.status(400).json({ message: 'Faltan datos obligatorios' });

    const seat = await Seat.findOne({ service: serviceId, code: seatCode });
    if (!seat) return res.status(404).json({ message: 'Asiento no encontrado' });

    // Confirmar asiento
    seat.holdUntil = null;  // eliminar expiración de hold
    seat.isAvailable = false; // asegurar que sigue ocupado

    await seat.save();
    res.json({ message: `Asiento ${seat.code} confirmado`, seat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al confirmar asiento' });
  }
}

// LIBERAR asiento (volver a disponible)
async function releaseSeat(req, res) {
  try {
    const { serviceId, seatCode } = req.body;
    if (!serviceId || !seatCode) return res.status(400).json({ message: 'Faltan datos obligatorios' });

    const seat = await Seat.findOne({ service: serviceId, code: seatCode });
    if (!seat) return res.status(404).json({ message: 'Asiento no encontrado' });

    seat.isAvailable = true;
    seat.holdUntil = null;
    seat.passenger = null;

    await seat.save();
    res.json({ message: `Asiento ${seat.code} liberado`, seat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al liberar asiento' });
  }
}

module.exports = { reserveSeat, confirmSeat, releaseSeat };

