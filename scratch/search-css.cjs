const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\yunus\\Downloads\\pg web copy\\pg web copy\\src\\index.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.pg-card') || line.includes('pg-image') || line.includes('wishlist-heart-btn')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
