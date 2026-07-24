import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit } from './_rate-limiter.js';

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }
  
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountRaw);
  } catch (e) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON.');
  }
  
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. IP-Based Rate Limiting (10 requests per minute)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
  const limitRes = rateLimit(ip, 10, 60 * 1000);
  if (limitRes.blocked) {
    return res.status(429).json({ error: `Too many requests. Please try again in ${limitRes.retryAfter} seconds.` });
  }

  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }
    if (query.length > 200) {
      return res.status(400).json({ error: 'Query exceeds maximum allowed length of 200 characters.' });
    }

    // 1. Check Gemini API Key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(400).json({
        error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your environment variables on Vercel to activate the AI Finder!',
        needsConfig: true
      });
    }

    // 2. Fetch all public PGs from Firestore
    initFirebaseAdmin();
    const db = getFirestore();
    const pgsSnap = await db.collection('pgs').get();
    
    const cleanPgs = pgsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        locality: data.locality,
        address: data.address,
        price: data.price,
        gender: data.gender,
        sharing: data.sharing || {},
        amenities: data.amenities || [],
        description: data.description || ''
      };
    });

    // 3. Initialize Gemini Client
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    // 4. Construct Prompt
    const prompt = `
You are the Hive AI Finder for PGhive, a premium brokerage-free co-living marketplace in Bangalore.
The user is searching for PG accommodations using this search query: "${query.trim()}".

Analyze the following list of verified PG listings:
${JSON.stringify(cleanPgs, null, 2)}

Identify the best matching listings (up to 3 matches) based on their location/locality, price, amenities, and gender preferences.
If no matches are found, return an empty array for matchingIds.

Return a JSON object matching this schema:
{
  "matchingIds": ["string representing the document ID of matching PGs"],
  "response": "A helpful, conversational response in Markdown. Address the user directly, explain why these properties match their query (referencing price, key amenities, and suitability), and guide them on what to do next. Keep it concise, friendly, and professional. If no matches were found, explain nicely and suggest what they can search for instead."
}
`;

    // 5. Generate Content
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(textResponse);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", textResponse);
      return res.status(500).json({ error: 'Failed to process AI response.' });
    }

    return res.status(200).json(parsedResult);

  } catch (err) {
    console.error("AI Search Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
