// Quick test: parse all ticket PDFs and batch-locate against real data
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const path = require('path');
const { parseTicketText, batchLocate } = require('./utils/ticketParser');
const db = require('./data/store');

const dir = path.join(__dirname, '..', 'tickects examples');

async function extractPdfText(filePath) {
  const buf = fs.readFileSync(filePath);
  const data = new Uint8Array(buf);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  let allText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    allText += tc.items.map(it => it.str).join(' ') + '\n';
  }
  return allText;
}

async function main() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.PDF'));
  
  for (const file of files) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📄 ${file}`);
    console.log('═'.repeat(60));
    
    const text = await extractPdfText(path.join(dir, file));
    const parsed = parseTicketText(text);
    
    console.log(`🎫 Ticket: ${parsed.ticketNo || 'N/A'}`);
    console.log(`📦 Item codes found: ${parsed.itemCodes.length}`);
    console.log(`📍 Locator codes found: ${parsed.locatorCodes.length}`);
    
    // Batch locate
    const allCodes = [...parsed.itemCodes, ...parsed.locatorCodes];
    const { results, notFound } = batchLocate(allCodes, db);
    
    console.log(`✅ Products located: ${results.length}`);
    results.forEach(r => {
      console.log(`   ${r.item_code} → ${r.primary_locator_name} [${r.zone}] Rack ${r.primary_rack}`);
    });
    
    if (notFound.length > 0) {
      console.log(`⚠️  Not found: ${notFound.join(', ')}`);
    }
  }
}

main().catch(e => console.error(e));
