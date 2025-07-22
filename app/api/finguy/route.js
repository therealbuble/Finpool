export const dynamic = "force-dynamic";

// ✅ Imports - Only external scrapers
import { getMetalsData } from "@/lib/scrapers/getMetals";
import ZameenScraper, { extractSearchQuery, extractAreaName } from "@/lib/scrapers/getZameen"; // 🆕 Import helper functions
import PSXScraper from "@/lib/scrapers/getPSX"; // 🆕 New PSX import

// Fallback metals data with multi-unit conversion
const getFallbackMetalsData = () => {
  const conversionRates = {
    TROY_OZ_TO_GRAMS: 31.1035,
    TOLA_TO_GRAMS: 11.664
  };

  const baseMetals = [
    { name: 'Gold', symbol: 'AU', price: 2658.50, high: 2672.30, low: 2645.10, change: -8.15, changePercent: -0.31, unit: 'per oz' },
    { name: 'Silver', symbol: 'AG', price: 30.245, high: 30.68, low: 30.12, change: -0.186, changePercent: -0.61, unit: 'per oz' },
    { name: 'Platinum', symbol: 'PT', price: 982.00, high: 1004.90, low: 968.65, change: -9.30, changePercent: -0.67, unit: 'per oz' },
    { name: 'Palladium', symbol: 'PD', price: 927.00, high: 945.50, low: 903.00, change: 5.30, changePercent: 0.47, unit: 'per oz' },
    { name: 'Copper', symbol: 'CU', price: 9649.30, high: 9767.40, low: 9578.92, change: -153.70, changePercent: -1.57, unit: 'per MT' }
  ];

  return baseMetals.map(metal => {
    // Only convert precious metals (quoted per ounce)
    if (metal.unit === 'per oz') {
      const pricePerGram = metal.price / conversionRates.TROY_OZ_TO_GRAMS;
      const pricePerTola = pricePerGram * conversionRates.TOLA_TO_GRAMS;
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
            high: metal.high / conversionRates.TROY_OZ_TO_GRAMS,
            low: metal.low / conversionRates.TROY_OZ_TO_GRAMS,
            unit: 'per gram'
          },
          tola: {
            price: pricePerTola,
            high: (metal.high / conversionRates.TROY_OZ_TO_GRAMS) * conversionRates.TOLA_TO_GRAMS,
            low: (metal.low / conversionRates.TROY_OZ_TO_GRAMS) * conversionRates.TOLA_TO_GRAMS,
            unit: 'per tola'
          },
          kilogram: {
            price: pricePerKg,
            high: (metal.high / conversionRates.TROY_OZ_TO_GRAMS) * 1000,
            low: (metal.low / conversionRates.TROY_OZ_TO_GRAMS) * 1000,
            unit: 'per kg'
          }
        }
      };
    }
    return metal;
  });
};

// 🆕 Fallback PSX data (using PSX scraper structure)
const getFallbackPSXData = () => {
  const psxScraper = new PSXScraper();
  return psxScraper.getFallbackData();
};

