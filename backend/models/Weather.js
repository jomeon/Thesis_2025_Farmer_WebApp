const mongoose = require('mongoose');

const WeatherDataSchema = new mongoose.Schema({
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field' },
    date: Date,
    rainfall: Number, // opady w mm
    tempMin: Number,
    tempMax: Number,
    tempAvg: Number
  });
  
const WeatherData = mongoose.model('WeatherData', WeatherDataSchema);

module.exports = WeatherData;