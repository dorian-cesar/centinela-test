const Service = require('../models/Service');
const Seat = require('../models/Seat');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

const TZ = 'America/Santiago';
const HORIZON_DAYS = 14;



// Genera servicios a partir de una ruta maestra
async function generateServicesForRoute(route, startDate, daysOfWeek) {
 // const start = dayjs.tz(startDate, TZ).startOf('day');

  // Paso 1: Interpretar fecha en la zona horaria Chile
const localStart = dayjs.tz(startDate, TZ).startOf('day');

// Paso 2: Convertir a UTC
const start = localStart.utc();
 
  const createdServices = [];

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const currentDate = start.add(i, 'day');
    const dayOfWeek = currentDate.isoWeekday();

    if (!daysOfWeek.includes(dayOfWeek)) continue;

    const service = await createServiceInstance(route, currentDate, route.direction);
    createdServices.push(service);
  }

  return createdServices;
}

async function createServiceInstance(route, date, direction) {
  // hora base de salida en Santiago
  const [hour, minute] = route.baseDepartureTime.split(':').map(Number);
const baseDeparture = dayjs(date)
  .hour(hour)
  .minute(minute)
  .second(0)
  .millisecond(0);

  // paradas (se puede invertir si quieres, pero origin/destination siempre fijos)
  const stops = route.stops;

  let departureTimes = [];

  for (let stop of stops) {
    // sumar offset acumulado
    const stopTime = baseDeparture.add(stop.offsetMinutes || 0, 'minute');

    departureTimes.push({
      order: stop.order,
      stop: stop.name,
      time: stopTime.toDate(), // Mongo guarda en UTC
      price: stop.price // <-- Agregar el precio aquí
    });
  }

  const service = new Service({
    routeMaster: route._id,
    date: baseDeparture.toDate(), // fecha de inicio del servicio
    direction,
    origin: route.origin,
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
