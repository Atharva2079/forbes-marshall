// ============================================================
// Forbes Marshall — Ticket Parser Utility
// Extracts item codes, locator codes, and ticket metadata
// from "DISCRETE JOB PICK LIST REPORT" text content
// ============================================================

/**
 * Regex patterns matching real Forbes Marshall ticket data:
 * - Item codes: XX-XXX-XXXXXXX  (e.g. 25-121-1114846, 10-169-1004988)
 * - Locator codes: XXX-XXX-BX   (e.g. D01-E22-B1, P04-P05-B3)
 *   → may have trailing dash: W01-W14-B1-
 *   → may be semicolon-separated: W01-W14-B1-;W01-W14-B2-
 * - Ticket number: e.g. C3B-JUN26-04922
 */

// Item code pattern: 2digits - 3digits - 7digits
const ITEM_CODE_REGEX = /\b(\d{2}-\d{3}-\d{7})\b/g;

// Locator code pattern: Letter(s)+digits - Letter+digits - B+digit(s), optional trailing dash
// Examples: D01-E22-B1, P04-P05-B3, V03-V31-B1, VE2-V31-B1, C09-R05-B1
const LOCATOR_CODE_REGEX = /\b([A-Z]{1,3}\d{1,2}-[A-Z]\d{2}-B\d{1,2})-?\b/gi;

// Ticket number pattern: e.g. C3B-JUN26-04922, C3A-JUN26-83650
const TICKET_NO_REGEX = /Ticket\s*No\s*:\s*([A-Z0-9]+-[A-Z]{3}\d{2}-\d+)/i;

/**
 * Parse extracted text from a ticket PDF/image and return structured data.
 * @param {string} rawText - The raw text extracted from the document
 * @returns {{ ticketNo, itemCodes, locatorCodes, items }}
 */
function parseTicketText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { ticketNo: null, itemCodes: [], locatorCodes: [], items: [] };
  }

  // Extract ticket number
  const ticketMatch = rawText.match(TICKET_NO_REGEX);
  const ticketNo = ticketMatch ? ticketMatch[1] : null;

  // Extract all item codes (unique)
  const itemCodeMatches = rawText.match(ITEM_CODE_REGEX) || [];
  const itemCodes = [...new Set(itemCodeMatches)];

  // Extract all locator codes (unique, uppercased, strip trailing dash)
  const locatorMatches = [];
  let m;
  const locRe = new RegExp(LOCATOR_CODE_REGEX.source, 'gi');
  while ((m = locRe.exec(rawText)) !== null) {
    locatorMatches.push(m[1].toUpperCase());
  }
  const locatorCodes = [...new Set(locatorMatches)];

  // Build item-to-locator mappings by parsing the text structure
  const items = buildItemLocatorMap(rawText, itemCodes, locatorCodes);

  return { ticketNo, itemCodes, locatorCodes, items };
}

/**
 * Build item-to-locator mappings from raw text.
 * In the ticket text, the pattern is:
 *   ITEM_CODE ... description ... Locator : LOC1;LOC2 ...
 */
function buildItemLocatorMap(rawText, itemCodes, locatorCodes) {
  // Strategy: find each item code, then look for "Locator :" after it
  // until the next item code or end of text
  const items = [];
  const mappedLocators = new Set();

  for (let idx = 0; idx < itemCodes.length; idx++) {
    const code = itemCodes[idx];
    const codePos = rawText.indexOf(code);
    if (codePos === -1) continue;

    // Look for "Locator" keyword after this item code
    const afterCode = rawText.substring(codePos);
    const nextItemPos = idx < itemCodes.length - 1
      ? rawText.indexOf(itemCodes[idx + 1], codePos + code.length)
      : rawText.length;
    
    const segment = rawText.substring(codePos, nextItemPos);
    
    // Find locator codes within this segment
    const segLocators = [];
    const segLocRe = new RegExp(LOCATOR_CODE_REGEX.source, 'gi');
    let lm;
    while ((lm = segLocRe.exec(segment)) !== null) {
      const loc = lm[1].toUpperCase();
      segLocators.push(loc);
      mappedLocators.add(loc);
    }

    items.push({
      item_code: code,
      locators: [...new Set(segLocators)],
    });
  }

  return items;
}

/**
 * Given an array of codes (item codes or locator codes), look them up
 * in the database and return matched products.
 * @param {string[]} codes - Array of item codes or locator codes
 * @param {object} db - The database object { products, locatorIndex }
 * @returns {{ results: object[], notFound: string[] }}
 */
function batchLocate(codes, db) {
  const results = [];
  const notFound = [];
  const seen = new Set();

  for (const code of codes) {
    const trimmed = code.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();

    let found = false;

    // 1. Try as exact item code
    const product = db.products[trimmed] || db.products[upper];
    if (product && !seen.has(product.item_code)) {
      seen.add(product.item_code);
      results.push(formatProduct(product));
      found = true;
      continue;
    } else if (product) {
      found = true;
      continue; // Already seen
    }

    // 2. Try as exact locator code
    const locatorItems = db.locatorIndex[upper];
    if (locatorItems && locatorItems.length > 0) {
      found = true;
      locatorItems.forEach(ic => {
        if (!seen.has(ic)) {
          seen.add(ic);
          const p = db.products[ic];
          if (p) results.push(formatProduct(p));
        }
      });
      continue;
    }

    // 3. Try partial match on item codes
    const partialItemMatch = Object.keys(db.products).find(k =>
      k.toLowerCase().includes(upper.toLowerCase())
    );
    if (partialItemMatch && !seen.has(partialItemMatch)) {
      seen.add(partialItemMatch);
      results.push(formatProduct(db.products[partialItemMatch]));
      found = true;
      continue;
    }

    // 4. Try partial match on locator index
    const partialLocator = Object.keys(db.locatorIndex).find(k =>
      k.includes(upper)
    );
    if (partialLocator) {
      found = true;
      db.locatorIndex[partialLocator].forEach(ic => {
        if (!seen.has(ic)) {
          seen.add(ic);
          const p = db.products[ic];
          if (p) results.push(formatProduct(p));
        }
      });
      continue;
    }

    if (!found) notFound.push(code);
  }

  return { results, notFound };
}

function formatProduct(p) {
  return {
    item_code:            p.item_code,
    org_name:             p.org_name,
    primary_rack:         p.primary_rack,
    primary_locator_type: p.primary_locator_type,
    zone:                 p.zone,
    location_count:       p.locations.length,
    locations:            p.locations,
    primary_locator_name: p.locations.length > 0 ? p.locations[0].locator_name : '',
  };
}

module.exports = { parseTicketText, batchLocate, ITEM_CODE_REGEX, LOCATOR_CODE_REGEX };
