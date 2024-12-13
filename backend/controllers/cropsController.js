const Crop = require('../models/Crop');
const Field = require('../models/Field');

// GET /api/crops – pobierz wszystkie uprawy
exports.getAllCrops = async (req, res) => {
  try {
    const crops = await Crop.find().populate('field');
    res.json(crops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/crops – dodaj nową uprawę
exports.createCrop = async (req, res) => {
  const { fieldId, name, size, startDate, endDate, costPerHa, returnPerHa, description } = req.body;
  
  try {
    const field = await Field.findById(fieldId);
    if (!field) return res.status(404).json({ message: 'Pole nie znalezione' });
    
    const percentage = (size / field.area) * 100;
    const profit = returnPerHa * size;
    const loss = costPerHa * size;

    const crop = new Crop({
      field: fieldId,
      name,
      size,
      percentage,
      startDate,
      endDate,
      costPerHa,
      returnPerHa,
      profit,
      loss,
      description
    });

    const newCrop = await crop.save();
    field.crops.push(newCrop._id);
    await field.save();

    res.status(201).json(newCrop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/crops/:id – aktualizuj uprawę
exports.updateCrop = async (req, res) => {
    try {
      const crop = await Crop.findById(req.params.id).populate('field');
      if (!crop) return res.status(404).json({ message: 'Uprawa nieznaleziona' });
  
      // Aktualizacja pól
      Object.assign(crop, req.body);
  
      if (req.body.size || req.body.costPerHa || req.body.returnPerHa) {
        crop.percentage = (crop.size / crop.field.area) * 100;
        crop.profit = crop.returnPerHa * crop.size;
        crop.loss = crop.costPerHa * crop.size;
      }
  
      const updatedCrop = await crop.save();
      res.json(updatedCrop);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

// DELETE /api/crops/:id – usuń uprawę
exports.deleteCrop = async (req, res) => {
  try {
    const crop = await Crop.findByIdAndDelete(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Uprawa nieznaleziona' });

    // Usuń referencję z pola
    const field = await Field.findById(crop.field);
    field.crops.pull(crop._id);
    await field.save();

    res.json({ message: 'Uprawa usunięta' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
