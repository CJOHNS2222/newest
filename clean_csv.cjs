const fs = require('fs');

const inputPath = 'c:\\Users\\cjohn\\Downloads\\simplyrecipes-com-2025-12-13.csv';
const outputPath = 'c:\\Users\\cjohn\\Downloads\\simplyrecipes-com-2025-12-13-cleaned.csv';

const content = fs.readFileSync(inputPath, 'utf8');
const cleaned = content.replace(/<img[^>]*>/g, '');

fs.writeFileSync(outputPath, cleaned);
console.log('Cleaned file saved to', outputPath);