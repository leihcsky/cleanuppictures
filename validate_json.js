const fs = require('fs');
const path = require('path');

const files = [
  'messages/en.json',
  'messages/zh.json'
];

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
    console.log(`✅ ${file} is valid JSON`);
  } catch (e) {
    console.error(`❌ ${file} is INVALID JSON: ${e.message}`);
  }
});
