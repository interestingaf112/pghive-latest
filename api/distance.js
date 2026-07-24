// api/distance.js
import { rateLimit } from './_rate-limiter.js';

const CUSTOM_LANDMARKS = [
  // Colleges
  { name: "🎓 Christ University (SG Palaya Campus)", aliases: ["christ university", "christ sg palaya", "christ college", "sg palaya campus"], lat: 12.9362, lng: 77.6062 },
  { name: "🎓 Christ University (Bannerghatta Road)", aliases: ["christ bannerghatta", "christ bgr"], lat: 12.9105, lng: 77.6018 },
  { name: "🎓 Christ University (Kengeri Campus)", aliases: ["christ kengeri"], lat: 12.8633, lng: 77.4378 },
  { name: "🎓 Jain University (Jayanagar)", aliases: ["jain university", "jain jayanagar", "jain college"], lat: 12.9192, lng: 77.5796 },
  { name: "🎓 Jain University (JC Road)", aliases: ["jain jc road"], lat: 12.9632, lng: 77.5878 },
  { name: "🎓 PES University (RR Campus)", aliases: ["pes university", "pes rr", "pesit", "pes rr road"], lat: 12.9344, lng: 77.5350 },
  { name: "🎓 PES University (Electronic City)", aliases: ["pes electronic city", "pes ecotown", "pes ec"], lat: 12.8504, lng: 77.6669 },
  { name: "🎓 MS Ramaiah Institute of Technology", aliases: ["ramaiah", "msrit", "ms ramaiah", "rit"], lat: 13.0305, lng: 77.5649 },
  { name: "🎓 RV College of Engineering", aliases: ["rvce", "rv college", "rvce mysore road"], lat: 12.9237, lng: 77.4987 },
  { name: "🎓 BMS College of Engineering", aliases: ["bmsce", "bms college", "bms basavanagudi"], lat: 12.9416, lng: 77.5661 },
  { name: "🎓 Mount Carmel College", aliases: ["mount carmel", "mcc"], lat: 12.9904, lng: 77.5882 },
  { name: "🎓 St. Joseph's University", aliases: ["st joseph", "josephs", "sjc"], lat: 12.9626, lng: 77.6019 },
  
  // EY & Top Corporate Offices
  { name: "💼 EY (Ernst & Young) - RMZ Ecoworld", aliases: ["ey", "ey office", "ernst & young", "ey ecoworld", "ey bellandur", "ernst and young"], lat: 12.9231, lng: 77.6804 },
  { name: "💼 EY (Ernst & Young) - Manyata Tech Park", aliases: ["ey manyata", "ey hebbal"], lat: 13.0451, lng: 77.6266 },
  { name: "💼 Goldman Sachs (Outer Ring Road)", aliases: ["goldman sachs", "goldman", "gs"], lat: 12.9228, lng: 77.6804 },
  { name: "💼 Google (RMZ Infinity / Bagmane)", aliases: ["google office", "google bangalore", "google"], lat: 12.9782, lng: 77.6607 },
  { name: "💼 Microsoft (Outer Ring Road)", aliases: ["microsoft", "ms office"], lat: 12.9240, lng: 77.6790 },
  { name: "💼 Deloitte (Manyata Tech Park)", aliases: ["deloitte"], lat: 13.0451, lng: 77.6266 },
  { name: "💼 KPMG (Embassy GolfLinks)", aliases: ["kpmg"], lat: 12.9469, lng: 77.6444 },
  { name: "💼 PwC (RMZ Ecospace)", aliases: ["pwc", "price waterhouse coopers"], lat: 12.9242, lng: 77.6798 },
  
  // Tech Parks & Offices
  { name: "🏢 RMZ Ecospace (Outer Ring Road)", aliases: ["ecospace", "rmz ecospace", "bellandur ecospace"], lat: 12.9234, lng: 77.6798 },
  { name: "🏢 Manyata Tech Park (Hebbal)", aliases: ["manyata", "manyata tech park", "manyata park"], lat: 13.0451, lng: 77.6266 },
  { name: "🏢 Bagmane Constellation Business Park", aliases: ["bagmane constellation", "constellation", "bagmane outer ring road"], lat: 12.8984, lng: 77.6698 },
  { name: "🏢 Bagmane Tech Park (CV Raman Nagar)", aliases: ["bagmane tech park", "bagmane cv raman", "btp"], lat: 12.9782, lng: 77.6607 },
  { name: "🏢 ITPL (International Tech Park Bangalore)", aliases: ["itpl", "international tech park", "itpl whitefield"], lat: 12.9866, lng: 77.7335 },
  { name: "🏢 Embassy GolfLinks (EGL)", aliases: ["egl", "embassy golflinks", "golflinks"], lat: 12.9469, lng: 77.6444 },
  { name: "🏢 Cessna Business Park", aliases: ["cessna", "cessna tech park", "cessna park"], lat: 12.9348, lng: 77.6917 },
  { name: "🏢 Prestige Tech Park", aliases: ["prestige tech park", "ptp"], lat: 12.9366, lng: 77.6946 },
  { name: "🏢 Global Village Tech Park", aliases: ["global village", "global village mysore road"], lat: 12.9221, lng: 77.5020 },
  
  // Malls & Hubs
  { name: "🛍️ Nexus Forum Mall (Koramangala)", aliases: ["forum mall", "forum koramangala", "nexus forum"], lat: 12.9350, lng: 77.6113 },
  { name: "🛍️ Phoenix Marketcity (Mahadevapura)", aliases: ["phoenix", "phoenix marketcity", "phoenix mall"], lat: 12.9959, lng: 77.6963 },
  { name: "🛍️ Orion Mall (Rajajinagar)", aliases: ["orion mall", "orion", "orion gateway"], lat: 13.0111, lng: 77.5550 },
  { name: "🛍️ Vega City Mall (Bannerghatta Rd)", aliases: ["vega city", "vega city mall", "vega"], lat: 12.9069, lng: 77.6013 },
  { name: "🛍️ Nexus Shantiniketan (Whitefield)", aliases: ["shantiniketan", "nexus shantiniketan"], lat: 12.9893, lng: 77.7281 },
  
  // Localities & Metro Hubs
  { name: "🚉 Majestic Railway/Bus Station", aliases: ["majestic", "kempegowda bus station", "majestic station"], lat: 12.9779, lng: 77.5724 },
  { name: "🚉 Indiranagar Metro Station", aliases: ["indiranagar metro", "indiranagar station"], lat: 12.9784, lng: 77.6387 },
  { name: "🚉 MG Road Metro Station", aliases: ["mg road", "mg road metro"], lat: 12.9755, lng: 77.6068 },
  { name: "📍 Koramangala 5th Block", aliases: ["koramangala 5th block", "koramangala club"], lat: 12.9348, lng: 77.6189 },
  { name: "📍 HSR Layout Sector 1", aliases: ["hsr layout", "hsr sector 1", "hsr"], lat: 12.9101, lng: 77.6450 },
  { name: "📍 BTM Layout 2nd Stage", aliases: ["btm layout", "btm 2nd stage", "btm"], lat: 12.9121, lng: 77.6446 },
  { name: "📍 Jayanagar 4th Block", aliases: ["jayanagar 4th block", "jayanagar complex"], lat: 12.9308, lng: 77.5802 }
];

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. IP-Based Rate Limiting (30 requests per minute)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
  const limitRes = rateLimit(ip, 30, 60 * 1000);
  if (limitRes.blocked) {
    return res.status(429).json({ error: `Too many requests. Please try again in ${limitRes.retryAfter} seconds.` });
  }

  const { originLat, originLng, destination, destLat: queryDestLat, destLng: queryDestLng } = req.query;

  if (!originLat || !originLng || !destination) {
    return res.status(400).json({ error: 'Missing originLat, originLng, or destination parameter' });
  }

  // 1. Geocode the destination name
  let destLat, destLng;
  let geocodeSuccess = false;

  if (queryDestLat && queryDestLng) {
    const latNum = parseFloat(queryDestLat);
    const lngNum = parseFloat(queryDestLng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      destLat = latNum;
      destLng = lngNum;
      geocodeSuccess = true;
    }
  }

  const query = destination.trim().toLowerCase();

  // Try offline landmarks lookup first (saves API requests & is instant)
  const localMatch = CUSTOM_LANDMARKS.find(landmark => 
    landmark.name.toLowerCase().includes(query) || 
    landmark.aliases.some(alias => query.includes(alias) || alias.includes(query))
  );

  const googleKey = (process.env.GOOGLE_MAPS_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const simpleRoutingKey = (process.env.SIMPLEROUTING_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const distanceMatrixKey = (process.env.DISTANCEMATRIX_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const distanceMatrixGeocodeKey = (process.env.DISTANCEMATRIX_GEOCODE_KEY || '').replace(/^["']|["']$/g, '').trim();

  if (geocodeSuccess) {
    // Already set via raw coordinate parameters
  } else if (localMatch) {
    destLat = localMatch.lat;
    destLng = localMatch.lng;
    geocodeSuccess = true;
  } else if (googleKey) {
    // Try Google Geocoding API
    try {
      const googleGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ", Bangalore")}&location=${originLat},${originLng}&radius=15000&key=${googleKey}`;
      const response = await fetch(googleGeocodeUrl);
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        destLat = data.results[0].geometry.location.lat;
        destLng = data.results[0].geometry.location.lng;
        geocodeSuccess = true;
      }
    } catch (e) {
      console.error("Google Geocoding failed:", e);
    }
  }

  // Fallback to DistanceMatrix.ai Geocoding (if Google fails or key is missing)
  if (!geocodeSuccess && distanceMatrixGeocodeKey) {
    try {
      const isFast = distanceMatrixGeocodeKey.startsWith('7JAB');
      const baseUrl = isFast ? 'https://api-v2.distancematrix.ai' : 'https://api.distancematrix.ai';
      const geocodeUrl = `${baseUrl}/maps/api/geocode/json?address=${encodeURIComponent(query + ", Bangalore")}&location=${originLat},${originLng}&radius=15000&key=${distanceMatrixGeocodeKey}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        destLat = data.results[0].geometry.location.lat;
        destLng = data.results[0].geometry.location.lng;
        geocodeSuccess = true;
      }
    } catch (e) {
      console.error("DistanceMatrix Geocoding failed:", e);
    }
  }

  // If Google fails/is denied or no key set, fall back to Photon API (OSM)
  if (!geocodeSuccess) {
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ", Bangalore")}&lat=${originLat}&lon=${originLng}&limit=1`;
      const response = await fetch(photonUrl);
      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        destLng = data.features[0].geometry.coordinates[0];
        destLat = data.features[0].geometry.coordinates[1];
        geocodeSuccess = true;
      } else {
        return res.status(404).json({ error: "Location not found. Try another search name." });
      }
    } catch (e) {
      console.error("Photon Geocoding failed:", e);
      return res.status(500).json({ error: "Failed to geocode destination address." });
    }
  }

  // 2. Fetch routing parameters
  // Option A1: DistanceMatrix.ai API (Google-compatible free tier replacement)
  if (distanceMatrixKey) {
    try {
      const isFast = distanceMatrixKey.startsWith('ykQio');
      const baseUrl = isFast ? 'https://api-v2.distancematrix.ai' : 'https://api.distancematrix.ai';
      const dmUrl = `${baseUrl}/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${distanceMatrixKey}`;
      const response = await fetch(dmUrl);
      const data = await response.json();

      if (data.status === "OK" && data.rows && data.rows[0].elements && data.rows[0].elements[0].status === "OK") {
        const element = data.rows[0].elements[0];
        return res.status(200).json({
          distance: element.distance.text,
          duration: element.duration.text,
          provider: `DistanceMatrix.ai (${isFast ? 'Fast' : 'Accurate'})`
        });
      }
    } catch (error) {
      console.error("DistanceMatrix.ai call failed, falling back:", error);
    }
  }

  // Option A2: Google Maps Distance Matrix API
  if (googleKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${googleKey}&mode=driving`;
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status === "OK" && data.rows && data.rows[0].elements && data.rows[0].elements[0].status === "OK") {
        const element = data.rows[0].elements[0];
        return res.status(200).json({
          distance: element.distance.text,
          duration: element.duration.text,
          provider: "Google Maps"
        });
      }
    } catch (error) {
      console.error("Google Maps call failed, falling back:", error);
    }
  }

  // Option B: Simple Routing (simplerouting.io) OSRM
  if (simpleRoutingKey) {
    try {
      const routingUrl = `https://api.simplerouting.io/osrm/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
      const response = await fetch(routingUrl, {
        headers: {
          'Authorization': `Bearer ${simpleRoutingKey}`
        }
      });
      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = route.distance / 1000;
        const durationMins = Math.round(route.duration / 60);

        return res.status(200).json({
          distance: distKm < 1 ? `${Math.round(route.distance)} m` : `${distKm.toFixed(1)} km`,
          duration: `${durationMins} mins`,
          provider: "Simple Routing OSRM"
        });
      }
    } catch (error) {
      console.error("Simple Routing call failed, falling back:", error);
    }
  }

  // Option C (Default Free Demo): OSRM Public Routing Server (covers Bangalore, no keys required!)
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distKm = route.distance / 1000;
      const durationMins = Math.round(route.duration / 60);

      return res.status(200).json({
        distance: distKm < 1 ? `${Math.round(route.distance)} m` : `${distKm.toFixed(1)} km`,
        duration: `${durationMins} mins`,
        provider: "OSRM Public Server (Free)"
      });
    }
  } catch (error) {
    console.error("OSRM Public Server call failed, using straight line:", error);
  }

  // Option D (Failsafe Fallback): Straight-line Haversine math
  const dist = getHaversineDistance(parseFloat(originLat), parseFloat(originLng), destLat, destLng);
  const driveTime = Math.round(dist * 4);

  return res.status(200).json({
    distance: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
    duration: `${driveTime} mins`,
    provider: "Straight-Line Fallback",
    isFallback: true
  });
}
