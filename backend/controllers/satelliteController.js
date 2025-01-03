// src/controllers/satelliteController.js

const NodeCache = require('node-cache');
const satelliteCache = new NodeCache({ stdTTL: 3600 }); // Cache na 1 godzinę
const qs = require('qs'); 

const axios = require('axios');
const Field = require('../models/Field'); // Model pola uprawnego


const SatelliteImage = require('../models/SatelliteImage'); 

const moment = require('moment'); // Do obsługi dat
const cron = require('node-cron');


const {
  SENTINELHUB_CLIENT_ID,
  SENTINELHUB_CLIENT_SECRET,
  SENTINELHUB_INSTANCE_ID,
  SENTINELHUB_BASE_URL,
} = process.env;

const getAccessToken = async () => {
  try {
    console.log('Requesting Sentinel Hub access token...');
    const response = await axios.post(
      `${SENTINELHUB_BASE_URL}/oauth/token`,
      qs.stringify({
        grant_type: 'client_credentials',
        client_id: SENTINELHUB_CLIENT_ID,
        client_secret: SENTINELHUB_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('Access token obtained successfully.');
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching Sentinel Hub access token:', error.response?.data || error.message);
    throw new Error('Authentication with Sentinel Hub failed.');
  }
};

// Funkcja do pobrania pojedynczego obrazu
const fetchImage = async (token, geometry, start, end, evalscript, identifier) => {
  try {
    const response = await axios.post(
      `${SENTINELHUB_BASE_URL}/api/v1/process`,
      {
        input: {
          bounds: {
            geometry: geometry,
          },
          data: [
            {
              type: 'S2L1C',
              dataFilter: {
                timeRange: {
                  from: start,
                  to: end,
                },
              },
              mosaickingOrder: 'leastCC',
            },
          ],
        },
        output: {
          width: 512,
          height: 512,
          responses: [
            {
              identifier: identifier, // 'default' lub 'ndvi'
              format: { type: 'image/png' },
            },
          ],
        },
        evalscript: evalscript,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'image/png',
        },
        responseType: 'arraybuffer',
      }
    );

    const base64 = Buffer.from(response.data).toString('base64');
    const contentType = response.headers['content-type'];
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    if (error.response) {
      const errorData = Buffer.from(error.response.data).toString('utf-8');
      console.error(`Error fetching ${identifier} image:`, error.response.status, errorData);
      throw new Error(`Error fetching ${identifier} image: ${errorData}`);
    } else {
      console.error(`Error fetching ${identifier} image:`, error.message);
      throw new Error(`Error fetching ${identifier} image: ${error.message}`);
    }
  }
};

// GET /api/satellite/images?fieldId=&date= – pobierz obrazy satelitarne dla pola i daty
exports.getSatelliteImages = async (req, res) => {
  const { fieldId, date } = req.query;

  console.log(`Received request for satellite images. Field ID: ${fieldId}, Date: ${date}`);

  if (!fieldId || !date) {
    console.warn('Missing fieldId or date in request.');
    return res.status(400).json({ message: 'fieldId i date są wymagane.' });
  }

  const cacheKey = `${fieldId}-${date}`;
  const cachedData = satelliteCache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for key: ${cacheKey}`);
    return res.json(cachedData);
  } else {
    console.log(`Cache miss for key: ${cacheKey}. Fetching from Sentinel Hub...`);
  }

  try {
    // Sprawdź, czy obraz już istnieje w bazie
    let satelliteImage = await SatelliteImage.findOne({ fieldId: fieldId, date: new Date(date) });

    if (satelliteImage) {
      console.log(`Obraz już istnieje w bazie dla key: ${cacheKey}`);
      // Dodaj do cache
      satelliteCache.set(cacheKey, { imageBase64Default: satelliteImage.imageBase64Default, imageBase64Ndvi: satelliteImage.imageBase64Ndvi });
      return res.json({ imageBase64Default: satelliteImage.imageBase64Default, imageBase64Ndvi: satelliteImage.imageBase64 });
    }

    // Pobierz informacje o polu
    const field = await Field.findById(fieldId);
    if (!field) {
      console.warn(`Field with ID ${fieldId} not found.`);
      return res.status(404).json({ message: 'Pole nie znalezione.' });
    }

    // Sprawdź, czy pole zawiera przynajmniej jeden polygon
    if (!field.polygons || field.polygons.length === 0) {
      console.warn(`Field with ID ${fieldId} does not contain any polygons.`);
      return res.status(400).json({ message: 'Pole nie zawiera żadnych polygonów.' });
    }

    // Pobierz pierwszy polygon (możesz dostosować logikę, jeśli masz wiele polygonów)
    const polygonGeoJSON = field.polygons[0].geojson;

    // Upewnij się, że geometrią jest Polygon lub MultiPolygon
    if (polygonGeoJSON.type !== 'Polygon' && polygonGeoJSON.type !== 'MultiPolygon') {
      console.warn(`Invalid GeoJSON type: ${polygonGeoJSON.type}. Expected Polygon or MultiPolygon.`);
      return res.status(400).json({ message: 'Geometria musi być typu Polygon lub MultiPolygon.' });
    }

    console.log(`Field location - Latitude: ${field.location.latitude}, Longitude: ${field.location.longitude}`);

    // Przygotowanie daty
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const start = startDate.toISOString();
    const endISO = endDate.toISOString();
    console.log(`Fetching images from ${start} to ${endISO}`);

    // Uzyskaj token dostępu
    const token = await getAccessToken();

    // Definiowanie evalscriptów
    const defaultEvalscript = `
    //VERSION=3
    function setup() {
      return {
        input: ["B04", "B03", "B02", "B08"], // Czerwony, Zielony, Niebieski, Near Infrared
        output: {
          id: "default",
          bands: 3 // Tylko RGB
        }
      };
    }

    function evaluatePixel(sample) {
      return [sample.B04, sample.B03, sample.B02];
    }
    `;

    const ndviEvalscript = `
    //VERSION=3
   function setup() {
  return {
    // [ZMIANA 1]: Jest tylko jeden output 'ndvi' z 4 kanałami (RGB + alpha).
    input: ["B04", "B08", "dataMask"],
    output: [
      { 
        id: "ndvi", 
        bands: 4, 
        sampleType: "AUTO"  // PNG nie obsługuje float32 w tym samym wyjściu
      }
    ]
  };
}

// Przykładowa paleta (gradient)
const ramp = [
  [-0.5, 0x0c0c0c],
  [-0.2, 0xbfbfbf],
  [-0.1, 0xdbdbdb],
  [ 0.0, 0xeaeaea],
  [ 0.025, 0xfff9cc],
  [ 0.05, 0xede8b5],
  [ 0.075, 0xddd89b],
  [ 0.1, 0xccc682],
  [ 0.125, 0xbcb76b],
  [ 0.15, 0xafc160],
  [ 0.175, 0xa3cc59],
  [ 0.2, 0x91bf51],
  [ 0.25, 0x7fb247],
  [ 0.3, 0x70a33f],
  [ 0.35, 0x609635],
  [ 0.4, 0x4f892d],
  [ 0.45, 0x3f7c23],
  [ 0.5, 0x306d1c],
  [ 0.55, 0x216011],
  [ 0.6, 0x0f540a],
  [ 1.0, 0x004400],
];

const visualizer = new ColorRampVisualizer(ramp);

function evaluatePixel(samples) {
  // Obliczamy NDVI
  let ndvi = index(samples.B08, samples.B04); // (NIR - RED) / (NIR + RED)
  
  // Wyznaczamy kolor z rampy
  let rgb = visualizer.process(ndvi); 
  // 'rgb' to tablica [r, g, b], wartości 0..1 (float)
  
  // Kanał alpha => dataMask (czyli 0 albo 1)
  let alpha = samples.dataMask; 
  
  // [ZMIANA 2]: Zwracamy obiekt z kluczem "ndvi"
  return {
    ndvi: [
      rgb[0],   // R
      rgb[1],   // G
      rgb[2],   // B
      alpha     // A
    ]
  };
}
    `;

    // Wykonanie dwóch oddzielnych żądań
    const [defaultImage, ndviImage] = await Promise.all([
      fetchImage(token, polygonGeoJSON, start, endISO, defaultEvalscript, 'default'),
      fetchImage(token, polygonGeoJSON, start, endISO, ndviEvalscript, 'ndvi')
    ]);

    const images = {
      imageBase64Default: defaultImage,
      imageBase64Ndvi: ndviImage
    };

    // Zapisz obrazy w cache
    satelliteCache.set(cacheKey, images);
    console.log(`Cached images with key: ${cacheKey}`);

    // Zapisz obrazy w bazie danych
    const satelliteImageDefault = new SatelliteImage({
      fieldId: fieldId,
      date: startDate,
      imageBase64: defaultImage
    });

    const satelliteImageNdvi = new SatelliteImage({
      fieldId: fieldId,
      date: startDate,
      imageBase64: ndviImage
    });

    // Użyj bulkWrite, aby uniknąć duplikatów
    await SatelliteImage.bulkWrite([
      {
        updateOne: {
          filter: { fieldId: fieldId, date: startDate },
          update: {
            imageBase64Default: defaultImage,
            imageBase64Ndvi: ndviImage
          },
          upsert: true
        }
      }
    ]);

    res.json(images);
  } catch (error) {
    console.error('Error fetching Sentinel Hub images:', error.message);
    res.status(500).json({ message: 'Błąd podczas pobierania obrazów satelitarnych.', details: error.message });
  }
};

// Funkcja do pobrania obrazu satelitarnego (używana w harmonogramie)
const fetchAndSaveSatelliteImage = async (field, date) => {
  try {
    // Pobierz token dostępu
    const token = await getAccessToken();

    // Przygotowanie daty
    const startDate = moment(date).startOf('day').toDate();
    const endDate = moment(date).add(1, 'day').toDate();

    const start = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Definiowanie evalscriptów
    const defaultEvalscript = `
    //VERSION=3
    function setup() {
      return {
        input: ["B04", "B03", "B02", "B08"], // Czerwony, Zielony, Niebieski, Near Infrared
        output: {
          id: "default",
          bands: 3 // Tylko RGB
        }
      };
    }

    function evaluatePixel(sample) {
      return [sample.B04, sample.B03, sample.B02];
    }
    `;

    const ndviEvalscript = `
    //VERSION=3
  function setup() {
  return {
    // [ZMIANA 1]: Jest tylko jeden output 'ndvi' z 4 kanałami (RGB + alpha).
    input: ["B04", "B08", "dataMask"],
    output: [
      { 
        id: "ndvi", 
        bands: 4, 
        sampleType: "AUTO"  // PNG nie obsługuje float32 w tym samym wyjściu
      }
    ]
  };
}

// Przykładowa paleta (gradient)
const ramp = [
  [-0.5, 0x0c0c0c],
  [-0.2, 0xbfbfbf],
  [-0.1, 0xdbdbdb],
  [ 0.0, 0xeaeaea],
  [ 0.025, 0xfff9cc],
  [ 0.05, 0xede8b5],
  [ 0.075, 0xddd89b],
  [ 0.1, 0xccc682],
  [ 0.125, 0xbcb76b],
  [ 0.15, 0xafc160],
  [ 0.175, 0xa3cc59],
  [ 0.2, 0x91bf51],
  [ 0.25, 0x7fb247],
  [ 0.3, 0x70a33f],
  [ 0.35, 0x609635],
  [ 0.4, 0x4f892d],
  [ 0.45, 0x3f7c23],
  [ 0.5, 0x306d1c],
  [ 0.55, 0x216011],
  [ 0.6, 0x0f540a],
  [ 1.0, 0x004400],
];

const visualizer = new ColorRampVisualizer(ramp);

function evaluatePixel(samples) {
  // Obliczamy NDVI
  let ndvi = index(samples.B08, samples.B04); // (NIR - RED) / (NIR + RED)
  
  // Wyznaczamy kolor z rampy
  let rgb = visualizer.process(ndvi); 
  // 'rgb' to tablica [r, g, b], wartości 0..1 (float)
  
  // Kanał alpha => dataMask (czyli 0 albo 1)
  let alpha = samples.dataMask; 
  
  // [ZMIANA 2]: Zwracamy obiekt z kluczem "ndvi"
  return {
    ndvi: [
      rgb[0],   // R
      rgb[1],   // G
      rgb[2],   // B
      alpha     // A
    ]
  };
}
    `;

    // Pobierz pierwszy polygon
    const polygonGeoJSON = field.polygons[0].geojson;

    // Wykonaj żądania do Sentinel Hub
    const [defaultImage, ndviImage] = await Promise.all([
      fetchImage(token, polygonGeoJSON, start, endISO, defaultEvalscript, 'default'),
      fetchImage(token, polygonGeoJSON, start, endISO, ndviEvalscript, 'ndvi')
    ]);

    // Zapisz obrazy w bazie danych

    await SatelliteImage.bulkWrite([
      {
        updateOne: {
          filter: { fieldId: fieldId, date: startDate },
          update: {
            imageBase64Default: defaultImage,
            imageBase64Ndvi: ndviImage
          },
          upsert: true
        }
      }
    ]);
    
    await SatelliteImage.bulkWrite([
      {
        updateOne: {
          filter: { fieldId: field._id, date: startDate },
          update: { imageBase64: defaultImage },
          upsert: true
        }
      },
      {
        updateOne: {
          filter: { fieldId: field._id, date: startDate },
          update: { imageBase64: ndviImage },
          upsert: true
        }
      }
    ]);

    console.log(`Pobrano i zapisano obrazy dla pola ${field._id} na dzień ${moment(date).format('YYYY-MM-DD')}`);
  } catch (error) {
    console.error(`Błąd podczas pobierania obrazów satelitarnych dla pola ${field._id} i daty ${date}:`, error.message);
  }
};

// Funkcja harmonogramująca codzienne pobieranie obrazów
exports.scheduleDailySatelliteImages = async () => {
  // Harmonogram: codziennie o 2 w nocy
  cron.schedule('0 2 * * *', async () => {
    console.log('Rozpoczynanie codziennego pobierania obrazów satelitarnych...');

    try {
      const fields = await Field.find({});

      const today = moment().startOf('day').toDate();

      for (const field of fields) {
        // Sprawdzenie, czy obraz na dziś już istnieje
        const exists = await SatelliteImage.findOne({ fieldId: field._id, date: today });
        if (exists) {
          console.log(`Obraz już istnieje dla pola ${field._id} na dzień ${moment(today).format('YYYY-MM-DD')}`);
          continue;
        }

        // Pobranie i zapisanie obrazu
        await fetchAndSaveSatelliteImage(field, today);
      }

      console.log('Codzienne pobieranie obrazów satelitarnych zakończone.');
    } catch (error) {
      console.error('Błąd podczas harmonogramowanego pobierania obrazów:', error.message);
    }
  });
};


const saveImageAsPNG = (base64Image, filename) => {
  const base64Data = base64Image.split(',')[1]; // Usuń prefix data:image/png;base64,
  const imgBuffer = Buffer.from(base64Data, 'base64');
  const filePath = path.join(__dirname, '..', 'images', filename);
  fs.writeFileSync(filePath, imgBuffer);
};

// GET /api/satellite/image?fieldId=&date=&type= – pobierz pojedynczy obraz satelitarny jako PNG
exports.getSatelliteImageAsPNG = async (req, res) => {
  const { fieldId, date, type } = req.query;

  console.log(`Received request for satellite image as PNG. Field ID: ${fieldId}, Date: ${date}, Type: ${type}`);

  if (!fieldId || !date || !type) {
    console.warn('Missing fieldId, date, or type in request.');
    return res.status(400).json({ message: 'fieldId, date i type są wymagane.' });
  }

  try {
    const satelliteImage = await SatelliteImage.findOne({ fieldId: fieldId, date: new Date(date), type: type });

    if (!satelliteImage) {
      console.warn(`Satellite image not found for fieldId: ${fieldId}, date: ${date}, type: ${type}`);
      return res.status(404).json({ message: 'Obraz satelitarny nie został znaleziony.' });
    }

    const base64Data = satelliteImage.imageBase64.split(',')[1]; // Usuń prefix data:image/png;base64,
    const imgBuffer = Buffer.from(base64Data, 'base64');

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imgBuffer.length
    });
    res.end(imgBuffer);
  } catch (error) {
    console.error('Error fetching satellite image as PNG:', error.message);
    res.status(500).json({ message: 'Błąd podczas pobierania obrazu satelitarnego.', details: error.message });
  }
};

// const getAccessToken = async () => {
//   try {
//     console.log('Requesting Sentinel Hub access token...');
//     const response = await axios.post(
//       `${SENTINELHUB_BASE_URL}/oauth/token`,
//       qs.stringify({
//         grant_type: 'client_credentials',
//         client_id: SENTINELHUB_CLIENT_ID,
//         client_secret: SENTINELHUB_CLIENT_SECRET,
//       }),
//       {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       }
//     );
//     console.log('Access token obtained successfully.');
//     return response.data.access_token;
//   } catch (error) {
//     console.error('Error fetching Sentinel Hub access token:', error.response?.data || error.message);
//     throw new Error('Authentication with Sentinel Hub failed.');
//   }
// };

// // Funkcja do pobrania pojedynczego obrazu
// const fetchImage = async (token, geometry, start, end, evalscript, identifier) => {
//   try {
//     const response = await axios.post(
//       `${SENTINELHUB_BASE_URL}/api/v1/process`,
//       {
//         input: {
//           bounds: {
//             geometry: geometry,
//           },
//           data: [
//             {
//               type: 'S2L1C',
//               dataFilter: {
//                 timeRange: {
//                   from: start,
//                   to: end,
//                 },
//               },
//               mosaickingOrder: 'leastCC',
//             },
//           ],
//         },
//         output: {
//           width: 512,
//           height: 512,
//           responses: [
//             {
//               identifier: identifier, // 'default' lub 'ndvi'
//               format: { type: 'image/png' },
//             },
//           ],
//         },
//         evalscript: evalscript,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//           'Accept': 'image/png',
//         },
//         responseType: 'arraybuffer',
//       }
//     );

//     const base64 = Buffer.from(response.data).toString('base64');
//     const contentType = response.headers['content-type'];
//     return `data:${contentType};base64,${base64}`;
//   } catch (error) {
//     if (error.response) {
//       const errorData = Buffer.from(error.response.data).toString('utf-8');
//       console.error(`Error fetching ${identifier} image:`, error.response.status, errorData);
//       throw new Error(`Error fetching ${identifier} image: ${errorData}`);
//     } else {
//       console.error(`Error fetching ${identifier} image:`, error.message);
//       throw new Error(`Error fetching ${identifier} image: ${error.message}`);
//     }
//   }
// };





// // GET /api/satellite/images?fieldId=&date= – pobierz obrazy satelitarne dla pola i daty
// exports.getSatelliteImages = async (req, res) => {
//   const { fieldId, date } = req.query;

//   console.log(`Received request for satellite images. Field ID: ${fieldId}, Date: ${date}`);

//   if (!fieldId || !date) {
//     console.warn('Missing fieldId or date in request.');
//     return res.status(400).json({ message: 'fieldId i date są wymagane.' });
//   }

//   const cacheKey = `${fieldId}-${date}`;
//   const cachedData = satelliteCache.get(cacheKey);
//   if (cachedData) {
//     console.log(`Cache hit for key: ${cacheKey}`);
//     return res.json(cachedData);
//   } else {
//     console.log(`Cache miss for key: ${cacheKey}. Fetching from Sentinel Hub...`);
//   }

//   try {
//     // Pobierz informacje o polu
//     const field = await Field.findById(fieldId);
//     if (!field) {
//       console.warn(`Field with ID ${fieldId} not found.`);
//       return res.status(404).json({ message: 'Pole nie znalezione.' });
//     }

//     // Sprawdź, czy pole zawiera przynajmniej jeden polygon
//     if (!field.polygons || field.polygons.length === 0) {
//       console.warn(`Field with ID ${fieldId} does not contain any polygons.`);
//       return res.status(400).json({ message: 'Pole nie zawiera żadnych polygonów.' });
//     }

//     // Pobierz pierwszy polygon (możesz dostosować logikę, jeśli masz wiele polygonów)
//     const polygonGeoJSON = field.polygons[0].geojson;

//     // Upewnij się, że geometrią jest Polygon lub MultiPolygon
//     if (polygonGeoJSON.type !== 'Polygon' && polygonGeoJSON.type !== 'MultiPolygon') {
//       console.warn(`Invalid GeoJSON type: ${polygonGeoJSON.type}. Expected Polygon or MultiPolygon.`);
//       return res.status(400).json({ message: 'Geometria musi być typu Polygon lub MultiPolygon.' });
//     }

//     console.log(`Field location - Latitude: ${field.location.latitude}, Longitude: ${field.location.longitude}`);

//     // Przygotowanie daty
//     const startDate = new Date(date);
//     const endDate = new Date(date);
//     endDate.setDate(endDate.getDate() + 1);

//     const start = startDate.toISOString();
//     const end = endDate.toISOString();
//     console.log(`Fetching images from ${start} to ${end}`);

//     // Uzyskaj token dostępu
//     const token = await getAccessToken();

//     // Definiowanie evalscriptów
//     const defaultEvalscript = `
//     //VERSION=3
//     function setup() {
//       return {
//         input: ["B04", "B03", "B02", "B08"], // Czerwony, Zielony, Niebieski, Near Infrared
//         output: {
//           id: "default",
//           bands: 3 // Tylko RGB
//         }
//       };
//     }

//     function evaluatePixel(sample) {
//       return [sample.B04, sample.B03, sample.B02];
//     }
//     `;

//     const ndviEvalscript = `
//     //VERSION=3
//     function setup() {
//       return {
//         input: ["B04", "B08"], // Czerwony, Near Infrared
//         output: {
//           id: "ndvi",
//           bands: 1 // NDVI
//         }
//       };
//     }

//     function evaluatePixel(sample) {
//       let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
//       return [ndvi];
//     }
//     `;

//     // Wykonanie dwóch oddzielnych żądań
//     const [defaultImage, ndviImage] = await Promise.all([
//       fetchImage(token, polygonGeoJSON, start, end, defaultEvalscript, 'default'),
//       fetchImage(token, polygonGeoJSON, start, end, ndviEvalscript, 'ndvi')
//     ]);

//     const images = {
//       default: defaultImage,
//       ndvi: ndviImage
//     };

//     // Zapisz obrazy w cache
//     satelliteCache.set(cacheKey, images);
//     console.log(`Cached images with key: ${cacheKey}`);

//     res.json(images);
//   } catch (error) {
//     console.error('Error fetching Sentinel Hub images:', error.message);
//     res.status(500).json({ message: 'Błąd podczas pobierania obrazów satelitarnych.', details: error.message });
//   }
// };