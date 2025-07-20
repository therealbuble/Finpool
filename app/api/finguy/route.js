export const dynamic = "force-dynamic";

// ✅ Imports
import { convertCurrency } from "@/lib/utils/convertCurrency";
import { getMetalsPrices } from "@/lib/scrapers/getMetals";
import { getPSXData } from "@/lib/scrapers/getPSX";
import ZameenScraper from "@/lib/scrapers/getZameen";
import metalsScraper from "@/lib/scrapers/metalsScraper"; // Enhanced scraper

export async function POST(req) {
  try {
    const { message, currency = "USD", conversationHistory = [], userContext = null } = await req.json();

    if (!message || !message.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // 👉 1️⃣ Build user context (unchanged)
    let userContextInfo = "";
    if (userContext?.accounts && userContext?.transactions) {
      const { accounts, transactions } = userContext;

      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      const totalTransactions = transactions.length;
      const recentExpenses = transactions
        .filter(t => t.type === "EXPENSE")
        .slice(0, 5)
        .reduce((sum, t) => sum + t.amount, 0);

      const categorySpending = {};
      transactions
        .filter(t => t.type === "EXPENSE")
        .slice(0, 10)
        .forEach(t => {
          categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

      const topCategories = Object.entries(categorySpending)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, amount]) => `${cat}: ${amount.toFixed(2)}`)
        .join(", ");

      userContextInfo = `
USER FINANCIAL CONTEXT:
- Total Account Balance: ${totalBalance.toFixed(2)}
- Number of Accounts: ${accounts.length}
- Account Types: ${accounts.map(acc => `${acc.name} (${acc.type})`).join(", ")}
- Recent Transactions: ${totalTransactions} total
- Recent Expenses (last 5): ${recentExpenses.toFixed(2)}
- Top Spending Categories: ${topCategories || "No spending data"}
- Default Account: ${accounts.find(acc => acc.isDefault)?.name || "None"}
`;
    }

    // 👉 2️⃣ Enhanced real-time data logic
    let realTimeContext = "";
    const lowerMessage = message.toLowerCase();

    // 💰 Currency switch check
    const wantsCurrency = lowerMessage.includes("in pkr") || lowerMessage.includes("in aed");
    let targetCurrency = "USD";
    if (lowerMessage.includes("in pkr")) targetCurrency = "PKR";
    else if (lowerMessage.includes("in aed")) targetCurrency = "AED";

    // 🧠 Enhanced Metals Data with fallback
    const metalsKeywords = ["gold", "silver", "metal", "platinum", "palladium", "copper", "aluminum", "nickel", "lead", "zinc", "tin"];
    const metalsQuery = metalsKeywords.some(word => lowerMessage.includes(word));

    if (metalsQuery || wantsCurrency) {
      let metals = {};
      let dataSource = "";
      
      try {
        // 🚀 Try enhanced scraper first
        await metalsScraper.ensureFreshData();
        const scrapedData = metalsScraper.getData();
        
        if (scrapedData && scrapedData.metals && scrapedData.metals.length > 0) {
          // Convert scraped data to expected format
          scrapedData.metals.forEach(metal => {
            metals[metal.name] = metal.last.toFixed(2);
          });
          dataSource = "Enhanced Live Data";
          
          realTimeContext += `📈 METALS PRICES (${targetCurrency}) - ${dataSource}:\n`;
          realTimeContext += `🕒 Last Updated: ${new Date(scrapedData.lastUpdate).toLocaleTimeString()}\n`;
          realTimeContext += `⏱️ Data Age: ${metalsScraper.getDataAge()} minutes\n\n`;

        } else {
          throw new Error("No data from enhanced scraper");
        }
      } catch (error) {
        console.warn("Enhanced scraper failed, falling back to original:", error.message);
        
        // 🔄 Fallback to original scraper
        try {
          metals = await getMetalsPrices();
          dataSource = "Fallback Data";
          realTimeContext += `📈 METALS PRICES (${targetCurrency}) - ${dataSource}:\n`;
        } catch (fallbackError) {
          console.error("Both scrapers failed:", fallbackError.message);
          realTimeContext += `⚠️ METALS DATA TEMPORARILY UNAVAILABLE\n`;
          metals = {};
        }
      }

      // Process and display metals data
      for (const [metal, priceText] of Object.entries(metals)) {
        const price = parseFloat(priceText.toString().replace(/,/g, ""));
        if (!isNaN(price) && price > 0) {
          let displayPrice = `USD ${price.toLocaleString()}`;
          
          if (targetCurrency !== "USD") {
            try {
              const converted = await convertCurrency(price, "USD", targetCurrency);
              if (converted) {
                displayPrice = `${targetCurrency} ${converted.toLocaleString()}`;
              }
            } catch (conversionError) {
              console.warn(`Currency conversion failed for ${metal}:`, conversionError.message);
              displayPrice += ` (${targetCurrency} conversion unavailable)`;
            }
          }
          realTimeContext += `- ${metal}: ${displayPrice}\n`;
        }
      }

      if (Object.keys(metals).length > 0) {
        realTimeContext += `\n💱 Want prices in another currency (PKR, AED)? Just say: "Show in PKR" or "AED".\n`;
        realTimeContext += `🔄 Auto-updates every 30 minutes for accuracy.\n`;
      }
    }

    // 📊 PSX (unchanged)
    if (
      lowerMessage.includes("psx") ||
      lowerMessage.includes("kse") ||
      lowerMessage.includes("stocks")
    ) {
      try {
        const psx = await getPSXData();
        realTimeContext += `
📊 PAKISTAN STOCK EXCHANGE:
- KSE-100 Index: ${psx.kse100}
- Change: ${psx.change}
`;
      } catch (error) {
        console.error("PSX data fetch failed:", error.message);
        realTimeContext += `
📊 PAKISTAN STOCK EXCHANGE:
⚠️ Stock market data temporarily unavailable.
`;
      }
    }

    // 🏠 Zameen Property Data (unchanged)
    if (
      lowerMessage.includes("zameen") ||
      lowerMessage.includes("property") ||
      lowerMessage.includes("real estate") ||
      lowerMessage.includes("house") ||
      lowerMessage.includes("plot") ||
      lowerMessage.includes("apartment") ||
      lowerMessage.includes("flat")
    ) {
      try {
        const zameen = new ZameenScraper();
        let propertyData = "";

        // Detect what type of property query this is
        const isSearch = lowerMessage.includes("search") || 
                        lowerMessage.includes("find") || 
                        lowerMessage.includes("looking for") ||
                        lowerMessage.includes("buy") ||
                        lowerMessage.includes("rent");

        const isPriceQuery = lowerMessage.includes("price") || 
                            lowerMessage.includes("cost") || 
                            lowerMessage.includes("index") ||
                            lowerMessage.includes("trend");

        const isAreaQuery = lowerMessage.includes("area") || 
                           lowerMessage.includes("location") ||
                           lowerMessage.includes("guide");

        // Extract city from message (default to lahore)
        let city = "lahore";
        if (lowerMessage.includes("karachi")) city = "karachi";
        else if (lowerMessage.includes("islamabad")) city = "islamabad";
        else if (lowerMessage.includes("rawalpindi")) city = "rawalpindi";
        else if (lowerMessage.includes("peshawar")) city = "peshawar";
        else if (lowerMessage.includes("multan")) city = "multan";
        else if (lowerMessage.includes("faisalabad")) city = "faisalabad";

        if (isPriceQuery) {
          const indexResult = await zameen.scrapePropertyIndex(city, 'houses');
          if (indexResult.success) {
            propertyData = zameen.formatForChatbot(indexResult.data, 'index');
          } else {
            propertyData = "⚠️ Unable to fetch property price index at the moment.";
          }
        } else if (isSearch) {
          const searchQuery = extractSearchQuery(message);
          const searchResult = await zameen.searchProperties(searchQuery, city, 'buy');
          if (searchResult.success) {
            propertyData = zameen.formatForChatbot(searchResult.data, 'search');
          } else {
            propertyData = "⚠️ Unable to search properties at the moment.";
          }
        } else if (isAreaQuery) {
          const areaName = extractAreaName(message);
          const areaResult = await zameen.getAreaGuide(areaName, city);
          if (areaResult.success) {
            propertyData = `🏘️ **${areaResult.data.name} Area Guide**\n\n`;
            propertyData += `📍 **Location:** ${areaResult.data.city}\n`;
            propertyData += `💰 **Average Price:** ${areaResult.data.averagePrice}\n`;
            propertyData += `📝 **Overview:** ${areaResult.data.overview.substring(0, 200)}...\n`;
            if (areaResult.data.amenities.length > 0) {
              propertyData += `🏪 **Amenities:** ${areaResult.data.amenities.slice(0, 5).join(", ")}\n`;
            }
          } else {
            propertyData = "⚠️ Unable to fetch area guide at the moment.";
          }
        } else {
          const indexResult = await zameen.scrapePropertyIndex(city, 'houses');
          if (indexResult.success) {
            propertyData = zameen.formatForChatbot(indexResult.data, 'index');
          } else {
            propertyData = "⚠️ Unable to fetch property data at the moment.";
          }
        }

        realTimeContext += `
🏠 PROPERTY DATA:
${propertyData}
`;

      } catch (error) {
        console.error("Zameen scraping error:", error);
        realTimeContext += `
🏠 PROPERTY DATA:
⚠️ Property data temporarily unavailable. Please try again later.
`;
      }
    }

    // ✅ Enhanced "Tola Gold" handling with better error handling
    if (lowerMessage.includes("tola") && lowerMessage.includes("gold")) {
      try {
        let goldPrice = 0;
        let dataSource = "";

        // Try enhanced scraper first
        try {
          await metalsScraper.ensureFreshData();
          const goldData = metalsScraper.getMetal('XAU') || metalsScraper.getMetal('Gold');
          if (goldData && goldData.last > 0) {
            goldPrice = goldData.last;
            dataSource = "Enhanced Live Data";
          } else {
            throw new Error("No gold data from enhanced scraper");
          }
        } catch (error) {
          // Fallback to original scraper
          const metals = await getMetalsPrices();
          const goldPriceText = metals["Gold"];
          goldPrice = parseFloat(goldPriceText?.replace(/,/g, "") || "0");
          dataSource = "Fallback Data";
        }

        if (goldPrice > 0) {
          const tolaInGrams = 11.6638;
          const ounceInGrams = 28.3495;
          const usdToPkrRate = await convertCurrency(1, "USD", "PKR");

          if (usdToPkrRate) {
            const priceInPKR = ((goldPrice / ounceInGrams) * tolaInGrams) * usdToPkrRate;

            return Response.json({
              reply: `🇵🇰 1 Tola Gold Price in PKR (${dataSource}):
- Gold Price (USD/oz): $${goldPrice.toLocaleString()}
- USD to PKR: ${usdToPkrRate.toFixed(2)}
- 1 Tola ≈ ${priceInPKR.toLocaleString(undefined, { maximumFractionDigits: 2 })} PKR

📊 Data automatically updates every 30 minutes for accuracy.`
            });
          } else {
            throw new Error("Currency conversion failed");
          }
        } else {
          throw new Error("Invalid gold price");
        }
      } catch (error) {
        console.error("Tola gold calculation error:", error.message);
        return Response.json({
          reply: `⚠️ Couldn't fetch live gold price or convert currency. Please try again later.`
        });
      }
    }

    // 👉 3️⃣ Enhanced system prompt
    const systemPrompt = `
You are FinGuy, a helpful financial assistant with access to real-time financial data.
You provide advice and answers related to ALL financial and investment topics.

ALWAYS follow these rules:
- Remember the conversation context.
- When someone says "it" or "that", refer back to previous messages.
- If real-time data is provided, use it instead of old info.
- If no real-time context is provided, say so.
- For property queries, use the provided real-time Zameen data.
- Metals data is auto-updated every 30 minutes for maximum accuracy.

REAL-TIME CONTEXT:
${realTimeContext || "No real-time data available for this query."}

${userContextInfo}

TOPICS YOU HANDLE:
- Personal finance, budgeting, investing
- Stocks, commodities (gold, silver, oil)
- Forex, crypto, real estate, tax
- Debt, retirement, insurance, business finance
- Economic news, trading strategies
- Pakistan property market and real estate
- Live metals pricing with automatic updates
`;

    // 👉 4️⃣ Build Gemini payload (unchanged)
    const contents = [];

    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });

    contents.push({
      role: "model",
      parts: [
        {
          text: "I understand. I'm FinGuy, your financial assistant with access to live data. I will always keep context and use real-time data when available, including enhanced metals pricing and property data."
        }
      ]
    });

    conversationHistory.forEach(msg => {
      if (msg.text.includes("👋 Hi, I'm FinGuy!") || msg.text.includes("I understand. I'm FinGuy")) return;
      contents.push({
        role: msg.role === "bot" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    });

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // 👉 5️⃣ Send to Gemini with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024
            }
          })
        }
      );

      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        console.error("Gemini API error:", geminiRes.status, geminiRes.statusText);
        return Response.json({ reply: "⚠️ Gemini API error. Please try again later." }, { status: 200 });
      }

      const data = await geminiRes.json();

      if (data.error) {
        console.error("Gemini API returned error:", data.error);
        return Response.json({ reply: "⚠️ Gemini error. Try again." }, { status: 200 });
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ I didn't get that. Can you ask again?";
      return Response.json({ reply });

    } catch (geminiError) {
      clearTimeout(timeoutId);
      if (geminiError.name === "AbortError") {
        return Response.json({ reply: "⚠️ Request timeout. Try a shorter question." }, { status: 200 });
      }
      throw geminiError;
    }

  } catch (err) {
    console.error("FinGuy API error:", err);
    if (err.name === "AbortError") {
      return Response.json({ reply: "⚠️ Request timeout. Try a shorter question." }, { status: 200 });
    }
    return Response.json({ reply: "⚠️ Technical issue. Try again shortly." }, { status: 200 });
  }
}

