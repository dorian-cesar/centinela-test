const Service = require('../models/Service');
const RouteMaster = require('../models/RouteMaster');
const Seat = require('../models/Seat');
const { generateServicesForRoute } = require('../utils/serviceGenerator');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);
const TZ = 'America/Santiago';


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

exports.getServicesByFilter = async (req, res) => {
  try {
    const { date, origin, destination } = req.query;

    console.log(req.query);

    if (!date || !origin || !destination) {
      return res.status(400).json({ message: 'Faltan parámetros obligatorios' });
    }

    // Convertir date a rango de día completo
    const start = dayjs.tz(date, TZ).startOf('day').toDate(); // UTC equivalente a 00:00 Chile
    const end = dayjs.tz(date, TZ).endOf('day').toDate();

    console.log({ startISO: start.toISOString(), endISO: end.toISOString() });

    const services = await Service.find({
      date: { $gte: start, $lte: end },
      origin,
      "departures.stop": destination // <-- así buscas por parada intermedia
    }).populate('seats layout routeMaster');

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al buscar servicios' });
  }
}


exports.getServicesByID = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate({ path: 'seats', select: 'code floor isAvailable holdUntil passenger' })
      .lean();

    if (!service) {
      return res.status(404).json({ message: 'Service no encontrado' });
    }

    // Helper: parsea "12B" -> { rowNumber: 12, seatLetter: "B" }
    const parseSeatCode = (code = '') => {
      const match = String(code).match(/^(\d+)([A-Za-z])$/);
      return match
        ? { rowNumber: parseInt(match[1], 10), seatLetter: match[2].toUpperCase() }
        : { rowNumber: 0, seatLetter: 'Z' };
    };

    // Helper: estado lógico sin cambiar el modelo
    const toEstado = (seat) => {
      const now = new Date();
      const holdActive = seat.holdUntil && new Date(seat.holdUntil) > now;
      const hasPassenger = !!(seat.passenger && (seat.passenger.name || seat.passenger.id));
      const reserved = hasPassenger || (!seat.isAvailable && !holdActive);

      if (reserved) return { estado: 'reserved', reserved: true };
      if (holdActive) return { estado: 'held', reserved: false };
      return { estado: 'available', reserved: false };
    };

    // Agrupar por piso -> filas (número) -> lista de asientos (orden letras)
    const floors = { 1: {}, 2: {} };

    for (const seat of service.seats || []) {
      const floorNum = Number(seat.floor) === 2 ? 2 : 1;
      const { rowNumber, seatLetter } = parseSeatCode(seat.code);

      if (!floors[floorNum][rowNumber]) floors[floorNum][rowNumber] = [];
      floors[floorNum][rowNumber].push({ seat, seatLetter, rowNumber });
    }

    const letterOrder = ['D', 'C', 'B', 'A'];

    const buildFloorMatrix = (floorObj, floorLabel) => {
      const sortedRowNumbers = Object.keys(floorObj)
        .map(n => parseInt(n, 10))
        .sort((a, b) => a - b);

      const matrix = sortedRowNumbers.map(rowNum => {
        const seatsOfRow = floorObj[rowNum];

        const byLetter = {};
        for (const item of seatsOfRow) {
          byLetter[item.seatLetter] = item.seat;
        }

        const rowArray = [];
        for (const L of letterOrder) {
          const s = byLetter[L];
          if (!s) continue;

          const { estado, reserved } = toEstado(s);

          rowArray.push({
            holdUntil: s.holdUntil || null,
            reserved,
            paid: false,          
            authCode: null,       
            _id: String(s._id),
            floor: floorLabel,    
            asiento: s.code,      
            estado,               
            valorAsiento: 0      
          });
        }

        // Si en una fila hay letras no incluidas en letterOrder, añádelas al final
        const extraSeats = seatsOfRow
          .filter(it => !letterOrder.includes(it.seatLetter))
          .sort((a, b) => a.seatLetter.localeCompare(b.seatLetter)); // orden alfabético
        for (const it of extraSeats) {
          const { estado, reserved } = toEstado(it.seat);
          rowArray.push({
            holdUntil: it.seat.holdUntil || null,
            reserved,
            paid: false,
            authCode: null,
            _id: String(it.seat._id),
            floor: floorLabel,
            asiento: it.seat.code,
            estado,
            valorAsiento: 0
          });
        }

        return rowArray;
      });

      return matrix;
    };

    const seatsTransformed = {
      firstFloor: buildFloorMatrix(floors[1], 'floor1'),
      secondFloor: buildFloorMatrix(floors[2], 'floor2')
    };

    return res.json({
      _id: String(service._id),
      routeMaster: service.routeMaster,
      date: service.date,
      direction: service.direction,
      origin: service.origin,
      destination: service.destination,
      departures: service.departures || [],
      seats: seatsTransformed
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al obtener el servicio', error: err.message });
  }
};