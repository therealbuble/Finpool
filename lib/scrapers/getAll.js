// /lib/scrapers/getAll.js

import { getMetals } from './getMetals.js';
import { getPSX } from './getPSX.js';
import { getZameen } from './getZameen.js';

export async function getAll() {
  try {
    const [metals, psx, zameen] = await Promise.all([
      getMetals(),
      getPSX(),
      getZameen()
    ]);

    const result = {
      timestamp: new Date().toISOString(),
      metals,
      psx,
      zameen
    };

    console.log("✅ Combined Scrape Result:", result);
    return result;
  } catch (error) {
    console.error("❌ Error scraping data:", error.message);
    return {
      error: true,
      message: error.message,
    };
  }
}

// Optional: Uncomment to test standalone
// getAll();
