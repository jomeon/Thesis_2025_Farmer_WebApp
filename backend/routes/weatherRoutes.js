const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/', weatherController.getWeatherData);
router.post('/', weatherController.addWeatherData);

router.post('/fetch', weatherController.fetchAndSaveWeather);

module.exports = router;
