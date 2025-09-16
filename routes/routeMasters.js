const express = require('express');
const router = express.Router();
const routeMasterController = require('../controllers/routeMasterController');

// Crear ruta maestra
router.post('/', routeMasterController.createRouteMaster);

// Listar rutas maestras
router.get('/', routeMasterController.getRouteMasters);

module.exports = router;
