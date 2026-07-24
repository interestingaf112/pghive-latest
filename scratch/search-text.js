const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (!f.startsWith('.') && f !== 'node_modules') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const searchPattern = "Brokerage Saved";
const rootDir = "c:\\Users\\yunus\\Downloads\\pg web copy\\pg web copy";

walkDir(rootDir, (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.html') || filePath.endsWith('.css')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.toLowerCase().includes(searchPattern.toLowerCase())) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(searchPattern.toLowerCase())) {
          console.log(`Found in: ${filePath} at line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
