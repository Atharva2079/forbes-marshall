// ============================================================
// Forbes Marshall — Central Raw Material Store
// Data Layer — Parses real Excel locator data at startup
// ============================================================

const XLSX = require('xlsx');
const path = require('path');

// ---- Load Excel workbook ----
const excelPath = path.join(__dirname, '..', '..', 'Locator_data_Central RMS_04-05-2026.xlsx');
const workbook  = XLSX.readFile(excelPath);
const sheet     = workbook.Sheets[workbook.SheetNames[0]];
const rows      = XLSX.utils.sheet_to_json(sheet);

console.log(`📊  Loaded ${rows.length} rows from Excel`);

// ---- Type mapping ----
const LOCATOR_TYPE_MAP = {
  'METAL PALLET -RACKS': 'PALLET',
  'BLUE BIN RACKS':      'BLUE_BIN',
  'CABINETS':            'CABINET',
  'CHEMICAL CUPBOARD':   'CHEMICAL',
};

// ---- Zone derivation from locator_type and rack ----
function deriveZone(locatorType, rack) {
  if (!locatorType && !rack) return 'Chemical';

  const lt = (locatorType || '').toUpperCase();
  if (lt.includes('CHEMICAL')) return 'Chemical';
  if (lt.includes('CABINET'))  return 'Cabinet';

  const r = (rack || '').trim();
  if (!r) return 'Chemical';

  // Blue Bin racks: V, AC1-AC6
  if (r === 'V' || /^AC\d+$/i.test(r)) return 'Blue Bin';

  // Pallet racks: A-U, W-Z (single letters excluding V)
  if (/^[A-UW-Z]$/i.test(r)) return 'Pallet';

  // Cabinet racks: "cabinet N"
  if (/^cabinet/i.test(r)) return 'Cabinet';

  return 'Pallet'; // fallback
}

// ---- Parse LOCATOR NAME (format: XXX-YYY-ZZZ) ----
function parseLocatorName(locatorName, locatorType, rack) {
  const result = {
    locator_name: locatorName || '',
    locator_type: locatorType || '',
    rack:         rack || '',
    rack_section: '',
    row_letter:   '',
    col_number:   0,
    bin:          '',
  };

  if (!locatorName || typeof locatorName !== 'string') return result;

  const parts = locatorName.split('-');
  if (parts.length < 3) return result;

  const part1 = parts[0]; // e.g. A01, V01, C01
  const part2 = parts[1]; // e.g. A01, E02, R01
  const part3 = parts.slice(2).join('-'); // e.g. B1 (sometimes more segments)

  // Extract rack_section: numeric portion of part 1
  const secMatch = part1.match(/(\d+)/);
  result.rack_section = secMatch ? secMatch[1] : '';

  // Extract row_letter: first character of part 2
  result.row_letter = part2.charAt(0) || '';

  // Extract col_number: numeric portion of part 2
  const colMatch = part2.match(/(\d+)/);
  result.col_number = colMatch ? parseInt(colMatch[1], 10) : 0;

  // Bin
  result.bin = part3 || '';

  return result;
}

// ---- Build products map (grouped by item_code) ----
const products = {};
const racksSet = {}; // temp: rackId → { type, maxCol, itemCount, sections }

