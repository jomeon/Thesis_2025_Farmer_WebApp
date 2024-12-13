const mongoose = require('mongoose');

const CropSchema = new mongoose.Schema({
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field' },
    name: { type: String, required: true },
    size: { type: Number, required: true }, // rozmiar w ha
    percentage: { type: Number }, // % powierzchni
    startDate: Date,
    endDate: Date,
    costPerHa: Number,
    returnPerHa: Number,
    profit: Number,
    loss: Number,
    description: String,
    effectiveTemperatureSum: Number
  });
  