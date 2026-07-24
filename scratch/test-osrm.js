// scratch/test-osrm.js
async function run() {
  const originLat = 12.9341;
  const originLng = 77.6063;
  const destLat = 12.9362;
  const destLng = 77.6062;

  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("OSRM Response Code:", data.code);
    if (data.routes && data.routes.length > 0) {
      console.log("Road Distance (meters):", data.routes[0].distance);
      console.log("Duration (seconds):", data.routes[0].duration);
    }
  } catch (e) {
    console.error("OSRM failed:", e);
  }
}

run();
