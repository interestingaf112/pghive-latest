const fs = require('fs');
const path = require('path');

// Regex to match emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1D100}-\u{1D1FF}\u{2000}-\u{3300}]/u;

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (emojiRegex.test(line)) {
          console.log(`${filePath} L${idx + 1}: ${line.trim()}`);
        }
      });
    }
  });
}

searchDir(path.join(__dirname, '..', 'src'));
