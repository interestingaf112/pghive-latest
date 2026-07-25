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

function getLocalitySlug(loc) {
  if (!loc) return '';
  return loc.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getListingSlug(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const PRODUCTION_DOMAIN = 'https://www.pghive.co.in';

export default async function handler(req, res) {
  // Set cache headers to hold sitemap at CDN Edge for 1 hour
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');

  let urls = [
    { loc: `${PRODUCTION_DOMAIN}/`, changefreq: 'daily', priority: '1.0' }
  ];

  try {
    await initFirebaseAdmin();
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const snapshot = await db.collection('listings').get();

    const localitiesSet = new Set();

    snapshot.forEach(doc => {
      const pg = doc.data();
      if (pg.locality) {
        localitiesSet.add(pg.locality);
      }
      
      const listingSlug = getListingSlug(pg.name);
      const localitySlug = getLocalitySlug(pg.locality);
      if (listingSlug && localitySlug) {
        urls.push({
          loc: `${PRODUCTION_DOMAIN}/pg/${localitySlug}/${listingSlug}-${doc.id}`,
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    });

    localitiesSet.forEach(loc => {
      const slug = getLocalitySlug(loc);
      if (slug) {
        urls.push({
          loc: `${PRODUCTION_DOMAIN}/pg/${slug}`,
          changefreq: 'daily',
          priority: '0.9'
        });
      }
    });

  } catch (err) {
    console.error("Error creating dynamic sitemap.xml:", err);
  }

  const xmlEntries = urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlEntries}
</urlset>`;

  res.send(xml.trim());
}
