// const axios = require('axios');

// const fetchWeatherData = async (lat, lon, date) => {
//   const apiKey = process.env.OPENWEATHERMAP_API_KEY; // Dodaj swój klucz API do pliku .env
//   const timestamp = Math.floor(new Date(date).getTime() / 1000);
//   const url = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${apiKey}&units=metric`;

//   try {
//     const response = await axios.get(url);
//     const data = response.data;

//     return {
//       rainfall: data.current.rain ? data.current.rain['1h'] : 0,
//       tempMin: data.daily[0].temp.min,
//       tempMax: data.daily[0].temp.max,
//       tempAvg: (data.daily[0].temp.min + data.daily[0].temp.max) / 2
//     };
//   } catch (error) {
//     console.error(`Błąd pobierania danych pogodowych: ${error.message}`);
//     return null;
//   }
// };

// module.exports = fetchWeatherData;


// backend/services/weatherService.js

const axios = require('axios');
const WeatherData = require('../models/Weather');  // Twój model
require('dotenv').config(); // Jeżeli potrzebujesz do wczytania .env w tym pliku

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const ONECALL_TIMEMACHINE_URL = 'https://api.openweathermap.org/data/2.5/onecall/timemachine';

/**
 * Pobiera dane pogodowe z One Call Timemachine
 * i zwraca obiekt z polami: { rainfall, tempMin, tempMax, tempAvg }.
 * @param {Number} lat - szerokość geograficzna
 * @param {Number} lon - długość geograficzna
 * @param {Date} date - data (max. do 5 dni wstecz)
 * @returns {Promise<{rainfall:number, tempMin:number, tempMax:number, tempAvg:number} | null>}
 */
async function fetchDailyWeather(lat, lon, date) {
  try {
    const timestamp = Math.floor(date.getTime() / 1000);

    const response = await axios.get(ONECALL_TIMEMACHINE_URL, {
      params: {
        lat,
        lon,
        dt: timestamp,
        appid: OPENWEATHERMAP_API_KEY,
        units: 'metric',
      },
    });

    const data = response.data;
    if (!data.hourly || !Array.isArray(data.hourly) || data.hourly.length === 0) {
      console.warn('Brak danych hourly w odpowiedzi API.');
      return null;
    }

    // Obliczamy min, max, średnią temperaturę:
    const temps = data.hourly.map(h => h.temp);
    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const tempAvg = temps.reduce((acc, val) => acc + val, 0) / temps.length;

    // Sumujemy opady z każdej godziny (o ile występują)
    let totalRainfall = 0;
    data.hourly.forEach(h => {
      if (h.rain && h.rain['1h']) {
        totalRainfall += h.rain['1h'];
      }
    });

    return {
      rainfall: totalRainfall,
      tempMin,
      tempMax,
      tempAvg
    };
  } catch (error) {
    console.error(`Błąd pobierania danych pogodowych: ${error.message}`);
    return null;
  }
}

/**
 * Pobiera dane historyczne (np. do 5 dni wstecz) dla wybranego pola
 * i zapisuje każdy dzień jako osobny dokument w kolekcji Weather.
 * @param {ObjectId} fieldId - ID pola w MongoDB
 * @param {Number} lat - szerokość geograficzna pola
 * @param {Number} lon - długość geograficzna pola
 * @param {Number} daysBack - ile dni wstecz chcesz pobierać (max 5)
 */
async function fetchAndSaveWeatherHistory(fieldId, lat, lon, daysBack = 5) {
  // Upewnij się, żeby nie przekroczyć limitu 5 dni
  const maxDays = Math.min(daysBack, 5);

  for (let i = 0; i < maxDays; i++) {
    // Ustaw datę i dni wstecz
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Sprawdzamy, czy w bazie nie mamy już wpisu z taką datą (opcjonalne)
    const existing = await WeatherData.findOne({
      field: fieldId,
      date: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });

    if (existing) {
      console.log(`Dane pogodowe dla pola ${fieldId} i daty ${date.toDateString()} już istnieją. Pomijam.`);
      continue;
    }

    // Pobierz dane z API
    const weather = await fetchDailyWeather(lat, lon, date);
    if (!weather) {
      console.log(`Brak danych pogodowych dla daty ${date.toDateString()}`);
      continue;
    }

    // Zapisz w bazie
    const weatherEntry = new WeatherData({
      field: fieldId,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), // tylko część dzienna
      rainfall: weather.rainfall,
      tempMin: weather.tempMin,
      tempMax: weather.tempMax,
      tempAvg: weather.tempAvg,
    });

    await weatherEntry.save();
    console.log(`Zapisano dane pogodowe dla pola ${fieldId}, data: ${date.toDateString()}`);
  }
}

module.exports = {
  fetchDailyWeather,
  fetchAndSaveWeatherHistory,
};