rows.forEach(row => {
  const itemCode    = row['Item Code'];
  const orgName     = row['Org Name']  || '';
  const locatorName = row['LOCATOR NAME'] || '';
  const locatorType = row['LOCATOR IDENTIFICATION (For RMS team)'] || '';
  const rack        = row['Rack'] || '';

  if (!itemCode) return; // skip empty rows

  const itemCodeStr    = String(itemCode).trim();
  const locatorNameStr = typeof locatorName === 'string' ? locatorName.trim() : String(locatorName).trim();
  const locatorTypeStr = String(locatorType).trim();
  const rackStr        = String(rack).trim();

  // Parse the locator name
  const parsed = parseLocatorName(locatorNameStr, locatorTypeStr, rackStr);

  // Derive zone
  const zone = deriveZone(locatorTypeStr, rackStr);

  // Build location entry
  const location = {
    locator_name: parsed.locator_name,
    locator_type: parsed.locator_type,
    rack:         parsed.rack,
    rack_section: parsed.rack_section,
    row_letter:   parsed.row_letter,
    col_number:   parsed.col_number,
    bin:          parsed.bin,
  };

  if (!products[itemCodeStr]) {
    products[itemCodeStr] = {
      item_code:            itemCodeStr,
      org_name:             String(orgName).trim(),
      locations:            [],
      primary_rack:         rackStr,
      primary_locator_type: locatorTypeStr,
      zone:                 zone,
    };
  }

  products[itemCodeStr].locations.push(location);

  // ---- Track rack data ----
  if (rackStr) {
    const rackType = LOCATOR_TYPE_MAP[locatorTypeStr] || 'PALLET';
    if (!racksSet[rackStr]) {
      racksSet[rackStr] = { id: rackStr, type: rackType, maxCol: 0, itemCount: 0, sections: new Set() };
    }
    racksSet[rackStr].itemCount++;
    if (parsed.col_number > racksSet[rackStr].maxCol) {
      racksSet[rackStr].maxCol = parsed.col_number;
    }
    if (parsed.rack_section) {
      racksSet[rackStr].sections.add(parsed.rack_section);
    }
  }
});

// ---- Build final racks map ----
const racks = {};
Object.keys(racksSet).sort().forEach(rackId => {
  const r = racksSet[rackId];
  racks[rackId] = {
    id:        r.id,
    type:      r.type,
    maxCol:    r.maxCol || 1,
    itemCount: r.itemCount,
  };
});

// ---- Build rackStats ----
const rackStats = {};
Object.keys(racks).forEach(rackId => {
  const r = racksSet[rackId];
  rackStats[rackId] = {
    id:        rackId,
    type:      racks[rackId].type,
    itemCount: r.itemCount,
    maxCol:    r.maxCol || 1,
    sections:  [...r.sections].sort(),
  };
});

// ---- Zone summary ----
const zoneCounts = {};
Object.values(products).forEach(p => {
  zoneCounts[p.zone] = (zoneCounts[p.zone] || 0) + 1;
});

// ---- Metadata ----
const metadata = {
  warehouse_name: 'Forbes Marshall — Central Raw Material Store',
  location:       'Chakan, Pune, Maharashtra',
  total_items:    Object.keys(products).length,
  total_racks:    Object.keys(racks).length,
  zones: Object.entries(zoneCounts).map(([name, count]) => ({ name, item_count: count })),
  excel_rows:     rows.length,
};

console.log(`✅  Parsed ${metadata.total_items} unique items across ${metadata.total_racks} racks`);
console.log(`   Zones: ${metadata.zones.map(z => `${z.name}(${z.item_count})`).join(', ')}`);

// (exports are at end of file after locatorIndex and route generator)

// ---- Locator Name Index (locator_name → list of item_codes) ----
const locatorIndex = {};
Object.values(products).forEach(p => {
  p.locations.forEach(loc => {
    const key = loc.locator_name.toUpperCase();
    if (!locatorIndex[key]) locatorIndex[key] = [];
    locatorIndex[key].push(p.item_code);
  });
});

console.log(`🔑  Locator index: ${Object.keys(locatorIndex).length} unique locator names`);

