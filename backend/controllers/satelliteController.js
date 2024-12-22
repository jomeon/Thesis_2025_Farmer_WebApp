// src/controllers/satelliteController.js

const NodeCache = require('node-cache');
const satelliteCache = new NodeCache({ stdTTL: 3600 }); // Cache na 1 godzinę
const qs = require('qs'); 

const axios = require('axios');
const Field = require('../models/Field'); // Model pola uprawnego

const {
  SENTINELHUB_CLIENT_ID,
  SENTINELHUB_CLIENT_SECRET,
  SENTINELHUB_INSTANCE_ID,
  SENTINELHUB_BASE_URL,
} = process.env;

// Funkcja do uzyskania tokena dostępu
const getAccessToken = async () => {
    try {
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
      return response.data.access_token;
    } catch (error) {
      console.error('Error fetching Sentinel Hub access token:', error.response?.data || error.message);
      throw new Error('Authentication with Sentinel Hub failed.');
    }
  };

// GET /api/satellite/images?fieldId=&date= – pobierz obrazy satelitarne dla pola i daty
exports.getSatelliteImages = async (req, res) => {
    const { fieldId, date } = req.query;
  
    if (!fieldId || !date) {
      return res.status(400).json({ message: 'fieldId i date są wymagane.' });
    }
  
    const cacheKey = `${fieldId}-${date}`;
    const cachedData = satelliteCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
  
    try {
      // Pobierz informacje o polu
      const field = await Field.findById(fieldId);
      if (!field) {
        return res.status(404).json({ message: 'Pole nie znalezione.' });
      }
  
      const { latitude, longitude } = field.location;
  
      // Przygotowanie daty
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
  
      const start = startDate.toISOString();
      const end = endDate.toISOString();
  
      // Uzyskaj token dostępu
      const token = await getAccessToken();
  
      // Przygotowanie zapytania do Sentinel Hub
      const response = await axios.post(
        `${SENTINELHUB_BASE_URL}/api/v1/process`,
        {
          input: {
            bounds: {
              geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
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
                identifier: 'default',
                format: { type: 'image/png' },
              },
              {
                identifier: 'ndvi',
                format: { type: 'image/png' },
              },
            ],
          },
          evalscript: `
            //VERSION=3
            function setup() {
              return {
                input: ["B04", "B03", "B02", "B08"], // Czerwony, Zielony, Niebieski, Near Infrared
                output: { bands: 4 }
              };
            }
  
            function evaluatePixel(sample) {
              let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
              return [sample.B04, sample.B03, sample.B02, ndvi];
            }
          `,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      console.log('Response from Sentinel Hub:', response.data);
  
      // Przekształć odpowiedź na dane URL obrazu
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;
  
      satelliteCache.set(cacheKey, { imageUrl });
  
      res.json({ imageUrl });
    } catch (error) {
      console.error('Error fetching Sentinel Hub images:', error.response?.data || error.message);
      res.status(500).json({ message: 'Błąd podczas pobierania obrazów satelitarnych.' });
    }
  };
  

