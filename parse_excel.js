// Additional analysis - locator name structures by rack type
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Locator_data_Central RMS_04-05-2026.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Sample locator names from various rack types
const rackTypes = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','cabinet 1','AC1','AC2'];
rackTypes.forEach(rt => {
  const samples = data.filter(r => r['Rack'] === rt).slice(0, 5);
  if (samples.length === 0) return;
  console.log(`\n${rt}:`);
  samples.forEach(s => {
    const loc = s['LOCATOR NAME'];
    const locStr = typeof loc === 'string' ? loc : String(loc);
    console.log(`  ${s['Item Code']} → ${locStr} (${s['LOCATOR IDENTIFICATION (For RMS team)']})`);
  });
});

// Find UNKNOWN rack entries
const unknowns = data.filter(r => !r['Rack']).slice(0, 10);
console.log('\n=== ITEMS WITH NO RACK ===');
unknowns.forEach(u => {
  console.log(`  ${u['Item Code']} → ${u['LOCATOR NAME']} (${u['LOCATOR IDENTIFICATION (For RMS team)']})`);
});

// Parse locator name format analysis
console.log('\n=== LOCATOR NAME FORMAT ANALYSIS ===');
const formats = {};
data.forEach(r => {
  const loc = r['LOCATOR NAME'];
  if (!loc || typeof loc !== 'string') return;
  const parts = loc.split('-');
  const fmt = `${parts.length}-part`;
  formats[fmt] = (formats[fmt] || 0) + 1;
});
console.log(formats);

// Sample 3-part locator names (majority)
const threePart = data.filter(r => {
  const loc = r['LOCATOR NAME'];
  return loc && typeof loc === 'string' && loc.split('-').length === 3;
}).slice(0, 20);
console.log('\n=== 3-PART LOCATOR SAMPLES ===');
threePart.forEach(r => {
  const loc = r['LOCATOR NAME'];
  const parts = loc.split('-');
  console.log(`  ${loc} → Rack-Section: ${parts[0]}, Row-Col: ${parts[1]}, Bin: ${parts[2]}, (Rack: ${r['Rack']})`);
});

// METAL PALLET rack examples
const metalPallet = data.filter(r => r['LOCATOR IDENTIFICATION (For RMS team)'] === 'METAL PALLET -RACKS').slice(0, 10);
console.log('\n=== METAL PALLET RACK SAMPLES ===');
metalPallet.forEach(s => {
  console.log(`  ${s['Item Code']} → ${s['LOCATOR NAME']} (Rack: ${s['Rack']})`);
});

// CABINETS examples  
const cabinets = data.filter(r => r['LOCATOR IDENTIFICATION (For RMS team)'] === 'CABINETS').slice(0, 10);
console.log('\n=== CABINET SAMPLES ===');
cabinets.forEach(s => {
  console.log(`  ${s['Item Code']} → ${s['LOCATOR NAME']} (Rack: ${s['Rack']})`);
});
