const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\yunus\\Downloads\\pg web copy\\pg web copy\\src\\App.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('App Check') || line.includes('AppCheck') || line.includes('appCheck')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