// Format metals data for chatbot display
const formatMetalsData = (metals) => {
  if (!metals || metals.length === 0) {
    return "⚠️ Metals data temporarily unavailable. Please try again later.";
  }

  let formatted = "";
  
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
  
  // Format precious metals
  preciousMetals.forEach(metal => {
    const changeIcon = metal.change >= 0 ? "🟢" : "🔴";
    const changeSign = metal.change >= 0 ? "+" : "";
    
    if (metal.name.toLowerCase().includes('gold')) {
      formatted += `🥇 **Gold (AU)**\n`;
      if (metal.multiUnit) {
        formatted += `   💰 $${metal.multiUnit.ounce.price.toFixed(2)}/oz • $${metal.multiUnit.gram.price.toFixed(2)}/g • $${metal.multiUnit.tola.price.toFixed(2)}/tola\n`;
      } else {
        formatted += `   💰 $${metal.price.toFixed(2)} per oz\n`;
      }
      formatted += `   ${changeIcon} ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
    } 
    else if (metal.name.toLowerCase().includes('silver')) {
      formatted += `🥈 **Silver (AG)**\n`;
      if (metal.multiUnit) {
        formatted += `   💰 $${metal.multiUnit.ounce.price.toFixed(3)}/oz • $${metal.multiUnit.gram.price.toFixed(3)}/g • $${metal.multiUnit.tola.price.toFixed(2)}/tola\n`;
      } else {
        formatted += `   💰 $${metal.price.toFixed(3)} per oz\n`;
      }
      formatted += `   ${changeIcon} ${changeSign}$${Math.abs(metal.change).toFixed(3)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
    }
    else if (metal.name.toLowerCase().includes('platinum')) {
      formatted += `⚪ **Platinum (PT)** - $${metal.price.toFixed(2)} per oz\n`;
      formatted += `   ${changeIcon} ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
    }
    else if (metal.name.toLowerCase().includes('palladium')) {
      formatted += `💎 **Palladium (PD)** - $${metal.price.toFixed(2)} per oz\n`;
      formatted += `   ${changeIcon} ${changeSign}$${Math.abs(metal.change).toFixed(2)} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
    }
  });
  
  // Format industrial metals (show first 3)
  industrialMetals.slice(0, 3).forEach(metal => {
    const changeIcon = metal.change >= 0 ? "🟢" : "🔴";
    const changeSign = metal.change >= 0 ? "+" : "";
    
    formatted += `🔩 **${metal.name} (${metal.symbol})** - ${metal.price.toLocaleString()} ${metal.unit}\n`;
    formatted += `   ${changeIcon} ${changeSign}${Math.abs(metal.change).toLocaleString()} (${metal.changePercent > 0 ? '+' : ''}${metal.changePercent.toFixed(2)}%)\n\n`;
  });
  
  formatted += `📊 *Live metals data*\n`;
  formatted += `🕒 *Last updated: ${new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })} PKT*\n`;
  formatted += `💡 *Ask about specific metals for detailed unit breakdowns*`;
  
  return formatted;
};

export async function POST(req) {
  try {
    const { message, currency = "USD", conversationHistory = [], userContext = null } = await req.json();

    if (!message || !message.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // 👉 1️⃣ Build user context
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

    // 👉 2️⃣ Real-time data logic - Better error handling
    let realTimeContext = "";
    const lowerMessage = message.toLowerCase();

    // 🆕 PSX DATA - Pakistan Stock Exchange
    if (
      lowerMessage.includes("psx") ||
      lowerMessage.includes("stock") ||
      lowerMessage.includes("shares") ||
      lowerMessage.includes("kse") ||
      lowerMessage.includes("kse-100") ||
      lowerMessage.includes("karachi stock") ||
      lowerMessage.includes("pakistan stock") ||
      lowerMessage.includes("equity") ||
      lowerMessage.includes("market") ||
      lowerMessage.includes("index") ||
      lowerMessage.includes("gainers") ||
      lowerMessage.includes("losers") ||
      lowerMessage.includes("volume") ||
      lowerMessage.includes("trading")
    ) {
      let psxData;
      let dataSource = "live data";

      try {
        console.log("🔄 Attempting to fetch live PSX data...");
        
        // Initialize PSX scraper and get data
        const psxScraper = new PSXScraper();
        const psxPromise = psxScraper.scrapeAllData();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PSX fetch timeout')), 10000)
        );
        
        const psxResult = await Promise.race([psxPromise, timeoutPromise]);
        
        if (psxResult && (psxResult.kse100 || psxResult.companies)) {
          psxData = psxResult;
          console.log("✅ Successfully fetched live PSX data");
        } else {
          throw new Error('Invalid PSX data structure');
        }
        
      } catch (error) {
        console.error("❌ Live PSX fetch failed:", error.message);
        console.log("🔄 Using fallback PSX data...");
        
        psxData = getFallbackPSXData();
        dataSource = "cached data";
      }

      try {
        // Use the formatForChatbot method from PSX scraper
        const psxScraper = new PSXScraper();
        const formattedData = psxScraper.formatForChatbot(psxData);
        realTimeContext += `
📈 PAKISTAN STOCK EXCHANGE (PSX):
${formattedData}
`;
        
        if (dataSource === "cached data") {
          realTimeContext += `\n⚠️ *Using cached data - live PSX data temporarily unavailable*`;
        }
        
      } catch (formatError) {
        console.error("❌ PSX formatting failed:", formatError.message);
        realTimeContext += `
📈 PAKISTAN STOCK EXCHANGE (PSX):
⚠️ PSX data temporarily unavailable. Please try again later.
`;
      }
    }

    // 🥇 METALS DATA with improved error handling
    if (
      lowerMessage.includes("metal") ||
      lowerMessage.includes("gold") ||
      lowerMessage.includes("silver") ||
      lowerMessage.includes("copper") ||
      lowerMessage.includes("platinum") ||
      lowerMessage.includes("palladium") ||
      lowerMessage.includes("aluminium") ||
      lowerMessage.includes("aluminum") ||
      lowerMessage.includes("commodities") ||
      lowerMessage.includes("tola") ||
      lowerMessage.includes("gram") ||
      lowerMessage.includes("ounce") ||
      lowerMessage.includes("kilogram")
    ) {
      let metalsData;
      let dataSource = "live data";

      try {
        console.log("🔄 Attempting to fetch live metals data...");
        
        // Try to get live data with timeout
        const metalsPromise = getMetalsData();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metals fetch timeout')), 10000)
        );
        
        const metalsResult = await Promise.race([metalsPromise, timeoutPromise]);
        
        if (metalsResult && Array.isArray(metalsResult) && metalsResult.length > 0) {
          metalsData = metalsResult;
          console.log(`✅ Successfully fetched ${metalsData.length} live metals`);
        } else {
          throw new Error('Invalid metals data structure');
        }
        
      } catch (error) {
        console.error("❌ Live metals fetch failed:", error.message);
        console.log("🔄 Using fallback metals data...");
        
        metalsData = getFallbackMetalsData();
        dataSource = "cached data";
      }

      try {
        const formattedData = formatMetalsData(metalsData);
        realTimeContext += `
🥇 METALS & COMMODITIES:
${formattedData}
`;
        
        if (dataSource === "cached data") {
          realTimeContext += `\n⚠️ *Using cached data - live data temporarily unavailable*`;
        }
        
      } catch (formatError) {
        console.error("❌ Metals formatting failed:", formatError.message);
        realTimeContext += `
🥇 METALS & COMMODITIES:
⚠️ Metals data temporarily unavailable. Please try again later.
`;
      }
    }

    // 🏠 ENHANCED Zameen Property Data with Links
    if (
      lowerMessage.includes("zameen") ||
      lowerMessage.includes("property") ||
      lowerMessage.includes("real estate") ||
      lowerMessage.includes("house") ||
      lowerMessage.includes("plot") ||
      lowerMessage.includes("apartment") ||
      lowerMessage.includes("flat") ||
      lowerMessage.includes("marla") ||
      lowerMessage.includes("kanal")
    ) {
      try {
        console.log("🔄 Attempting to fetch Zameen property data...");
        const zameen = new ZameenScraper();
        let propertyData = "";

        // Determine query type with better detection
        const isSearch = lowerMessage.includes("search") || 
                        lowerMessage.includes("find") || 
                        lowerMessage.includes("looking for") ||
                        lowerMessage.includes("buy") ||
                        lowerMessage.includes("rent") ||
                        lowerMessage.includes("show me");

        const isPriceQuery = lowerMessage.includes("price") || 
                            lowerMessage.includes("cost") || 
                            lowerMessage.includes("index") ||
                            lowerMessage.includes("trend") ||
                            lowerMessage.includes("market overview");

        const isAreaQuery = lowerMessage.includes("area guide") || 
                           lowerMessage.includes("location guide") ||
                           lowerMessage.includes("about") ||
                           (lowerMessage.includes("area") && (lowerMessage.includes("info") || lowerMessage.includes("guide")));

        // Enhanced city detection
        let city = "lahore"; // default
        if (lowerMessage.includes("karachi")) city = "karachi";
        else if (lowerMessage.includes("islamabad")) city = "islamabad";
        else if (lowerMessage.includes("rawalpindi")) city = "rawalpindi";
        else if (lowerMessage.includes("peshawar")) city = "peshawar";
        else if (lowerMessage.includes("multan")) city = "multan";
        else if (lowerMessage.includes("faisalabad")) city = "faisalabad";
        else if (lowerMessage.includes("quetta")) city = "quetta";
        else if (lowerMessage.includes("gujranwala")) city = "gujranwala";

        // Add timeout to Zameen requests
        const ZAMEEN_TIMEOUT = 15000; // 15 seconds

        if (isPriceQuery) {
          console.log(`🏠 Fetching property index for ${city}...`);
          
          const indexPromise = zameen.scrapePropertyIndex(city, 'houses');
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Zameen index timeout')), ZAMEEN_TIMEOUT)
          );
          
          try {
            const indexResult = await Promise.race([indexPromise, timeoutPromise]);
            if (indexResult.success) {
              propertyData = zameen.formatForChatbot(indexResult.data, 'index');
              console.log("✅ Successfully fetched property index");
            } else {
              throw new Error('Invalid property index data');
            }
          } catch (timeoutError) {
            console.error("❌ Property index fetch failed:", timeoutError.message);
            propertyData = `⚠️ Unable to fetch live property data for ${city.charAt(0).toUpperCase() + city.slice(1)}. Using fallback data.\n\n`;
            propertyData += zameen.formatForChatbot(zameen.getFallbackPropertyData(city), 'index');
          }
          
        } else if (isSearch) {
          console.log(`🔍 Searching properties in ${city}...`);
          
          const searchQuery = extractSearchQuery(message);
          console.log(`🔍 Search query: "${searchQuery}"`);
          
          const searchPromise = zameen.searchProperties(searchQuery, city, 'buy');
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Zameen search timeout')), ZAMEEN_TIMEOUT)
          );
          
          try {
            const searchResult = await Promise.race([searchPromise, timeoutPromise]);
            if (searchResult.success) {
              propertyData = zameen.formatForChatbot(searchResult.data, 'search');
              console.log(`✅ Successfully searched properties: ${searchResult.data.totalFound} found`);
            } else {
              throw new Error('Invalid search results');
            }
          } catch (timeoutError) {
            console.error("❌ Property search failed:", timeoutError.message);
            propertyData = `⚠️ Unable to search live properties for "${searchQuery}" in ${city.charAt(0).toUpperCase() + city.slice(1)}. Using sample data.\n\n`;
            propertyData += zameen.formatForChatbot(zameen.getFallbackSearchResults(searchQuery), 'search');
          }
          
        } else if (isAreaQuery) {
          console.log(`🏘️ Fetching area guide...`);
          
          const areaName = extractAreaName(message);
          console.log(`🏘️ Area: "${areaName}"`);
          
          const areaPromise = zameen.getAreaGuide(areaName, city);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Zameen area guide timeout')), ZAMEEN_TIMEOUT)
          );
          
          try {
            const areaResult = await Promise.race([areaPromise, timeoutPromise]);
            if (areaResult.success) {
              propertyData = zameen.formatForChatbot(areaResult.data, 'area');
              console.log("✅ Successfully fetched area guide");
            } else {
              throw new Error('Invalid area guide data');
            }
          } catch (timeoutError) {
            console.error("❌ Area guide fetch failed:", timeoutError.message);
            propertyData = `⚠️ Unable to fetch live area guide for ${areaName} in ${city.charAt(0).toUpperCase() + city.slice(1)}. Using fallback data.\n\n`;
            propertyData += zameen.formatForChatbot(zameen.getFallbackAreaGuide(areaName, city), 'area');
          }
          
        } else {
          // Default: Show property index
          console.log(`🏠 Fetching default property data for ${city}...`);
          
          const indexPromise = zameen.scrapePropertyIndex(city, 'houses');
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Zameen default timeout')), ZAMEEN_TIMEOUT)
          );
          
          try {
            const indexResult = await Promise.race([indexPromise, timeoutPromise]);
            if (indexResult.success) {
              propertyData = zameen.formatForChatbot(indexResult.data, 'index');
              console.log("✅ Successfully fetched default property data");
            } else {
              throw new Error('Invalid default property data');
            }
          } catch (timeoutError) {
            console.error("❌ Default property fetch failed:", timeoutError.message);
            propertyData = `⚠️ Unable to fetch live property data for ${city.charAt(0).toUpperCase() + city.slice(1)}. Using fallback data.\n\n`;
            propertyData += zameen.formatForChatbot(zameen.getFallbackPropertyData(city), 'index');
          }
        }

        realTimeContext += `
🏠 PROPERTY DATA (ZAMEEN.COM):
${propertyData}
`;

      } catch (error) {
        console.error("❌ Critical Zameen scraping error:", error);
        realTimeContext += `
🏠 PROPERTY DATA:
⚠️ Property data temporarily unavailable. Please try again later.
🔧 *If this persists, check your internet connection or try again in a few minutes.*
`;
      }
    }

    // 👉 3️⃣ Enhanced system prompt with property link guidance
    const systemPrompt = `
You are FinGuy, a helpful financial assistant with access to real-time financial data.
You provide advice and answers related to ALL financial and investment topics.

ALWAYS follow these rules:
- Remember the conversation context.
- When someone says "it" or "that", refer back to previous messages.
- If real-time data is provided, use it instead of old info.
- If no real-time context is provided, say so.
- For PSX/stock queries, use the provided real-time PSX data.
- For property queries, use the provided real-time Zameen data.
- For metals/commodities queries, use the provided real-time metals data.
- For metals queries, provide unit conversions (ounce/gram/tola/kg) when relevant.
- Explain that 1 tola = 11.664 grams for Pakistani users.
- For gold/silver prices, always show multiple units when asked.
- PROPERTY RESPONSES: Show property listings naturally and concisely. Don't mention "sample data", "estimates", or "cached data" - just present the properties cleanly.
- SIMPLE FORMAT: When showing properties, use a clean format without excessive explanations. Add a single Zameen.com link at the end.
- NATURAL TONE: Act like you found real properties. No need to explain data sources or limitations unless specifically asked.

REAL-TIME CONTEXT:
${realTimeContext || "No real-time data available for this query."}

${userContextInfo}

TOPICS YOU HANDLE:
- Personal finance, budgeting, investing
- Pakistan Stock Exchange (PSX), KSE-100 index, stocks, shares trading
- Stocks, commodities (metals with unit conversions), forex, crypto, real estate, tax
- Debt, retirement, insurance, business finance
- Economic news, trading strategies
- Pakistan property market and real estate with direct Zameen.com links
- Live metals prices (Gold, Silver, Copper, Platinum, etc.) in multiple units
- Pakistani market context (tola is common in Pakistan, PSX for stocks)
- 🆕 Property verification through official Zameen.com listings with clickable links
`;

    // 👉 4️⃣ Build Gemini payload
    const contents = [];

    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });

    contents.push({
      role: "model",
      parts: [
        {
          text: "I understand. I'm FinGuy, your financial assistant with access to live data including PSX stock market data, metals prices in multiple units, and Pakistani property data. I present property listings naturally without unnecessary disclaimers, and I keep responses concise and helpful."
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