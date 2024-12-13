const WeatherData = require('../models/Weather');

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
