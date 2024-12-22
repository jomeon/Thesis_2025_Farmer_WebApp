const express = require('express');
const router = express.Router();
const satelliteController = require('../controllers/satelliteController');

// Trasa do pobierania obrazów satelitarnych
router.get('/', satelliteController.getSatelliteImages);

module.exports = router;