// Helper functions (unchanged)
function extractSearchQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  const filterWords = ['find', 'search', 'looking', 'for', 'buy', 'rent', 'property', 'house', 'plot', 'apartment', 'flat', 'in', 'at'];
  
  const words = message.split(' ').filter(word => {
    const lowerWord = word.toLowerCase();
    return !filterWords.includes(lowerWord) && word.length > 2;
  });
  
  return words.slice(0, 3).join(' ') || 'DHA';
}

function extractAreaName(message) {
  const lowerMessage = message.toLowerCase();
  
  const filterWords = ['area', 'guide', 'location', 'about', 'tell', 'me', 'info', 'information', 'in', 'at'];
  
  const words = message.split(' ').filter(word => {
    const lowerWord = word.toLowerCase();
    return !filterWords.includes(lowerWord) && word.length > 2;
  });
  
  return words[0] || 'DHA';
}

// ---

// /lib/scrapers/metalsScraper.js - Put this in your lib/scrapers directory
import axios from 'axios';
import * as cheerio from 'cheerio';

class MetalsScraper {
  constructor() {
    this.data = null;
    this.lastUpdate = null;
    this.isRunning = false;
    this.updateInterval = null;
    this.baseUrl = 'https://www.investing.com/commodities/metals';
  }

  // Parse metals data from HTML
  parseMetalsData($) {
    const metals = [];
    
    // Multiple selectors for different page layouts
    const selectors = [
      '#cross_rate_markets_stocks_1 tbody tr',
      '.genTbl tbody tr', 
      '[data-test="instrument-table"] tbody tr',
      '.js-table-wrapper tbody tr',
      'table tbody tr'
    ];
    
    for (const selector of selectors) {
      const rows = $(selector);
      if (rows.length > 0) {
        rows.each((index, element) => {
          const row = $(element);
          const cells = row.find('td');
          
          if (cells.length >= 7) {
            const nameCell = cells.eq(1);
            const name = nameCell.find('a').text().trim() || nameCell.text().trim();
            
            // Skip if no valid name
            if (!name || name.length < 2) return;
            
            const metal = {
              name: this.cleanMetalName(name),
              symbol: this.extractSymbol(name),
              last: this.parsePrice(cells.eq(2).text().trim()),
              high: this.parsePrice(cells.eq(3).text().trim()),
              low: this.parsePrice(cells.eq(4).text().trim()),
              change: this.parsePrice(cells.eq(5).text().trim()),
              changePercent: cells.eq(6).text().trim(),
              time: cells.eq(7) ? cells.eq(7).text().trim() : new Date().toLocaleTimeString(),
              timestamp: new Date().toISOString()
            };
            
            // Validate the metal data
            if (this.isValidMetal(metal)) {
              metals.push(metal);
            }
          }
        });
        
        if (metals.length > 0) break; // Found data with this selector
      }
    }
    
    return metals;
  }

