const Field = require('../models/Field');
const WeatherData = require('../models/Weather');

// GET /api/fields – pobierz wszystkie pola
exports.getAllFields = async (req, res) => {
  try {
    const fields = await Field.find().populate('crops');
    
    // Dodanie sumy temperatur efektywnych dla każdego pola
    const fieldsWithTempSum = await Promise.all(fields.map(async (field) => {
      const weatherData = await WeatherData.find({ field: field._id });
      const effectiveTemperatureSum = weatherData.reduce((sum, day) => sum + day.tempAvg, 0);
      return {
        ...field.toObject(),
        effectiveTemperatureSum
      };
    }));

    res.json(fieldsWithTempSum);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/fields – dodaj nowe pole
exports.createField = async (req, res) => {
  const { name, area, location } = req.body;
  const field = new Field({ name, area, location });

  try {
    const newField = await field.save();
    res.status(201).json(newField);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/fields/:id – aktualizuj pole
exports.updateField = async (req, res) => {
  try {
    const field = await Field.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!field) return res.status(404).json({ message: 'Pole nie znalezione' });
    res.json(field);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/fields/:id – usuń pole
exports.deleteField = async (req, res) => {
  try {
    const field = await Field.findByIdAndDelete(req.params.id);
    if (!field) return res.status(404).json({ message: 'Pole nie znalezione' });
    res.json({ message: 'Pole usunięte' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
