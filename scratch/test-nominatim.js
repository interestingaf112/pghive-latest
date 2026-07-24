// scratch/test-nominatim.js
async function run() {
  const query = "EY office";
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Bangalore")}&format=json&limit=5`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'pg-hive-app-student-project' // Nominatim requires a User-Agent header
      }
    });
    const data = await response.json();
    console.log("Nominatim returned", data.length, "results:");
    data.forEach((r, i) => {
      console.log(`[Result ${i + 1}] Display Name:`, r.display_name, "Coords:", [r.lon, r.lat]);
    });
  } catch (e) {
    console.error("Nominatim failed:", e);
  }
}

run();
