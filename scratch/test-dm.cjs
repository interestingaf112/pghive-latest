const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load production environment variables
const envPath = path.join(__dirname, '..', '.env.vercel.prod');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const distanceMatrixGeocodeKey = process.env.DISTANCEMATRIX_GEOCODE_KEY;

async function runTest() {
  const originLat = 12.9308;
  const originLng = 77.5802;
  const query = "uday building tavarekere";

  if (distanceMatrixGeocodeKey) {
    const isFast = distanceMatrixGeocodeKey.startsWith('7JAB');
    const baseUrl = isFast ? 'https://api-v2.distancematrix.ai' : 'https://api.distancematrix.ai';
    
    // Test 1: Standard Geocoding
    const url1 = `${baseUrl}/maps/api/geocode/json?address=${encodeURIComponent(query + ", Bangalore")}&key=${distanceMatrixGeocodeKey}`;
    // Test 2: Geocoding with Location Bias (near BTM/SG Palya)
    const url2 = `${baseUrl}/maps/api/geocode/json?address=${encodeURIComponent(query + ", Bangalore")}&location=${originLat},${originLng}&radius=15000&key=${distanceMatrixGeocodeKey}`;
    // Test 3: Geocoding with bounds parameter (bias viewport)
    const url3 = `${baseUrl}/maps/api/geocode/json?address=${encodeURIComponent(query + ", Bangalore")}&bounds=12.85,77.50|13.05,77.70&key=${distanceMatrixGeocodeKey}`;

    try {
      console.log('--- TEST 1: Standard ---');
      const res1 = await fetch(url1);
      const data1 = await res1.json();
      if (data1.results && data1.results.length > 0) {
        console.log('Test 1 coordinates:', data1.results[0].geometry.location);
        console.log('Test 1 address:', data1.results[0].formatted_address);
      } else {
        console.log('Test 1 no results');
      }

      console.log('--- TEST 2: Location Bias ---');
      const res2 = await fetch(url2);
      const data2 = await res2.json();
      if (data2.results && data2.results.length > 0) {
        console.log('Test 2 coordinates:', data2.results[0].geometry.location);
        console.log('Test 2 address:', data2.results[0].formatted_address);
      } else {
        console.log('Test 2 no results');
      }

      console.log('--- TEST 3: Bounds Viewport Bias ---');
      const res3 = await fetch(url3);
      const data3 = await res3.json();
      if (data3.results && data3.results.length > 0) {
        console.log('Test 3 coordinates:', data3.results[0].geometry.location);
        console.log('Test 3 address:', data3.results[0].formatted_address);
      } else {
        console.log('Test 3 no results');
      }
      
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }
}

runTest();
