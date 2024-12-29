const mongoose = require('mongoose');

const CropSchema = new mongoose.Schema({
    field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field' },
    name: { type: String, required: true },
    size: { type: Number, required: true }, // rozmiar w ha
    percentage: { type: Number, default: 0 },  // % powierzchni
    startDate: Date,
    endDate: Date,
    costPerHa: { type: Number, default: 0 },
    returnPerHa: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    loss: { type: Number, default: 0 },
    description: String,
    effectiveTemperatureSum: { type: Number, default: 0 },
  });
  

const Crop = mongoose.model('Crop', CropSchema);
module.exports = Crop;