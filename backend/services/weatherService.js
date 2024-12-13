const axios = require('axios');

const fetchWeatherData = async (lat, lon, date) => {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY; // Dodaj swój klucz API do pliku .env
  const timestamp = Math.floor(new Date(date).getTime() / 1000);
  const url = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${apiKey}&units=metric`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    return {
      rainfall: data.current.rain ? data.current.rain['1h'] : 0,
      tempMin: data.daily[0].temp.min,
      tempMax: data.daily[0].temp.max,
      tempAvg: (data.daily[0].temp.min + data.daily[0].temp.max) / 2
    };
  } catch (error) {
    console.error(`Błąd pobierania danych pogodowych: ${error.message}`);
    return null;
  }
};

module.exports = fetchWeatherData;