  // Clean metal name
  cleanMetalName(name) {
    return name
      .replace(/derived/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract symbol from metal name
  extractSymbol(name) {
    const symbolMap = {
      'Gold': 'XAU',
      'Silver': 'XAG',
      'Copper': 'HG',
      'Platinum': 'XPT',
      'Palladium': 'XPD',
      'Aluminum': 'ALU',
      'Aluminium': 'ALU',
      'Nickel': 'NI',
      'Lead': 'PB',
      'Zinc': 'ZN',
      'Tin': 'SN'
    };
    
    for (const [metal, symbol] of Object.entries(symbolMap)) {
      if (name.toLowerCase().includes(metal.toLowerCase())) {
        return symbol;
      }
    }
    
    return name.substring(0, 3).toUpperCase();
  }

  // Parse price string to number
  parsePrice(priceStr) {
    if (!priceStr) return 0;
    
    // Remove currency symbols and commas
    const cleaned = priceStr.replace(/[$,\s€£¥]/g, '');
    const number = parseFloat(cleaned);
    
    return isNaN(number) ? 0 : number;
  }

  // Validate metal data
  isValidMetal(metal) {
    return metal.name && 
           metal.last > 0 && 
           !isNaN(metal.last) &&
           metal.name.length > 1;
  }

  // Scrape metals data
  async scrapeMetals() {
    try {
      console.log(`[${new Date().toISOString()}] Starting metals data scrape...`);
      
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const metals = this.parseMetalsData($);

      if (metals.length === 0) {
        throw new Error('No metals data found - page structure may have changed');
      }

      this.data = {
        metals: metals,
        lastUpdate: new Date().toISOString(),
        totalCount: metals.length,
        source: 'investing.com'
      };

      this.lastUpdate = new Date();
      console.log(`[${new Date().toISOString()}] Successfully scraped ${metals.length} metals`);
      
      return this.data;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scraping error:`, error.message);
      throw error;
    }
  }

  // Get current data
  getData() {
    return this.data;
  }

  // Get specific metal data
  getMetal(symbol) {
    if (!this.data || !this.data.metals) return null;
    
    return this.data.metals.find(metal => 
      metal.symbol.toLowerCase() === symbol.toLowerCase() ||
      metal.name.toLowerCase().includes(symbol.toLowerCase())
    );
  }

  // Get data age in minutes
  getDataAge() {
    if (!this.lastUpdate) return Infinity;
    return Math.floor((new Date() - this.lastUpdate) / (1000 * 60));
  }

  // Check if data is fresh (less than 35 minutes old)
  isDataFresh() {
    return this.getDataAge() < 35;
  }

  // Force update if data is stale
  async ensureFreshData() {
    if (!this.isDataFresh()) {
      console.log('Data is stale, forcing update...');
      await this.scrapeMetals();
    }
    return this.data;
  }

  // Start auto-update (call this in your app initialization)
  startAutoUpdate() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting metals auto-update every 30 minutes...');

    // Initial scrape
    this.scrapeMetals().catch(error => {
      console.error('Initial metals scrape failed:', error.message);
    });

    // Set interval for updates (30 minutes)
    this.updateInterval = setInterval(async () => {
      try {
        await this.scrapeMetals();
      } catch (error) {
        console.error('Scheduled metals scrape failed:', error.message);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Stop auto-update
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('Metals auto-update stopped');
  }
}

// Export singleton instance
const metalsScraper = new MetalsScraper();
export default metalsScraper;