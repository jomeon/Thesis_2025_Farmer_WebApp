const Field = require('../models/Field');
const Crop = require('../models/Crop');
const WeatherData = require('../models/Weather');
const turf = require('@turf/turf'); 

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
  const { name, polygons, crops } = req.body;

  // Walidacja danych GeoJSON
  if (!polygons || polygons.type !== 'FeatureCollection') {
    return res.status(400).json({ message: 'Polygons must be a FeatureCollection' });
  }

  polygons.features.forEach(feature => {
    if (feature.type !== 'Feature' || feature.geometry.type !== 'Polygon') {
      return res.status(400).json({ message: 'Each feature must be a Polygon' });
    }
  });

  try {
    // Obliczanie powierzchni polygonów
    const calculatedArea = polygons.features.reduce((sum, feature) => {
      return sum + turf.area(feature) / 10000; // Konwersja na hektary
    }, 0);

      // Mapowanie features na format wymagany przez model
    const mappedPolygons = polygons.features.map(feature => ({
      name: feature.properties.name || 'Unnamed Polygon',
      geojson: feature.geometry
    }));

    // Obliczanie centroid poligonu
    const centroid = turf.centroid(polygons.features[0]); // Możesz dostosować, jeśli masz wiele poligonów
    const [longitude, latitude] = centroid.geometry.coordinates;

        
    const field = new Field({
      name,
      area: calculatedArea,
      location: { latitude, longitude },
      polygons: mappedPolygons,
      crops: [] 
    });

    const savedField = await field.save();

    const cropDocs = await Promise.all(crops.map(async (crop) => {
      const newCrop = new Crop({
        field: savedField._id,
        name: crop.name,
        size: crop.size || 0, // Przypisanie domyślnej wartości, jeśli nie podano
        percentage: crop.percentage || 0,
        costPerHa: crop.cost || 0,
        returnPerHa: crop.profit || 0,
        profit: crop.profit || 0,
        loss: crop.loss || 0,
        description: crop.description || '',
        effectiveTemperatureSum: crop.effectiveTemperatureSum || 0,
        // Dodaj inne pola, jeśli są potrzebne
      });
      const savedCrop = await newCrop.save();
      return savedCrop._id;
    }));

    savedField.crops = cropDocs;
    await savedField.save();
    res.status(201).json(savedField);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/fields/:id – aktualizuj pole
exports.updateField = async (req, res) => {
  try {
    const { name, polygons, crops, area } = req.body;

    // Opcjonalnie, oblicz powierzchnię ponownie, jeśli polygons zostały zmienione
    let updatedData = { name, crops };
    if (polygons) {
      // Walidacja danych GeoJSON
      if (polygons.type !== 'FeatureCollection') {
        return res.status(400).json({ message: 'Polygons must be a FeatureCollection' });
      }

      polygons.features.forEach(feature => {
        if (feature.type !== 'Feature' || feature.geometry.type !== 'Polygon') {
          throw new Error('Each feature must be a Polygon');
        }
      });

      // Obliczanie powierzchni
      const calculatedArea = polygons.features.reduce((sum, feature) => {
        return sum + turf.area(feature) / 10000; // Konwersja na hektary
      }, 0);

      updatedData.polygons = polygons;
      updatedData.area = calculatedArea;
    }

    const field = await Field.findByIdAndUpdate(req.params.id, updatedData, { new: true }).populate('crops');
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
