const Service = require('../models/Service');
const Seat = require('../models/Seat');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(isoWeek);



// Genera servicios a partir de una ruta maestra
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

    // Usar la dirección que ya está en la ruta maestra
    const service = await createServiceInstance(route, currentDate, route.direction);
    createdServices.push(service);
  }

  return createdServices;
}


async function createServiceInstance(route, date, direction) {
  // hora base de salida
  const baseDeparture = dayjs(date)
    .hour(route.departureHour || 8)
    .minute(route.departureMinute || 0)
    .second(0)
    .millisecond(0);

  // paradas (se puede invertir si lo deseas según direction)
  const stops = route.stops; 

  let departureTimes = [];

  for (let stop of stops) {
    const stopTime = baseDeparture.add(stop.offsetMinutes || 0, 'minute');
    departureTimes.push({
      order: stop.order,
      stop: stop.name,
      time: stopTime.toDate(),
    });
  }

  const service = new Service({
    routeMaster: route._id,
    date: date.toDate(),
    direction,
    origin: route.origin,         // SIEMPRE lo de la ruta maestra
    destination: route.destination,
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
