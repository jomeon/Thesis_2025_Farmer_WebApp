const Field = require('../models/Field');
const Crop = require('../models/Crop');
const WeatherData = require('../models/Weather');
const turf = require('@turf/turf'); 



const axios = require('axios');
require('dotenv').config(); // Jeśli potrzebne

// 1. Funkcja do zewn. API
async function fetchWeatherFromExternalAPI(lat, lon) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const baseUrl = process.env.OPENWEATHERMAP_BASE_URL; // np. https://api.openweathermap.org/data/2.5/weather

  const response = await axios.get(baseUrl, {
    params: {
      lat,
      lon,
      appid: apiKey,
      units: 'metric'
    }
  });
  const data = response.data;
  const rainfall = data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0;
  const tempMin = data.main.temp_min;
  const tempMax = data.main.temp_max;
  const tempAvg = data.main.temp;
  return { rainfall, tempMin, tempMax, tempAvg };
}

// 2. Funkcja checkAndSaveWeatherForToday:
async function checkAndSaveWeatherForToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Weź wszystkie pola
  const fields = await Field.find({});
  
  for (const field of fields) {
    const existingWeather = await WeatherData.findOne({
      field: field._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      }
    });

    if (!existingWeather) {
      console.log(`Brak pogody na dziś dla pola: ${field.name}. Pobieram z API...`);
      const lat = field.location.latitude;
      const lon = field.location.longitude;
      try {
        const { rainfall, tempMin, tempMax, tempAvg } = await fetchWeatherFromExternalAPI(lat, lon);
        await WeatherData.create({
          field: field._id,
          date: today,
          rainfall,
          tempMin,
          tempMax,
          tempAvg
        });
        console.log(`Zapisano dane pogodowe dla ${field.name}.`);
      } catch (err) {
        console.error(`Błąd pobierania pogody dla pola ${field.name}:`, err.message);
      }
    } else {
      console.log(`Dane na dziś dla pola ${field.name} już istnieją.`);
    }
  }
}


exports.updateFieldProfitLoss = async (fieldId) => {
  try {
    const field = await Field.findById(fieldId).populate('crops');
    if (!field) {
      console.error(`Field ID: ${fieldId} not found.`);
      return;
    }

    const totalProfit = field.crops.reduce((acc, crop) => acc + (crop.profit || 0), 0);
    const totalLoss = field.crops.reduce((acc, crop) => acc + (crop.loss || 0), 0);

    field.totalProfit = totalProfit;
    field.totalLoss = totalLoss;

    await field.save();

    console.log(`Field ID: ${fieldId} updated with totalProfit: ${totalProfit}, totalLoss: ${totalLoss}`);
  } catch (error) {
    console.error(`Error updating Field ID: ${fieldId} -`, error);
  }
};

