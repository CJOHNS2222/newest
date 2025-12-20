const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\Users\\cjohn\\Downloads\\allrecipes-com-2025-12-13-3.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

const header = lines[0].split(',');
const dataLines = lines.slice(1);

const recipes = dataLines.map(line => {
    // Simple CSV parser, assuming no nested quotes
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);

    const obj = {};
    header.forEach((h, i) => {
        obj[h] = values[i] || '';
    });

    return obj;
});

const parsedRecipes = recipes.map(r => {
    const title = r['Recipe_name_0'];
    const description = r['description_0'];
    const ingredientsRaw = r['ingredients'];
    const directions = r['directions'];
    const cookTime = r['total_time_0'] || r['cook_time_0'];

    // Parse ingredients
    let ingredients = [];
    if (ingredientsRaw) {
        ingredients = ingredientsRaw.split(/\n\n+/).map(s => s.trim()).filter(s => s);
    }

    // Parse instructions
    let instructions = [];
    if (directions) {
        instructions = directions.split(/\n\n+/).map(s => s.trim()).filter(s => s);
    }

    return {
        title,
        description,
        ingredients,
        instructions,
        cookTime,
        type: 'Dinner' // default
    };
}).filter(r => r.title);

fs.writeFileSync('parsed_recipes.json', JSON.stringify(parsedRecipes, null, 2));
console.log('Parsed recipes written to parsed_recipes.json');