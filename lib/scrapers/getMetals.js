// metalsScraper.js - Main scraper service
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

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
    
    // Look for the metals table - adjust selector based on actual HTML structure
    $('#cross_rate_markets_stocks_1 tbody tr, .genTbl tbody tr, [data-test="instrument-table"] tbody tr').each((index, element) => {
      const row = $(element);
      const cells = row.find('td');
      
      if (cells.length >= 7) {
        const nameCell = cells.eq(1);
        const name = nameCell.find('a').text().trim() || nameCell.text().trim();
        
        // Skip if no valid name
        if (!name || name.length < 2) return;
        
        const metal = {
          name: name,
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
    
    return metals;
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
    const cleaned = priceStr.replace(/[$,\s]/g, '');
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

  // Start automatic updates every 30 minutes
  startAutoUpdate() {
    if (this.isRunning) {
      console.log('Auto-update is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting auto-update every 30 minutes...');

    // Initial scrape
    this.scrapeMetals().catch(error => {
      console.error('Initial scrape failed:', error.message);
    });

    // Schedule updates every 30 minutes
    this.updateInterval = cron.schedule('*/30 * * * *', async () => {
      try {
        await this.scrapeMetals();
      } catch (error) {
        console.error('Scheduled scrape failed:', error.message);
      }
    });
  }

  // Stop automatic updates
  stopAutoUpdate() {
    if (this.updateInterval) {
      this.updateInterval.destroy();
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('Auto-update stopped');
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
}

// Export singleton instance
const metalsScraper = new MetalsScraper();

module.exports = metalsScraper;

// If running as main module, start the scraper
if (require.main === module) {
  metalsScraper.startAutoUpdate();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down metals scraper...');
    metalsScraper.stopAutoUpdate();
    process.exit(0);
  });
}

// ---

// api/routes/metals.js - Express routes for API
const express = require('express');
const router = express.Router();
const metalsScraper = require('../services/metalsScraper');

// GET /api/metals - Get all metals data
router.get('/', async (req, res) => {
  try {
    const data = await metalsScraper.ensureFreshData();
    
    if (!data) {
      return res.status(503).json({
        success: false,
        message: 'Metals data not available',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: data,
      dataAge: metalsScraper.getDataAge(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metals data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/metals/:symbol - Get specific metal data
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    await metalsScraper.ensureFreshData();
    
    const metal = metalsScraper.getMetal(symbol);
    
    if (!metal) {
      return res.status(404).json({
        success: false,
        message: `Metal '${symbol}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: metal,
      dataAge: metalsScraper.getDataAge(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metal data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/metals/status/health - Health check endpoint
router.get('/status/health', (req, res) => {
  const data = metalsScraper.getData();
  const dataAge = metalsScraper.getDataAge();
  
  res.json({
    success: true,
    status: 'healthy',
    hasData: !!data,
    dataAge: dataAge,
    isDataFresh: metalsScraper.isDataFresh(),
    lastUpdate: metalsScraper.lastUpdate,
    isAutoUpdateRunning: metalsScraper.isRunning,
    timestamp: new Date().toISOString()
  });
});

// POST /api/metals/update - Force update
router.post('/update', async (req, res) => {
  try {
    const data = await metalsScraper.scrapeMetals();
    
    res.json({
      success: true,
      message: 'Metals data updated successfully',
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Force update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update metals data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

// ---

// package.json dependencies
/*
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "node-cron": "^3.0.3",
    "express": "^4.18.2"
  }
}
*/

// ---

// Example usage in your AI agent:

class AIMetalsAgent {
  constructor(apiBaseUrl = 'http://localhost:3000/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getAllMetals() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/metals`);
      const result = await response.json();
      
      if (result.success) {
        return result.data.metals;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to fetch metals data:', error.message);
      return null;
    }
  }

  async getMetal(symbol) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/metals/${symbol}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`Failed to fetch ${symbol} data:`, error.message);
      return null;
    }
  }

  async getGoldPrice() {
    return await this.getMetal('XAU');
  }

  async getSilverPrice() {
    return await this.getMetal('XAG');
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/metals/status/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Usage example:
// const agent = new AIMetalsAgent();
// const goldPrice = await agent.getGoldPrice();
// console.log('Current gold price:', goldPrice.last);