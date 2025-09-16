const Service = require('../models/Service');
const Seat = require('../models/Seat');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(isoWeek);

// horizon fijo de 14 días
const HORIZON_DAYS = 14;

// Genera servicios a partir de una ruta maestra
async function generateServicesForRoute(route, startDate, daysOfWeek) {
  const start = dayjs(startDate).startOf('day');
  const createdServices = [];

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const currentDate = start.add(i, 'day');

    // día de la semana (1=lunes ... 7=domingo)
    const dayOfWeek = currentDate.isoWeekday();

    if (!daysOfWeek.includes(dayOfWeek)) continue;

    // Subida: origen -> minera
    const subidaService = await createServiceInstance(route, currentDate, 'subida');
    createdServices.push(subidaService);

    // Bajada: minera -> origen
    const bajadaService = await createServiceInstance(route, currentDate, 'bajada');
    createdServices.push(bajadaService);
  }

  return createdServices;
}

async function createServiceInstance(route, date, direction) {
  // fecha y hora de salida según ruta y dirección
  const baseDeparture = dayjs(date)
    .hour(route.departureHour || 8) // hora base configurable
    .minute(route.departureMinute || 0)
    .second(0)
    .millisecond(0);

  // Aplicar offset según paradas
  const stops = direction === 'subida' ? route.stops : [...route.stops].reverse();
  let departureTimes = [];
  let offset = 0;

  for (let stop of stops) {
    const stopTime = baseDeparture.add(offset, 'minute');

    departureTimes.push({
      stop: stop.name,
      time: stopTime.toDate(),
    });

    offset += stop.offsetMinutes || 0; // sumar minutos para la siguiente parada
  }

  const service = new Service({
    routeMaster: route._id,
    date: date.toDate(),
    direction,
    origin: direction === 'subida' ? route.origin : route.destination,
    destination: direction === 'subida' ? route.destination : route.origin,
    layout: route.layout,
    departures: departureTimes,
  });

  await service.save();

  // generar asientos desde layout
  const seats = [];
  const layout = route.layout;

  if (layout.floor1 && layout.floor1.seatMap) {
    layout.floor1.seatMap.forEach(row => {
      row.forEach(code => {
        if (code) {
          seats.push({
            service: service._id,
            code,
            floor: 1,
            type: layout.tipo_Asiento_piso_1,
          });
        }
      });
    });
  }

  if (layout.floor2 && layout.floor2.seatMap) {
    layout.floor2.seatMap.forEach(row => {
      row.forEach(code => {
        if (code) {
          seats.push({
            service: service._id,
            code,
            floor: 2,
            type: layout.tipo_Asiento_piso_2,
          });
        }
      });
    });
  }

  const createdSeats = await Seat.insertMany(seats);
  service.seats = createdSeats.map(s => s._id);
  await service.save();

  return service;
}

module.exports = { generateServicesForRoute };
