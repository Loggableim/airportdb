// Auto-generated from airports.js — for client-side use
const fs = require('fs');
import airports from '../airports.js';
import blogPosts from '../blog-posts.js';
import { blogCategories } from '../blog-categories.js';

fs.writeFileSync('./public/data/airports.json', JSON.stringify(airports));
fs.writeFileSync('./public/data/blog-posts.json', JSON.stringify(blogPosts));
fs.writeFileSync('./public/data/blog-categories.json', JSON.stringify(blogCategories));

// Build a JSON version of countries.json
const countries = JSON.parse(fs.readFileSync('./src/_data/countries.json', 'utf-8'));
const countriesArr = Object.values(countries);
fs.writeFileSync('./public/data/countries.json', JSON.stringify(countriesArr));

// Build continent data
const continents = JSON.parse(fs.readFileSync('./src/_data/continents.json', 'utf-8'));
fs.writeFileSync('./public/data/continents.json', JSON.stringify(continents));

console.log('Data files generated:');
console.log('- public/data/airports.json', airports.length);
console.log('- public/data/blog-posts.json', blogPosts.length);
console.log('- public/data/blog-categories.json', blogCategories.length);
console.log('- public/data/countries.json', countriesArr.length);
console.log('- public/data/continents.json', Object.keys(continents).length);
