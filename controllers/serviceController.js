const Service = require('../models/Service');
const RouteMaster = require('../models/RouteMaster');
const Seat = require('../models/Seat');
const { generateServicesForRoute } = require('../utils/serviceGenerator');

exports.generateServices = async (req, res) => {
  try {
    const { routeMasterId, startDate, daysOfWeek } = req.body;

    const route = await RouteMaster.findById(routeMasterId).populate('layout');
    if (!route) return res.status(404).json({ error: 'Ruta maestra no encontrada' });

    const services = await generateServicesForRoute(route, startDate, daysOfWeek);

    res.status(201).json({ message: 'Servicios generados', count: services.length, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getServices = async (req, res) => {
  try {
    const services = await Service.find().populate('routeMaster layout seats');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// GET /api/services/filter?date=YYYY-MM-DD&direction=subida&origin=XXX&destination=YYY

exports.getServicesByFilter =async (req, res) => {
  try {
    const { date, direction, origin, destination } = req.query;

    console.log(req.query);

    if (!date || !direction || !origin || !destination) {
      return res.status(400).json({ message: 'Faltan parámetros obligatorios' });
    }

    // Convertir date a rango de día completo
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const services = await Service.find({
      date: { $gte: start, $lte: end },
      direction,
      origin,
       "departures.stop": destination // <-- así buscas por parada intermedia
    }).populate('seats layout routeMaster');

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al buscar servicios' });
  }
}


