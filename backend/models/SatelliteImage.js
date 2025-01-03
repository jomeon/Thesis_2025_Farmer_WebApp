// models/SatelliteImage.js

const mongoose = require('mongoose');

const SatelliteImageSchema = new mongoose.Schema({
    fieldId: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    imageBase64Default: { // <-- Dodajemy osobno dla RGB
        type: String,
        required: false
    },
    imageBase64Ndvi: { // <-- Osobno dla NDVI
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Zapewnienie unikalności kombinacji fieldId i date
SatelliteImageSchema.index({ fieldId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SatelliteImage', SatelliteImageSchema);
