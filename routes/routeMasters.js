const express = require('express');
const router = express.Router();
const routeMasterController = require('../controllers/routeMasterController');

// Crear ruta maestra
router.post('/', routeMasterController.createRouteMaster);

// Listar rutas maestras
router.get('/', routeMasterController.getRouteMasters);
// Obtener por ID
router.get('/:id', routeMasterController.getRouteMasterById);

// Actualizar
router.put('/:id', routeMasterController.updateRouteMaster);

// Eliminar
router.delete('/:id', routeMasterController.deleteRouteMaster);

module.exports = router;
