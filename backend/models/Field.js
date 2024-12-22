const mongoose = require('mongoose');


const PolygonFeatureSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Nazwa polygonu
  geojson: {
      type: {
          type: String,
          enum: ['Polygon'],
          required: true
      },
      coordinates: {
          type: [[[Number]]], // Array of arrays of coordinate pairs
          required: true
      }
  }
}, { _id: false });

const FieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
  },
  polygons: {
      type: [PolygonFeatureSchema],
      default: []
  },
  area: { type: Number, required: true }, // Rozmiar w hektarach
  crops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crop' }],
  effectiveTemperatureSum: { type: Number, default: 0 }
}, {
  timestamps: true
});




const Field = mongoose.model('Field', FieldSchema);
module.exports = Field;