// ---- Route Description Generator ----
function generateRouteDescription(locatorName, rack, locatorType, entryPoint) {
  const parsed = parseLocatorName(locatorName, locatorType, rack);
  const zone = deriveZone(locatorType, rack);
  const entry = entryPoint || 'ENTRY_1';
  const entryLabel = entry === 'ENTRY_2' ? 'Bottom-Right Gate' : 'Middle-Right Gate';

  const steps = [];
  steps.push({ icon: '🚪', text: `Start at ${entryLabel}`, detail: 'Enter the warehouse' });
  steps.push({ icon: '➡️', text: `Walk along the right-side gangway`, detail: 'Follow the main corridor' });

  if (zone === 'Pallet') {
    let rowLetter = parsed.rack || rack || 'A';
    rowLetter = String(rowLetter).replace(/[^a-zA-Z]/g, '').toUpperCase().charAt(0) || 'A';
    const section = parsed.rack_section || '01';
    const col = parsed.col_number || 1;
    const bin = parsed.bin || 'B1';
    steps.push({ icon: '⬅️', text: `Turn left into Gangway ${rowLetter}`, detail: `Walk down the corridor for row ${rowLetter}` });
    steps.push({ icon: '🔢', text: `Walk to Section ${section}, Column ${String(col).padStart(2, '0')}`, detail: `Count columns from the aisle end` });
    steps.push({ icon: '📦', text: `Locate Bin ${bin}`, detail: `Look at shelf level ${bin.replace(/[^0-9]/g, '') || '1'}` });
  } else if (zone === 'Blue Bin') {
    let rackId = rack || 'V';
    if (!rackId.startsWith('AC')) {
       rackId = String(rackId).replace(/[^a-zA-Z]/g, '').toUpperCase().charAt(0) || 'V';
    }
    const section = parsed.rack_section || '01';
    const bin = parsed.bin || 'B1';
    
    if (rackId.startsWith('AC')) {
      steps.push({ icon: '⬆️', text: `Go to the mezzanine level`, detail: `Take the stairs/ramp to the upper platform on the right` });
      steps.push({ icon: '🔵', text: `Find rack ${rackId}, Section ${section}`, detail: `Blue Bin rack on mezzanine` });
    } else {
      steps.push({ icon: '⬅️', text: `Walk across the warehouse to the left wall`, detail: `Use the central gangway to cross the floor` });
      steps.push({ icon: '⬆️', text: `Walk along the left-wall gangway`, detail: `Find V-rack section ${section}` });
      steps.push({ icon: '🔵', text: `Find rack V, Section ${section}`, detail: `Blue Bin rack against the left wall` });
    }
    steps.push({ icon: '📦', text: `Locate Bin ${bin}`, detail: `Check bin compartment` });
  } else if (zone === 'Cabinet') {
    const cabNum = (rack || '').replace(/cabinet\s*/i, '');
    steps.push({ icon: '➡️', text: `Walk to the cabinet wall`, detail: `Cabinets are along the right wall` });
    steps.push({ icon: '🗄️', text: `Find Cabinet ${cabNum}`, detail: `Numbered sequentially along the wall` });
    const bin = parsed.bin || 'B1';
    steps.push({ icon: '📦', text: `Open drawer/shelf ${bin}`, detail: `Cabinet shelf level` });
  } else if (zone === 'Chemical') {
    steps.push({ icon: '⬅️', text: `Walk across to the left wall`, detail: `Chemical storage is on the far left` });
    steps.push({ icon: '⚠️', text: `Enter the Chemical Cupboard area`, detail: `Follow safety protocols` });
    steps.push({ icon: '📦', text: `Locate item on shelf`, detail: `Check the locator label` });
  }

  steps.push({ icon: '✅', text: `Item located at ${locatorName}`, detail: `${zone} zone` });

  return {
    steps,
    zone,
    rack: parsed.rack || rack,
    section: parsed.rack_section,
    column: parsed.col_number,
    bin: parsed.bin,
    entry_point: entryLabel,
    estimated_distance: zone === 'Chemical' ? '~80m' : zone === 'Blue Bin' ? '~50m' : '~35m',
    estimated_time: zone === 'Chemical' ? '~2 min' : zone === 'Blue Bin' ? '~1.5 min' : '~1 min',
  };
}

module.exports = { metadata, racks, products, rackStats, locatorIndex, generateRouteDescription };

