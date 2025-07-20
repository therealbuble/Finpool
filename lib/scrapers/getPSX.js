// lib/scrapers/getPSX.js
import axios from "axios";
import * as cheerio from "cheerio";

export async function getPSXData() {
  try {
    const { data } = await axios.get("https://www.psx.com.pk/market-summary/");
    const $ = cheerio.load(data);

    // Example: scrape KSE-100 index or top stocks
    const kse100 = $('.kse100-index .market-index-value').text().trim();
    const change = $('.kse100-index .market-index-change').text().trim();

    return {
      kse100: kse100 || "N/A",
      change: change || "N/A"
    };
  } catch (err) {
    console.error("PSX scraper error:", err);
    return { kse100: "N/A", change: "N/A" };
  }
}
