// scratch/test-geocode.js
import fetch from 'node-fetch';

const CUSTOM_LANDMARKS = [
  { name: "Christ University (SG Palaya Campus)", aliases: ["christ university", "christ sg palaya", "christ college", "sg palaya campus"], lat: 12.9362, lng: 77.6062 }
];

async function run() {
  const query = "christ university backgate";
  
  // Test local lookup
  const localMatch = CUSTOM_LANDMARKS.find(landmark => 
    landmark.name.toLowerCase().includes(query) || 
    landmark.aliases.some(alias => query.includes(alias) || alias.includes(query))
  );
  
  console.log("Local Match:", localMatch);
  
  // Test Photon API
  try {
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query + ", Bangalore")}&limit=3`);
    const data = await response.json();
    console.log("Photon Features length:", data.features?.length);
    if (data.features && data.features.length > 0) {
      console.log("First Photon Feature Name:", data.features[0].properties.name);
      console.log("First Photon Feature Coordinates:", data.features[0].geometry.coordinates);
    }
  } catch (e) {
    console.error("Photon failed:", e);
  }
}

run();
