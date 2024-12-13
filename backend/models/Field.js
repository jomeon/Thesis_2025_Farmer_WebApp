const mongoose = require('mongoose');


const FieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: { type: Number, required: true }, // powierzchnia w ha
  crops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crop' }],
  location: {
    latitude: Number,
    longitude: Number
  }
});

const Field = mongoose.model('Field', FieldSchema);
module.exports = Field;