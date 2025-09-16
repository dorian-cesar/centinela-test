const RouteMaster = require('../models/RouteMaster');
const BusLayout = require('../models/BusLayout');

exports.createRouteMaster = async (req, res) => {
  try {
    const route = new RouteMaster(req.body);
    await route.save();
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getRouteMasters = async (req, res) => {
  try {
    const routes = await RouteMaster.find().populate('layout');
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
