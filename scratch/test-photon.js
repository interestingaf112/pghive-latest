// scratch/test-photon.js
async function run() {
  const query = "EY office";
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ", Bangalore")}&limit=5`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Photon returned", data.features?.length || 0, "features:");
    if (data.features) {
      data.features.forEach((f, i) => {
        console.log(`[Feature ${i + 1}] Name:`, f.properties.name, "City:", f.properties.city, "Coords:", f.geometry.coordinates);
      });
    }
  } catch (e) {
    console.error("Photon failed:", e);
  }
}

run();
