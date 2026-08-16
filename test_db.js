const db = require('./server/data/store.js');
const palletStats = {};
Object.values(db.products).forEach(p => {
  const r = p.primary_rack;
  // Check if it's a letter A-Z
  if (/^[A-Z]$/.test(r)) {
    if (!palletStats[r]) {
      palletStats[r] = { maxCol: 0, sections: new Set(), rows: new Set() };
    }
    p.locations.forEach(loc => {
      if (loc.col_number > palletStats[r].maxCol) {
        palletStats[r].maxCol = loc.col_number;
      }
      if (loc.rack_section) palletStats[r].sections.add(loc.rack_section);
      if (loc.row_letter) palletStats[r].rows.add(loc.row_letter);
    });
  }
});

Object.entries(palletStats).sort().forEach(([r, stats]) => {
  console.log(`Rack ${r}: maxCol=${stats.maxCol}, sections=${[...stats.sections].sort().join(',')}, rows=${[...stats.rows].sort().join(',')}`);
});


