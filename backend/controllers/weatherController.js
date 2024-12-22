const WeatherData = require('../models/Weather');
const axios = require('axios');


const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OPENWEATHERMAP_BASE_URL = process.env.OPENWEATHERMAP_BASE_URL;


// GET /api/weather?fieldId=&date= – pobierz dane pogodowe dla pola i daty
exports.getWeatherData = async (req, res) => {
  const { fieldId, date } = req.query;

  try {
    const query = { field: fieldId };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const weatherData = await WeatherData.find(query);
    res.json(weatherData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/weather – dodaj dane pogodowe
exports.addWeatherData = async (req, res) => {
  const { fieldId, date, rainfall, tempMin, tempMax, tempAvg } = req.body;

  const weather = new WeatherData({
    field: fieldId,
    date,
    rainfall,
    tempMin,
    tempMax,
    tempAvg
  });

  try {
    const newWeather = await weather.save();
    res.status(201).json(newWeather);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.fetchAndSaveWeather = async (req, res) => {
  const { fieldId, latitude, longitude } = req.body;

  if (!fieldId || !latitude || !longitude) {
    return res.status(400).json({ message: 'fieldId, latitude i longitude są wymagane.' });
  }

  try {
    // Pobierz dane z OpenWeatherMap
    const response = await axios.get(OPENWEATHERMAP_BASE_URL, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHERMAP_API_KEY,
        units: 'metric'
      }
    });

    const data = response.data;

    // Przetwórz dane
    const rainfall = data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0;
    const tempMin = data.main.temp_min;
    const tempMax = data.main.temp_max;
    const tempAvg = data.main.temp;

    // Stwórz nowy wpis w bazie danych
    const weather = new WeatherData({
      field: fieldId,
      date: new Date(),
      rainfall,
      tempMin,
      tempMax,
      tempAvg
    });

    const newWeather = await weather.save();
    res.status(201).json(newWeather);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania danych pogodowych.' });
  }
};