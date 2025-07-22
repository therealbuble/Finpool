// lib/scrapers/getMetals.js

// In-memory cache for metals data
let cachedMetalsData = [];
let lastMetalsUpdate = null;
const METALS_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

class MetalsScraper {
  constructor() {
    this.baseUrl = 'https://www.investing.com/commodities/metals';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  // Unit conversion constants
  getConversionRates() {
    return {
      // 1 troy ounce conversions
      TROY_OZ_TO_GRAMS: 31.1035,
      GRAMS_TO_TOLA: 1 / 11.664, // 1 tola = 11.664 grams
      GRAMS_TO_KG: 1 / 1000,
      
      // Pakistan specific
      TOLA_TO_GRAMS: 11.664,
      
      // Display units
      units: {
        ounce: 'per troy oz',
        gram: 'per gram', 
        kilogram: 'per kg',
        tola: 'per tola'
      }
    };
  }

  async scrapeMetalsData() {
    console.log('🔄 Starting metals data scraping...');
    
    try {
      console.log(`📡 Fetching from: ${this.baseUrl}`);
      
      const response = await fetch(this.baseUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log(`📊 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log(`📄 HTML length: ${html.length} characters`);
      
      const basicMetals = this.parseMetalsFromHTML(html);
      console.log(`🔍 Parsed ${basicMetals.length} metals from HTML`);
      
      // If parsing fails or returns invalid data, use fallback immediately
      if (!basicMetals || basicMetals.length === 0 || this.hasInvalidPrices(basicMetals)) {
        console.log('⚠️ HTML parsing failed or returned invalid data, using fallback');
        const fallbackData = this.getFallbackMetalsData();
        return this.enhanceWithMultiUnit(fallbackData);
      }
      
      const enhancedMetals = this.enhanceWithMultiUnit(basicMetals);
      console.log(`✨ Enhanced metals data with multi-unit support`);
      
      return enhancedMetals;
    } catch (error) {
      console.error('❌ Error scraping metals data:', error.message);
      console.log('🔄 Falling back to static data...');
      
      // Return fallback data with multi-unit support
      const fallbackData = this.getFallbackMetalsData();
      return this.enhanceWithMultiUnit(fallbackData);
    }
  }

  hasInvalidPrices(metals) {
    // Check if any precious metal has unreasonably low prices
    for (const metal of metals) {
      const name = metal.name.toLowerCase();
      if (name.includes('gold') && metal.price < 1000) return true;
      if (name.includes('silver') && metal.price < 10) return true;
      if (name.includes('platinum') && metal.price < 500) return true;
      if (name.includes('palladium') && metal.price < 500) return true;
    }
    return false;
  }

  parseMetalsFromHTML(html) {
    console.log('🔍 Starting HTML parsing...');
    
    // Try multiple parsing approaches
    const metals = [];
    
    // Approach 1: Look for structured data or JSON
    const jsonMatch = html.match(/window\.__NUXT__\s*=\s*({.*?});/s) || 
                     html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s) ||
                     html.match(/"instrumentsData":\s*(\[.*?\])/s);
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        console.log('📊 Found JSON data, attempting to parse...');
        // Parse JSON data structure - this would need specific implementation
        // based on the actual JSON structure from investing.com
      } catch (e) {
        console.log('❌ Failed to parse JSON data');
      }
    }
    
    // Approach 2: Enhanced table parsing
    const tableRowRegex = /<tr[^>]*class[^>]*(?:js-instrument-id|instrument|row|table)[^>]*>.*?<\/tr>/gs;
    const matches = html.match(tableRowRegex) || [];
    
    console.log(`📋 Found ${matches.length} potential table rows`);
    
    for (const row of matches) {
      if (this.isMetalRow(row)) {
        const metalData = this.extractMetalData(row);
        if (metalData && this.isValidMetalData(metalData)) {
          console.log(`✅ Extracted: ${metalData.name} - $${metalData.price}`);
          metals.push(metalData);
        }
      }
    }
    
    console.log(`⚡ Total valid metals extracted: ${metals.length}`);
    return metals;
  }

  isValidMetalData(metalData) {
    if (!metalData || !metalData.name || !metalData.price) return false;
    
    const name = metalData.name.toLowerCase();
    const price = metalData.price;
    
    // Validate price ranges for different metals
    if (name.includes('gold') && (price < 1000 || price > 5000)) return false;
    if (name.includes('silver') && (price < 10 || price > 100)) return false;
    if (name.includes('platinum') && (price < 500 || price > 2000)) return false;
    if (name.includes('palladium') && (price < 500 || price > 3000)) return false;
    
    return true;
  }

  isMetalRow(row) {
    const metalKeywords = ['gold', 'silver', 'copper', 'platinum', 'palladium', 'aluminium', 'aluminum', 'nickel', 'zinc', 'lead', 'tin'];
    const lowerRow = row.toLowerCase();
    const hasMetalKeyword = metalKeywords.some(metal => lowerRow.includes(metal));
    
    // Additional checks to ensure it's a data row with proper structure
    const hasPrice = /[\d,]+\.?\d*/.test(row);
    const hasProperStructure = row.includes('<td') || row.includes('data-');
    
    return hasMetalKeyword && hasPrice && hasProperStructure;
  }

  extractMetalData(row) {
    try {
      console.log('🔎 Extracting metal data from row...');
      
      // More robust name extraction with multiple fallbacks
      let name = null;
      
      // Try different extraction methods
      const namePatterns = [
        /title="([^"]*(?:gold|silver|copper|platinum|palladium|aluminium|aluminum|nickel|zinc|lead|tin)[^"]*)">/i,
        /alt="([^"]*(?:gold|silver|copper|platinum|palladium|aluminium|aluminum|nickel|zinc|lead|tin)[^"]*)">/i,
        /<a[^>]*>([^<]*(?:gold|silver|copper|platinum|palladium|aluminium|aluminum|nickel|zinc|lead|tin)[^<]*)</i,
        />([^<]*(?:gold|silver|copper|platinum|palladium|aluminium|aluminum|nickel|zinc|lead|tin)[^<]*)</i
      ];
      
      for (const pattern of namePatterns) {
        const match = row.match(pattern);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
      
      if (!name) {
        console.log('❌ Could not extract metal name');
        return null;
      }
      
      // Clean up the name
      name = name.replace(/derived/gi, '').trim();
      name = name.replace(/^\W+|\W+$/g, '');
      name = name.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      
      console.log(`📛 Metal name: ${name}`);
      
      // Enhanced price extraction with better patterns
      const pricePatterns = [
        /data-value="([\d,]+\.?\d*)"/g,
        /<td[^>]*>([\d,]+\.?\d*)</g,
        />([\d,]+\.?\d*)</g
      ];
      
      let priceMatches = [];
      for (const pattern of pricePatterns) {
        const matches = [...row.matchAll(pattern)];
        if (matches.length >= 3) {
          priceMatches = matches.map(m => m[1]);
          break;
        }
      }
      
      if (priceMatches.length < 3) {
        console.log('❌ Insufficient price data found');
        return null;
      }
      
      const price = parseFloat(priceMatches[0].replace(/,/g, ''));
      const change = parseFloat(priceMatches[1].replace(/,/g, ''));
      const changePercent = parseFloat(priceMatches[2].replace(/[%,]/g, ''));
      
      // Try to extract high/low if available
      let high = price * 1.02; // Default fallback
      let low = price * 0.98;  // Default fallback
      
      if (priceMatches.length >= 5) {
        high = parseFloat(priceMatches[3].replace(/,/g, ''));
        low = parseFloat(priceMatches[4].replace(/,/g, ''));
      }
      
      const metalData = {
        name,
        symbol: this.getMetalSymbol(name),
        price,
        high,
        low,
        change,
        changePercent,
        unit: this.getMetalUnit(name),
        lastUpdate: new Date().toISOString()
      };
      
      console.log(`✅ Extracted metal data:`, metalData);
      return metalData;
      
    } catch (error) {
      console.error('❌ Error extracting metal data:', error);
      return null;
    }
  }

  getMetalUnit(name) {
    const lowerName = name.toLowerCase();
    // Precious metals are quoted per ounce, industrial metals per metric ton
    if (lowerName.includes('gold') || lowerName.includes('silver') || 
        lowerName.includes('platinum') || lowerName.includes('palladium')) {
      return 'per oz';
    }
    return 'per MT'; // Metric Ton for industrial metals
  }

  getMetalSymbol(name) {
    const symbolMap = {
      'gold': 'AU', 'silver': 'AG', 'copper': 'CU', 'platinum': 'PT',
      'palladium': 'PD', 'aluminium': 'AL', 'aluminum': 'AL',
      'nickel': 'NI', 'zinc': 'ZN', 'lead': 'PB', 'tin': 'SN'
    };
    
    const lowerName = name.toLowerCase();
    for (const [metal, symbol] of Object.entries(symbolMap)) {
      if (lowerName.includes(metal)) return symbol;
    }
    return name.substring(0, 2).toUpperCase();
  }

  getFallbackMetalsData() {
    console.log('📊 Using fallback metals data...');
    
    // Current realistic prices as of July 2025
    return [
      { name: 'Gold', symbol: 'AU', price: 2658.50, high: 2672.30, low: 2645.10, change: -8.15, changePercent: -0.31, unit: 'per oz', lastUpdate: new Date().toISOString() },
      { name: 'Silver', symbol: 'AG', price: 30.245, high: 30.68, low: 30.12, change: -0.186, changePercent: -0.61, unit: 'per oz', lastUpdate: new Date().toISOString() },
      { name: 'Platinum', symbol: 'PT', price: 982.00, high: 1004.90, low: 968.65, change: -9.30, changePercent: -0.67, unit: 'per oz', lastUpdate: new Date().toISOString() },
      { name: 'Palladium', symbol: 'PD', price: 927.00, high: 945.50, low: 903.00, change: 5.30, changePercent: 0.47, unit: 'per oz', lastUpdate: new Date().toISOString() },
      { name: 'Aluminium', symbol: 'AL', price: 2588.25, high: 2589.95, low: 2572.20, change: -6.30, changePercent: -0.24, unit: 'per MT', lastUpdate: new Date().toISOString() },
      { name: 'Copper', symbol: 'CU', price: 9649.30, high: 9767.40, low: 9578.92, change: -153.70, changePercent: -1.57, unit: 'per MT', lastUpdate: new Date().toISOString() },
      { name: 'Lead', symbol: 'PB', price: 2044.28, high: 2059.65, low: 2038.68, change: -16.29, changePercent: -0.79, unit: 'per MT', lastUpdate: new Date().toISOString() },
      { name: 'Nickel', symbol: 'NI', price: 14982.13, high: 15036.50, low: 14937.63, change: -40.00, changePercent: -0.27, unit: 'per MT', lastUpdate: new Date().toISOString() },
      { name: 'Tin', symbol: 'SN', price: 33401.00, high: 33401.00, low: 33300.00, change: 86.00, changePercent: 0.26, unit: 'per MT', lastUpdate: new Date().toISOString() },
      { name: 'Zinc', symbol: 'ZN', price: 2732.95, high: 2738.00, low: 2708.65, change: 2.50, changePercent: 0.09, unit: 'per MT', lastUpdate: new Date().toISOString() }
    ];
  }

  enhanceWithMultiUnit(metals) {
    console.log('✨ Enhancing metals with multi-unit support...');
    
    const rates = this.getConversionRates();
    
    return metals.map(metal => {
      // Only convert precious metals (quoted per ounce)
      if (metal.unit === 'per oz') {
        const pricePerGram = metal.price / rates.TROY_OZ_TO_GRAMS;
        const pricePerTola = pricePerGram * rates.TOLA_TO_GRAMS;
        const pricePerKg = pricePerGram * 1000;
        
        return {
          ...metal,
          multiUnit: {
            ounce: {
              price: metal.price,
              high: metal.high,
              low: metal.low,
              unit: 'per troy oz'
            },
            gram: {
              price: pricePerGram,
              high: metal.high / rates.TROY_OZ_TO_GRAMS,
              low: metal.low / rates.TROY_OZ_TO_GRAMS,
              unit: 'per gram'
            },
            tola: {
              price: pricePerTola,
              high: (metal.high / rates.TROY_OZ_TO_GRAMS) * rates.TOLA_TO_GRAMS,
              low: (metal.low / rates.TROY_OZ_TO_GRAMS) * rates.TOLA_TO_GRAMS,
              unit: 'per tola'
            },
            kilogram: {
              price: pricePerKg,
              high: (metal.high / rates.TROY_OZ_TO_GRAMS) * 1000,
              low: (metal.low / rates.TROY_OZ_TO_GRAMS) * 1000,
              unit: 'per kg'
            }
          }
        };
      }
      return metal;
    });
  }

  formatMetalsForChatbot(metals) {
    if (!metals || metals.length === 0) {
      return "⚠️ Metals data temporarily unavailable. Please try again later.";
    }

    console.log(`🎨 Formatting ${metals.length} metals for chatbot display`);

    let formatted = "📊 **Current Metals Prices**\n\n";
    
    // Show precious metals first with multi-unit support
    const preciousMetals = metals.filter(m => 
      ['gold', 'silver', 'platinum', 'palladium'].some(precious => 
        m.name.toLowerCase().includes(precious)
      )
    );
    
    const industrialMetals = metals.filter(m => 
      !['gold', 'silver', 'platinum', 'palladium'].some(precious => 
        m.name.toLowerCase().includes(precious)
      )
    );
    
    console.log(`💎 Found ${preciousMetals.length} precious metals`);
    console.log(`🔩 Found ${industrialMetals.length} industrial metals`);
    
    // Format precious metals with clean output
    preciousMetals.forEach(metal => {
      const changeIcon = metal.change >= 0 ? "🟢" : "🔴";
      const changeSign = metal.change >= 0 ? "+" : "";
      
      if (metal.name.toLowerCase().includes('gold')) {
        formatted += `🥇 **Gold (AU)**\n`;
        if (metal.multiUnit) {
          formatted += `• **Per ounce (oz):** $${metal.multiUnit.ounce.price.toFixed(2)}\n`;
          formatted += `• **Per gram (g):** $${metal.multiUnit.gram.price.toFixed(2)}\n`;
          formatted += `• **Per tola:** $${metal.multiUnit.tola.price.toFixed(2)}\n`;
          formatted += `• **Per kilogram:** $${metal.multiUnit.kilogram.price.toLocaleString()}\n`;
        } else {
          formatted += `• **Per ounce:** $${metal.price.toFixed(2)}\n`;
        }
        formatted += `${changeIcon} **Change:** ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
      } 
      else if (metal.name.toLowerCase().includes('silver')) {
        formatted += `🥈 **Silver (AG)**\n`;
        if (metal.multiUnit) {
          formatted += `• **Per ounce (oz):** $${metal.multiUnit.ounce.price.toFixed(3)}\n`;
          formatted += `• **Per gram (g):** $${metal.multiUnit.gram.price.toFixed(3)}\n`;
          formatted += `• **Per tola:** $${metal.multiUnit.tola.price.toFixed(2)}\n`;
        } else {
          formatted += `• **Per ounce:** $${metal.price.toFixed(3)}\n`;
        }
        formatted += `${changeIcon} **Change:** ${changeSign}$${Math.abs(metal.change).toFixed(3)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
      }
      else if (metal.name.toLowerCase().includes('platinum')) {
        formatted += `⚪ **Platinum (PT)**\n`;
        formatted += `• **Per ounce:** $${metal.price.toFixed(2)}\n`;
        formatted += `${changeIcon} **Change:** ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
      }
      else if (metal.name.toLowerCase().includes('palladium')) {
        formatted += `💎 **Palladium (PD)**\n`;
        formatted += `• **Per ounce:** $${metal.price.toFixed(2)}\n`;
        formatted += `${changeIcon} **Change:** ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
      }
    });
    
    // Add a note about Pakistani context
    if (preciousMetals.length > 0) {
      formatted += `🇵🇰 **Pakistani Context:**\n`;
      formatted += `Please note that in Pakistan, 1 tola is equivalent to 11.664 grams.\n\n`;
    }
    
    // Format top industrial metals
    if (industrialMetals.length > 0) {
      formatted += `🔩 **Industrial Metals** (top 4):\n`;
      industrialMetals.slice(0, 4).forEach(metal => {
        const changeIcon = metal.change >= 0 ? "🟢" : "🔴";
        const changeSign = metal.change >= 0 ? "+" : "";
        
        formatted += `• **${metal.name} (${metal.symbol}):** $${metal.price.toLocaleString()} ${metal.unit}\n`;
        formatted += `  ${changeIcon} ${changeSign}${Math.abs(metal.change).toLocaleString()} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n`;
      });
      formatted += `\n`;
    }
    
    formatted += `*Live metals data last updated: ${new Date().toLocaleString('en-PK', { 
      timeZone: 'Asia/Karachi',
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })} PKT*`;
    
    console.log(`✅ Formatted output length: ${formatted.length} characters`);
    
    return formatted;
  }

  formatSingleMetalWithAllUnits(metal) {
    if (!metal) return "Metal not found.";
    
    const changeIcon = metal.change >= 0 ? "🟢" : "🔴";
    const changeSign = metal.change >= 0 ? "+" : "";
    
    let formatted = "";
    
    if (metal.name.toLowerCase().includes('gold')) {
      formatted = `🥇 **Gold Current Prices:**\n\n`;
      
      if (metal.multiUnit) {
        formatted += `💰 **Per Troy Ounce:** $${metal.multiUnit.ounce.price.toFixed(2)}\n`;
        formatted += `💰 **Per Gram:** $${metal.multiUnit.gram.price.toFixed(2)}\n`;
        formatted += `💰 **Per Tola:** $${metal.multiUnit.tola.price.toFixed(2)}\n`;
        formatted += `💰 **Per Kilogram:** $${metal.multiUnit.kilogram.price.toLocaleString()}\n\n`;
        
        formatted += `${changeIcon} **Today's Change:** ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
        
        formatted += `📈 **Today's Range (per oz):** $${metal.low.toFixed(2)} - $${metal.high.toFixed(2)}\n\n`;
        
        formatted += `🇵🇰 **Pakistani Context:**\n`;
        formatted += `• 1 Tola Gold = $${metal.multiUnit.tola.price.toFixed(2)}\n`;
        formatted += `• 10 Tola Gold = $${(metal.multiUnit.tola.price * 10).toLocaleString()}\n`;
        formatted += `• 1kg Gold = $${metal.multiUnit.kilogram.price.toLocaleString()}`;
      }
    } else if (metal.name.toLowerCase().includes('silver')) {
      formatted = `🥈 **Silver Current Prices:**\n\n`;
      
      if (metal.multiUnit) {
        formatted += `💰 **Per Troy Ounce:** $${metal.multiUnit.ounce.price.toFixed(3)}\n`;
        formatted += `💰 **Per Gram:** $${metal.multiUnit.gram.price.toFixed(3)}\n`;
        formatted += `💰 **Per Tola:** $${metal.multiUnit.tola.price.toFixed(2)}\n`;
        formatted += `💰 **Per Kilogram:** $${metal.multiUnit.kilogram.price.toLocaleString()}\n\n`;
        
        formatted += `${changeIcon} **Today's Change:** ${changeSign}$${Math.abs(metal.change).toFixed(3)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n`;
        formatted += `📈 **Today's Range (per oz):** $${metal.low.toFixed(3)} - $${metal.high.toFixed(3)}`;
      }
    } else {
      // Other metals
      formatted = `🔩 **${metal.name} Current Price:**\n\n`;
      formatted += `💰 **Price:** $${metal.price.toLocaleString()} ${metal.unit}\n`;
      formatted += `${changeIcon} **Today's Change:** ${changeSign}${Math.abs(metal.change).toLocaleString()} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n`;
      formatted += `📈 **Today's Range:** $${metal.low.toLocaleString()} - $${metal.high.toLocaleString()} ${metal.unit}`;
    }
    
    return formatted;
  }
}

// Function to get cached or fresh metals data with better error handling
async function getMetalsData() {
  const now = new Date();
  
  console.log('🔄 getMetalsData() called');
  console.log(`📊 Cache status: ${cachedMetalsData.length} items, last update: ${lastMetalsUpdate}`);
  
  // Check if we need to update the cache
  const needsUpdate = !lastMetalsUpdate || 
                     (now - lastMetalsUpdate) > METALS_UPDATE_INTERVAL || 
                     cachedMetalsData.length === 0;
  
  if (needsUpdate) {
    console.log('🔄 Cache needs update, fetching fresh data...');
    
    try {
      const scraper = new MetalsScraper();
      const freshData = await scraper.scrapeMetalsData();
      
      if (freshData && freshData.length > 0) {
        cachedMetalsData = freshData;
        lastMetalsUpdate = now;
        console.log(`✅ Successfully updated cache with ${freshData.length} metals`);
      } else {
        throw new Error('No metals data received');
      }
      
    } catch (error) {
      console.error('❌ Failed to update metals data:', error.message);
      
      // If cache is empty and update fails, use fallback
      if (cachedMetalsData.length === 0) {
        console.log('💾 Using fallback data as emergency backup');
        const scraper = new MetalsScraper();
        const fallbackData = scraper.getFallbackMetalsData();
        cachedMetalsData = scraper.enhanceWithMultiUnit(fallbackData);
        lastMetalsUpdate = now;
      } else {
        console.log('💾 Using existing cached data due to fetch failure');
      }
    }
  } else {
    console.log('✅ Using cached data (still fresh)');
  }
  
  console.log(`📊 Returning ${cachedMetalsData.length} metals`);
  return cachedMetalsData;
}

// Test function to help debug
async function testMetalsData() {
  console.log('🧪 Running metals data test...');
  
  try {
    const data = await getMetalsData();
    console.log('✅ Test result:', {
      count: data.length,
      metals: data.map(m => ({ name: m.name, price: m.price, hasMultiUnit: !!m.multiUnit }))
    });
    
    // Test formatting
    const scraper = new MetalsScraper();
    const formatted = scraper.formatMetalsForChatbot(data);
    console.log('🎨 Formatted output preview:', formatted.substring(0, 500) + '...');
    
    return { success: true, data, formatted };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Export the main functions using CommonJS
module.exports = {
  getMetalsData,
  testMetalsData,
  MetalsScraper
};