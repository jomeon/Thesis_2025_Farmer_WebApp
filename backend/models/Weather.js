const mongoose = require('mongoose');

const WeatherDataSchema = new mongoose.Schema({
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field',required: true },
    date: {
      type: Date,
      required: true,
    },
    rainfall: Number, // opady w mm
    tempMin: Number,
    tempMax: Number,
    tempAvg: Number
  });
  
const WeatherData = mongoose.model('WeatherData', WeatherDataSchema);

module.exports = WeatherData;