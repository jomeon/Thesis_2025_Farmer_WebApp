const WeatherData = require('../models/Weather');
const axios = require('axios');

const Field = require('../models/Field');
const { fetchAndSaveWeatherHistory } = require('../services/weatherService');


const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OPENWEATHERMAP_BASE_URL = process.env.OPENWEATHERMAP_BASE_URL;


// GET /api/weather?fieldId=&date= – pobierz dane pogodowe dla pola i daty
exports.getWeatherData = async (req, res) => {
  try {
    const { fieldId, date } = req.query;
    if (!fieldId || !date) {
      return res.status(400).json({ message: 'fieldId i date są wymagane.' });
    }

    // Konwersja date => start, end
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const weatherDocs = await WeatherData.find({
      field: fieldId,
      date: { $gte: start, $lt: end },
    });
    res.json(weatherDocs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd serwera weather' });
  }
};


// POST /api/weather – dodaj dane pogodowe
exports.addWeatherData = async (req, res) => {
  const { fieldId, date, rainfall, tempMin, tempMax, tempAvg } = req.body;

  try {
    // 1. Parsujemy i zaokrąglamy datę do początku doby
    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0);

    // 2. Sprawdzamy, czy w bazie istnieje już rekord o tym samym fieldId i tej samej dacie (dzień)
    const existing = await WeatherData.findOne({
      field: fieldId,
      date: {
        $gte: parsedDate,
        $lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000), // +1 doba
      },
    });

    if (existing) {
      // Jeśli istnieje, możemy np. zwrócić komunikat lub zaktualizować istniejący rekord
      return res.status(200).json({
        message: 'Dane pogodowe dla tego pola i dnia już istnieją.',
      });
    }

    // 3. Jeżeli nie ma wpisu – zapisujemy nowy
    const weather = new WeatherData({
      field: fieldId,
      date: parsedDate, // Wpisujemy zaokrągloną datę
      rainfall,
      tempMin,
      tempMax,
      tempAvg,
    });

    const newWeather = await weather.save();
    return res.status(201).json(newWeather);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


exports.fetchAndSaveWeather = async (req, res) => {
  const { fieldId, latitude, longitude } = req.body;

  if (!fieldId || !latitude || !longitude) {
    return res.status(400).json({ message: 'fieldId, latitude i longitude są wymagane.' });
  }

  try {
    // Zaokrąglamy datę do początku doby
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sprawdzamy, czy dla fieldId i tej daty mamy już dokument w bazie
    const existingWeather = await WeatherData.findOne({
      field: fieldId,
      date: {
        $gte: today, 
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
      },
    });

    if (existingWeather) {
      // Jeśli już istnieje, nie pobieraj ponownie:
      return res.status(200).json({
        message: 'Dane pogodowe na dzisiejszy dzień już istnieją w bazie.',
        weather: existingWeather,
      });
    }

    // Jeśli nie istnieje -> pobierz dane z OpenWeatherMap
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

    // Stwórz nowy wpis w bazie danych (z zaokrągloną datą)
    const newWeather = new WeatherData({
      field: fieldId,
      date: today, // <--- zaokrąglona data
      rainfall,
      tempMin,
      tempMax,
      tempAvg
    });

    await newWeather.save();
    return res.status(201).json(newWeather);

  } catch (error) {
    console.error('Error fetching weather data:', error);
    return res.status(500).json({ message: 'Błąd podczas pobierania danych pogodowych.' });
  }
};

exports.fetchAndSaveHistoryForField = async (req, res) => {
  const { fieldId, daysBack } = req.body;

  if (!fieldId) {
    return res.status(400).json({ message: 'Brak parametru fieldId.' });
  }

  try {
    // Pobierz pole z bazy, żeby mieć lat/lon
    const field = await Field.findById(fieldId);
    if (!field) {
      return res.status(404).json({ message: 'Pole o podanym ID nie istnieje.' });
    }

    const { latitude, longitude } = field.location; // załóżmy, że tak jest zapisane

    await fetchAndSaveWeatherHistory(fieldId, latitude, longitude, daysBack || 5);

    res.json({ message: 'Pomyślnie pobrano i zapisano dane pogodowe.' });
  } catch (error) {
    console.error('Błąd w fetchAndSaveHistoryForField:', error.message);
    res.status(500).json({ message: 'Wystąpił błąd podczas zapisu danych pogodowych.' });
  }
};

exports.getWeatherHistory = async (req, res) => {
  try {
    const { fieldId } = req.query;
    if (!fieldId) {
      return res.status(400).json({ message: 'Brak parametru fieldId.' });
    }

    // Pobieramy wszystkie rekordy z WeatherData dla danego fieldId (bez filtra date)
    const weatherDocs = await WeatherData.find({ field: fieldId }).sort({ date: 1 });

    res.json(weatherDocs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd serwera weather (history)' });
  }
}; 