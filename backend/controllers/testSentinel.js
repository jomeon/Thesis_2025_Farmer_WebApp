const axios = require('axios');
require('dotenv').config();

const testSentinelHubConnection = async () => {
  try {
    const response = await axios.post(
      `${process.env.SENTINELHUB_BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SENTINELHUB_CLIENT_ID,
        client_secret: process.env.SENTINELHUB_CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    console.log('Token fetched successfully:', response.data.access_token);
  } catch (error) {
    console.error('Error fetching Sentinel Hub token:', error.response?.data || error.message);
  }
};

testSentinelHubConnection();