// GET /api/fields – pobierz wszystkie pola
exports.getAllFields = async (req, res) => {
  try {
    const fields = await Field.find().populate('crops');

    await checkAndSaveWeatherForToday();

    // Dodanie sumy temperatur efektywnych dla każdego pola
    const fieldsWithTempSumAndProfit = await Promise.all(fields.map(async (field) => {
      // Konwertuj do zwykłego obiektu (bez metod Mongoose)
      const fieldObj = field.toObject();

      // Suma temperamenty (jeśli używasz)
      const weatherData = await WeatherData.find({ field: field._id });
      const effectiveTemperatureSum = weatherData.reduce((sum, day) => sum + day.tempAvg, 0);
      fieldObj.effectiveTemperatureSum = effectiveTemperatureSum;

      // (A) Obliczamy totalProfit, totalLoss
      let totalProfit = 0;
      let totalLoss = 0;
      
      // Upewnij się, że 'field.crops' jest tablicą
      if (field.crops && Array.isArray(field.crops)) {
      
        field.crops.forEach((crop) => {
          totalProfit += (crop.profit || 0);
          totalLoss += (crop.loss || 0);
        
        });
      }

      // (B) Dopisz do fieldObj
   
      fieldObj.totalProfit = totalProfit;
      fieldObj.totalLoss = totalLoss;
     
      return fieldObj;
    }));

    // 4. Zwróć te obiekty w JSON
    res.json(fieldsWithTempSumAndProfit);
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

    const totalPercentage = crops.reduce((acc, c) => acc + (c.percentage || 0), 0);
    if (totalPercentage > 100) {
      return res.status(400).json({ message: 'Łączny udział % przekracza 100%!' });
    }

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

      const realSize = (crop.percentage / 100) * calculatedArea;
      const finalProfit = (crop.returnPerHa - crop.costPerHa) * realSize;
 
      const newCrop = new Crop({
        field: savedField._id,
        name: crop.name,
        percentage: crop.percentage,
        costPerHa: crop.costPerHa,
        returnPerHa: crop.returnPerHa,
        size: realSize,
        profit: finalProfit,
        loss: finalProfit < 0 ? Math.abs(finalProfit) : 0| 0,
        description: crop.description || '',
        effectiveTemperatureSum: crop.effectiveTemperatureSum || 0,
        // Dodaj inne pola, jeśli są potrzebne
      });
      const savedCrop = await newCrop.save();
      return savedCrop._id;
    }));

    savedField.crops = cropDocs;
    await savedField.save();

    await exports.updateFieldProfitLoss(savedField._id);

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

    await exports.updateFieldProfitLoss(savedField._id);

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

exports.getFieldById = async (req, res) => {
  try {
    const field = await Field.findById(req.params.id).populate('crops');
    if (!field) {
      return res.status(404).json({ message: 'Pole nie znalezione.' });
    }
    

    // Możesz tu także wyliczyć sumę temperatur efektywnych, jeśli potrzebujesz
    const weatherData = await WeatherData.find({ field: field._id });
    const effectiveTemperatureSum = weatherData.reduce((sum, day) => sum + day.tempAvg, 0);

    // Zwróć obiekt z polami plus sumą
    const fieldWithTempSum = {
      ...field.toObject(),
      effectiveTemperatureSum
    };

    res.json(fieldWithTempSum);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFieldsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Parametr "date" jest wymagany.' });
    }

    // (B) Zamieniamy date=YYYY-MM-DD na obiekt Date z zakresem doby
    const start = new Date(date); // np. "2024-12-25"
    if (isNaN(start.getTime())) {
      return res.status(400).json({ message: `Niepoprawny format daty: ${date}` });
    }
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // (C) Szukamy WeatherData w tym zakresie
    const weathers = await WeatherData.find({
      date: { $gte: start, $lt: end },
    });

    // Z wyciągniętych weathers bierzemy unikalne ID pól
    const fieldIds = weathers.map(w => w.field.toString()); // tablica stringów
    const uniqueFieldIds = [...new Set(fieldIds)];

    // (D) Pobieramy pola, które są w fieldIds
    const fields = await Field.find({ _id: { $in: uniqueFieldIds } })
      .populate('crops'); 
    // ^^^ tu .populate('crops') => w CropSchema MUSI być "field: { type: ObjectId, ref: 'Field' }"
    // i w Crop faktycznie muszą być np. profit, loss.

    // (E) Mergujemy (scalaMy) WeatherData w obiekty Field
    // Dla każdego pola znajdujemy w 'weathers' dokument, który ma field = pole._id
    // i dołączamy go jako field.weatherData
    const fieldsWithWeather = fields.map(field => {
      const weatherDoc = weathers.find(w => w.field.toString() === field._id.toString());
      // UWAGA: Jeżeli w danym dniu istnieje TYLKO JEDEN WeatherData na pole, to starczy .find().
      // Jeśli jest wiele, trzeba by rozważyć .filter() i np. brać pierwszy lub listę.

      // Dodajemy weatherData do obiektu
      return {
        ...field.toObject(),
        weatherData: weatherDoc ? weatherDoc.toObject() : null,
      };
    });

    // (F) Zwracamy scalone obiekty
    res.json(fieldsWithWeather);
  } catch (error) {
    console.error('Błąd w getFieldsByDate:', error);
    res.status(500).json({ message: 'Wystąpił błąd.' });
  }
};



