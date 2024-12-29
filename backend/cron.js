const cron = require('node-cron');
const Field = require('./models/Field');
const WeatherData = require('./models/Weather');
const fetchWeatherData = require('./services/weatherService');
const { fetchAndSaveWeatherHistory } = require('./services/weatherService');


const scheduleWeatherDataFetch = () => {
  cron.schedule('0 0 * * *', async () => { // Codziennie o północy
    console.log('Rozpoczynanie pobierania danych pogodowych...');
    try {
      const fields = await Field.find();

      for (const field of fields) {
        const weather = await fetchWeatherData(field.location.latitude, field.location.longitude, new Date());

        if (weather) {
          const weatherEntry = new WeatherData({
            field: field._id,
            date: new Date(),
            rainfall: weather.rainfall,
            tempMin: weather.tempMin,
            tempMax: weather.tempMax,
            tempAvg: weather.tempAvg
          });

          await weatherEntry.save();
          console.log(`Dane pogodowe zapisane dla pola: ${field.name}`);
        }
      }

      console.log('Pobieranie danych pogodowych zakończone.');
    } catch (error) {
      console.error(`Błąd w zadaniu cron: ${error.message}`);
    }
  });
};

function scheduleWeatherHistoryFetch() {
  // Raz dziennie o 02:00 w nocy (przykład)
  cron.schedule('0 2 * * *', async () => {
    console.log('CRON: Start pobierania historycznych danych pogodowych...');
    try {
      // Pobierz wszystkie pola
      const fields = await Field.find({});

      for (const field of fields) {
        const { latitude, longitude } = field.location;
        // Możesz np. zawsze pobierać 1 dzień wstecz (żeby mieć wczorajsze dane)
        await fetchAndSaveWeatherHistory(field._id, latitude, longitude, 1);
      }

      console.log('CRON: Zakończono pobieranie danych pogodowych.');
    } catch (err) {
      console.error('CRON: Błąd podczas pobierania danych pogodowych:', err.message);
    }
  });
}

module.exports = scheduleWeatherHistoryFetch;

module.exports = scheduleWeatherDataFetch;
