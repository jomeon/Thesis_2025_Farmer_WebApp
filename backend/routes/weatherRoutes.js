const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/', weatherController.getWeatherData);
router.post('/', weatherController.addWeatherData);

module.exports = router;
