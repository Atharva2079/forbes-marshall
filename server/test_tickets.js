const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'tickects examples');

async function main() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.PDF'));
  
  for (const file of files) {
    const data = new Uint8Array(fs.readFileSync(path.join(dir, file)));
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    let allText = '';
    
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      allText += tc.items.map(it => it.str).join(' ') + '\n';
    }
    
    // Extract item codes and locators
    const items = allText.match(/\d{2}-\d{3}-\d{7}/g) || [];
    const locs = allText.match(/[A-Z]{1,3}\d{1,2}-[A-Z]\d{2}-B\d{1,2}-?/gi) || [];
    const ticket = allText.match(/Ticket\s*No\s*:\s*([A-Z0-9]+-[A-Z]{3}\d{2}-\d+)/i);
    
    console.log('=== ' + file + ' ===');
    console.log('Ticket:', ticket ? ticket[1] : 'N/A');
    console.log('Items:', [...new Set(items)]);
    console.log('Locators:', [...new Set(locs.map(l => l.replace(/-$/, '')))]);
    console.log();
  }
}

main().catch(e => console.error(e));
