const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dayjs = require('dayjs');

dotenv.config();

const BusLayout = require('./models/BusLayout');
const RouteMaster = require('./models/RouteMaster');
const { generateServicesForRoute } = require('./utils/serviceGenerator');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/transporte';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Conectado a MongoDB');

    // Limpiar colecciones
    await Promise.all([
      BusLayout.deleteMany({}),
      RouteMaster.deleteMany({})
    ]);

    // Crear layout de ejemplo
    const layout = await BusLayout.create({
      name: 'Layout Test',
      rows: 4,
      columns: 5,
      pisos: 2,
      capacidad: 48,
      tipo_Asiento_piso_1: 'Salón-Cama',
      tipo_Asiento_piso_2: 'Semi-Cama',
      floor1: {
        seatMap: [
          ["1A", "1B", "", "1C", "1D"],
          ["2A", "2B", "", "2C", "2D"]
        ]
      },
      floor2: {
        seatMap: [
          ["6A", "6B", "", "6C", "6D"],
          ["7A", "7B", "", "7C", "7D"]
        ]
      }
    });

    console.log('🚌 Layout creado:', layout.name);

    // Crear ruta maestra de ejemplo
    const routeMaster = await RouteMaster.create({
      name: 'Ovalle - Minera Centinela',
      origin: 'Ovalle',
      destination: 'Minera Centinela',
      stops: [
        { name: 'Ovalle', offsetMinutes: 0 },
        { name: 'Monte Patria', offsetMinutes: 30 },
        { name: 'Los Vilos', offsetMinutes: 60 },
        { name: 'Minera Centinela', offsetMinutes: 120 }
      ],
      layout: layout._id
    });

    console.log('🛣️ Ruta maestra creada:', routeMaster.name);

    // Generar servicios de prueba (lunes a viernes)
    const startDate = dayjs().startOf('day').toDate();
    const daysOfWeek = [1, 2, 3, 4, 5]; // lunes a viernes

    const services = await generateServicesForRoute(routeMaster, startDate, daysOfWeek);

    console.log(`✅ ${services.length} servicios generados para los próximos 14 días`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

seed();
