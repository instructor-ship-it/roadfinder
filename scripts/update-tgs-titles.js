const fs = require('fs');
const path = require('path');

// Load the files
const tgsIndexPath = path.join(__dirname, '../public/library/mrwa/tmp/tgs-index.json');
const catalogPath = path.join(__dirname, '../public/library/mrwa/tmp/catalog.json');

const tgsIndex = JSON.parse(fs.readFileSync(tgsIndexPath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Create page-to-TGS lookup
const pageToTgs = {};
for (const category of tgsIndex) {
  for (const entry of category.entries) {
    pageToTgs[entry.page] = {
      id: entry.id,
      title: entry.title,
      category: category.category,
      categoryName: category.categoryName,
      postedSpeed: entry.postedSpeed,
      tempSpeed: entry.tempSpeed,
      implementation: entry.implementation
    };
  }
}

console.log(`Found ${Object.keys(pageToTgs).length} TGS entries`);

// Update catalog manifest
let updated = 0;
for (const page of catalog.manifest) {
  const tgs = pageToTgs[page.num];
  if (tgs) {
    page.drawingId = tgs.id;
    page.drawingTitle = tgs.title;
    page.category = tgs.category;
    page.postedSpeed = tgs.postedSpeed;
    page.tempSpeed = tgs.tempSpeed;
    page.implementation = tgs.implementation;
    // Update title to use drawing ID
    page.title = `${tgs.id}: ${tgs.title}`;
    updated++;
  }
}

console.log(`Updated ${updated} pages with TGS drawing info`);

// Save updated catalog
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('Catalog saved!');
