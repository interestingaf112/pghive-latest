import fs from 'fs';
import path from 'path';

// Helper to check and initialize Firebase Admin SDK
async function initFirebaseAdmin() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app');
  if (getApps().length === 0) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountRaw) {
      let serviceAccount = JSON.parse(serviceAccountRaw);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({ credential: cert(serviceAccount) });
    }
  }
}

// Self-contained URL formatting slug helpers
function getLocalitySlug(loc) {
  if (!loc) return '';
  return loc.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getListingSlug(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function handler(req, res) {
  // Set caching headers for Vercel CDN Edge nodes
  // s-maxage=3600 (cache at Edge for 1 hour)
  // stale-while-revalidate=86400 (revalidate in background, allow stale serving for up to 24 hours)
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Read index.html from built distribution directory
  let template;
  try {
    const htmlPath = path.join(process.cwd(), 'dist', 'index.html');
    template = fs.readFileSync(htmlPath, 'utf8');
  } catch (err) {
    console.error("Error loading built index.html template:", err);
    return res.status(500).send("Server configuration error: index.html not found.");
  }

  // Parse path info
  const url = new URL(req.url, `https://${req.headers.host || 'www.pghive.co.in'}`);
  const pathname = url.pathname;

  // Matching patterns
  const listingMatch = pathname.match(/^\/pg\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)-([a-zA-Z0-9]+)$/i);
  const localityMatch = pathname.match(/^\/pg\/([a-zA-Z0-9-]+)$/i);

  let title = "PGhive | Premium Paying Guest Accommodations in Bangalore";
  let description = "Find the best Paying Guest (PG) accommodations in Bangalore with PGhive. Filter by locality, price, amenities, and gender preferences. Zero brokerage — contact owners directly.";
  let canonicalUrl = `https://www.pghive.co.in${pathname}`;
  let ogImage = "https://www.pghive.co.in/logo-cropped.png";
  let schemaScripts = "";

  if (listingMatch) {
    const localitySlug = listingMatch[1];
    const listingId = listingMatch[3];

    try {
      await initFirebaseAdmin();
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      const docRef = db.collection('listings').doc(listingId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        // Return 404 status and error headers to prevent search indexing of missing IDs
        res.status(404);
        title = "Listing Not Found | PGhive";
        description = "The requested co-living PG listing could not be found or has been removed from our listings database.";
      } else {
        const pg = docSnap.data();
        title = `${pg.name} | PG in ${pg.locality} - PGhive`;
        const amenitiesStr = pg.amenities ? Object.keys(pg.amenities).filter(k => pg.amenities[k]).join(', ') : '';
        description = `Explore ${pg.name} co-living in ${pg.locality}, Bangalore. Preferred for: ${pg.preferredGender}. Key amenities: ${amenitiesStr}. Rent starts at ₹${pg.price}/month. Zero brokerage on PGhive.`;
        ogImage = pg.thumbnail || (pg.photos && pg.photos[0]) || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80";

        // LodgingBusiness / Accommodation schema
        const accommodationSchema = {
          "@context": "https://schema.org",
          "@type": "Accommodation",
          "name": pg.name,
          "description": pg.description,
          "image": ogImage,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": pg.locality,
            "addressRegion": "Karnataka",
            "addressCountry": "IN"
          },
          "offers": {
            "@type": "Offer",
            "price": pg.price,
            "priceCurrency": "INR",
            "category": "Rent"
          },
          "amenityFeature": pg.amenities ? Object.keys(pg.amenities).filter(k => pg.amenities[k]).map(key => ({
            "@type": "LocationFeatureSpecification",
            "name": key,
            "value": true
          })) : []
        };

        // Breadcrumb schema
        const breadcrumbSchema = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://www.pghive.co.in"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": pg.locality,
              "item": `https://www.pghive.co.in/pg/${getLocalitySlug(pg.locality)}`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": pg.name,
              "item": canonicalUrl
            }
          ]
        };

        schemaScripts = `
          <script type="application/ld+json" id="dynamic-pg-schema">${JSON.stringify(accommodationSchema)}</script>
          <script type="application/ld+json" id="dynamic-breadcrumb-schema">${JSON.stringify(breadcrumbSchema)}</script>
        `;
      }
    } catch (err) {
      console.error("Firestore loading error in prerender.js:", err);
      title = "Verified PG Listing | PGhive";
      description = "View pricing, amenities, co-living rules, and direct owner contact information on PGhive.";
    }
  } else if (localityMatch) {
    const localitySlug = localityMatch[1];
    const localityName = localitySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    title = `PG in ${localityName} | Zero Brokerage PG accommodations on PGhive`;
    description = `Find the best Paying Guest (PG) accommodations in ${localityName}, Bangalore. Filter by price, amenities, and gender. Zero brokerage — contact owners directly on PGhive.`;

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.pghive.co.in"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": localityName,
              "item": canonicalUrl
            }
          ]
        };

        schemaScripts = `
          <script type="application/ld+json" id="dynamic-breadcrumb-schema">${JSON.stringify(breadcrumbSchema)}</script>
        `;
      }

  // Inject compiled tags into HTML head template
  let outputHtml = template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href=".*?"\s*\/?>/, `<link rel="canonical" href="${canonicalUrl}" />`)
    .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${canonicalUrl}" />`);

  if (outputHtml.includes('property="og:image"')) {
    outputHtml = outputHtml.replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${ogImage}" />`);
  } else {
    outputHtml = outputHtml.replace('</head>', `<meta property="og:image" content="${ogImage}" />\n</head>`);
  }

  if (schemaScripts) {
    outputHtml = outputHtml.replace('</head>', `${schemaScripts}\n</head>`);
  }

  res.send(outputHtml);
}
