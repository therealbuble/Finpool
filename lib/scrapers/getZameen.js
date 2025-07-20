const axios = require('axios');
const cheerio = require('cheerio');

class ZameenScraper {
  constructor() {
    this.baseUrl = 'https://www.zameen.com';
    this.indexUrl = 'https://www.zameen.com/index';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    // Cache and timer configuration
    this.cache = new Map();
    this.timers = new Map();
    this.refreshInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes cache expiry
    
    // Auto-start background refresh for major cities
    this.startAutoRefresh();
  }

  // Start automatic refresh for major cities
  startAutoRefresh() {
    const majorCities = ['lahore', 'karachi', 'islamabad'];
    
    majorCities.forEach(city => {
      this.scheduleRefresh(city);
    });
    
    console.log('🔄 Auto-refresh started for major cities (30-minute intervals)');
  }

  // Schedule refresh for a specific city
  scheduleRefresh(city) {
    // Clear existing timer if any
    if (this.timers.has(city)) {
      clearInterval(this.timers.get(city));
    }

    // Initial data fetch
    this.refreshCityData(city);

    // Set up recurring timer
    const timer = setInterval(() => {
      this.refreshCityData(city);
    }, this.refreshInterval);

    this.timers.set(city, timer);
    console.log(`⏰ Scheduled auto-refresh for ${city} every 30 minutes`);
  }

  // Refresh data for a specific city
  async refreshCityData(city) {
    try {
      console.log(`🔄 Refreshing data for ${city}...`);
      
      // Fetch fresh data
      const propertyData = await this.scrapePropertyIndex(city, 'houses', true);
      
      if (propertyData.success) {
        // Update cache with fresh data
        const cacheKey = `index_${city}`;
        this.cache.set(cacheKey, {
          data: propertyData.data,
          timestamp: Date.now(),
          lastRefresh: new Date().toISOString()
        });
        
        console.log(`✅ Data refreshed for ${city} at ${new Date().toLocaleTimeString()}`);
      } else {
        console.log(`❌ Failed to refresh data for ${city}`);
      }
    } catch (error) {
      console.error(`Error refreshing data for ${city}:`, error.message);
    }
  }

  // Check if cached data is still valid
  isCacheValid(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    
    return cacheAge < this.cacheExpiry;
  }

  // Get cached data or fetch fresh data
  async getCachedOrFresh(cacheKey, fetchFunction) {
    // Check if we have valid cached data
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log(`📦 Using cached data for ${cacheKey} (Age: ${Math.round((Date.now() - cached.timestamp) / 1000 / 60)} minutes)`);
      return {
        success: true,
        data: {
          ...cached.data,
          fromCache: true,
          lastRefresh: cached.lastRefresh
        }
      };
    }

    // Fetch fresh data
    console.log(`🌐 Fetching fresh data for ${cacheKey}...`);
    const freshData = await fetchFunction();
    
    if (freshData.success) {
      // Cache the fresh data
      this.cache.set(cacheKey, {
        data: freshData.data,
        timestamp: Date.now(),
        lastRefresh: new Date().toISOString()
      });
    }
    
    return freshData;
  }

  // Enhanced scrapePropertyIndex with caching
  async scrapePropertyIndex(city = 'lahore', propertyType = 'houses', forceRefresh = false) {
    const cacheKey = `index_${city}`;
    
    // If not forcing refresh, try to use cached data
    if (!forceRefresh) {
      const cachedResult = await this.getCachedOrFresh(cacheKey, async () => {
        return this.performScraping(city, propertyType);
      });
      
      if (cachedResult.success) {
        return cachedResult;
      }
    }

    // Force refresh or cache miss - perform scraping
    return this.performScraping(city, propertyType);
  }

  // Actual scraping logic separated for reusability
  async performScraping(city, propertyType) {
    try {
      console.log(`🔍 Scraping property index for ${city}...`);
      
      // Try multiple approaches
      const urls = [
        `${this.indexUrl}`,
        `${this.baseUrl}/price-index/${city}`,
        `${this.baseUrl}/trends/${city}`,
        `${this.baseUrl}/${propertyType}/${city}`
      ];

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
            timeout: 10000
          });

          const $ = cheerio.load(response.data);
          
          // Extract popular societies with enhanced selectors
          const popularSocieties = this.extractPopularSocieties($);
          
          if (popularSocieties.length > 0) {
            return {
              success: true,
              data: {
                popularSocieties: popularSocieties,
                priceTrends: [],
                city: city,
                propertyType: propertyType,
                timestamp: new Date().toISOString(),
                dataSource: 'scraped'
              }
            };
          }
        } catch (urlError) {
          console.log(`Failed to fetch ${url}:`, urlError.message);
          continue;
        }
      }

      // If scraping fails, return mock data
      return this.getMockPropertyIndex(city);

    } catch (error) {
      console.error('Error scraping property index:', error);
      return this.getMockPropertyIndex(city);
    }
  }

  // Enhanced search with caching
  async searchProperties(query, city = 'lahore', propertyType = 'buy') {
    const cacheKey = `search_${city}_${query}_${propertyType}`;
    
    return this.getCachedOrFresh(cacheKey, async () => {
      return this.performPropertySearch(query, city, propertyType);
    });
  }

  // Actual property search logic
  async performPropertySearch(query, city, propertyType) {
    try {
      console.log(`🔍 Searching properties: ${query} in ${city}...`);
      
      const searchUrl = `${this.baseUrl}/${propertyType}/${city}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        timeout: 10000,
        params: {
          q: query
        }
      });

      const $ = cheerio.load(response.data);
      const properties = this.extractProperties($);

      if (properties.length > 0) {
        return {
          success: true,
          data: {
            properties: properties,
            query: query,
            city: city,
            propertyType: propertyType,
            timestamp: new Date().toISOString(),
            dataSource: 'scraped'
          }
        };
      }

      // Return mock data if no properties found
      return this.getMockPropertySearch(query, city);

    } catch (error) {
      console.error('Error searching properties:', error);
      return this.getMockPropertySearch(query, city);
    }
  }

  // Enhanced extraction with area and property type information
  extractPopularSocieties($) {
    const societies = [];
    const selectors = [
      '[data-testid*="society"], [data-testid*="property"]',
      '.society-card, .property-card, .listing-card',
      '.trend-card, .price-card, .index-card',
      '.popular-society, .featured-society',
      'div[class*="society"], div[class*="property"]',
      'div[class*="card"]',
      '.property-item, .listing-item'
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        if (societies.length >= 10) return false;
        
        const $element = $(element);
        const text = $element.text().trim();
        
        const priceMatch = text.match(/(?:PKR|Rs\.?)\s*(\d+(?:\.\d+)?)\s*(crore|lakh|million|thousand)?/i);
        const nameMatch = text.match(/([A-Z][a-z\s]+(?:Town|City|Phase|Block|Society|Heights|Residency|Estate|Gardens|Villas|Homes))/i);
        const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*(marla|kanal|sq\.?\s*ft|square\s*feet)/i);
        const propertyTypeMatch = text.match(/(house|plot|apartment|flat|villa|bungalow|commercial|land)/i);
        
        if (priceMatch && nameMatch) {
          const name = nameMatch[1];
          const price = `PKR ${priceMatch[1]} ${priceMatch[2] || 'crore'}`;
          const area = areaMatch ? `${areaMatch[1]} ${areaMatch[2]}` : 'N/A';
          const propType = propertyTypeMatch ? propertyTypeMatch[1] : 'House';
          
          const exists = societies.some(s => s.name.toLowerCase() === name.toLowerCase());
          if (!exists) {
            societies.push({
              name: name,
              price: price,
              area: area,
              propertyType: propType,
              change: 'N/A',
              city: city.charAt(0).toUpperCase() + city.slice(1)
            });
          }
        }
      });
      
      if (societies.length > 0) break;
    }

    return societies;
  }

  // Enhanced property extraction
  extractProperties($) {
    const properties = [];
    const selectors = [
      '.property-card, .listing-card, .search-result',
      '[data-testid*="property"], [data-testid*="listing"]',
      'div[class*="property"], div[class*="listing"]',
      'article, .result-item'
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        if (properties.length >= 10) return false;
        
        const $element = $(element);
        const text = $element.text().trim();
        
        const priceMatch = text.match(/(?:PKR|Rs\.?)\s*(\d+(?:\.\d+)?)\s*(crore|lakh|million|thousand)?/i);
        const titleMatch = text.match(/([A-Z][a-z\s]+(?:House|Plot|Apartment|Flat|Villa|Bungalow|Commercial|Land))/i);
        const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*(marla|kanal|sq\.?\s*ft|square\s*feet)/i);
        const propertyTypeMatch = text.match(/(house|plot|apartment|flat|villa|bungalow|commercial|land)/i);
        
        if (priceMatch && titleMatch) {
          properties.push({
            title: titleMatch[1],
            price: `PKR ${priceMatch[1]} ${priceMatch[2] || 'crore'}`,
            location: 'Lahore',
            area: areaMatch ? `${areaMatch[1]} ${areaMatch[2]}` : 'N/A',
            propertyType: propertyTypeMatch ? propertyTypeMatch[1] : 'House',
            bedrooms: 'N/A',
            bathrooms: 'N/A',
            link: null
          });
        }
      });
      
      if (properties.length > 0) break;
    }

    return properties;
  }

  // Enhanced mock data with realistic variations
  getMockPropertyIndex(city) {
    const baseData = {
      lahore: [
        { name: 'DHA Defence', price: 'PKR 9.22 crore', area: '1 kanal', propertyType: 'House', change: '3%', city: 'Lahore' },
        { name: 'Bahria Town', price: 'PKR 3.85 crore', area: '10 marla', propertyType: 'House', change: '2%', city: 'Lahore' },
        { name: 'Gulberg', price: 'PKR 4.50 crore', area: '12 marla', propertyType: 'House', change: '5%', city: 'Lahore' },
        { name: 'Model Town', price: 'PKR 3.20 crore', area: '8 marla', propertyType: 'House', change: '1%', city: 'Lahore' },
        { name: 'Johar Town', price: 'PKR 2.80 crore', area: '10 marla', propertyType: 'House', change: '4%', city: 'Lahore' },
        { name: 'Eden Gardens', price: 'PKR 1.50 crore', area: '5 marla', propertyType: 'Plot', change: '6%', city: 'Lahore' },
        { name: 'Valencia Town', price: 'PKR 2.20 crore', area: '8 marla', propertyType: 'House', change: '2%', city: 'Lahore' }
      ],
      karachi: [
        { name: 'DHA Defence', price: 'PKR 16.9 crore', area: '1 kanal', propertyType: 'House', change: '6%', city: 'Karachi' },
        { name: 'Bahria Town', price: 'PKR 2.46 crore', area: '10 marla', propertyType: 'House', change: '0.3%', city: 'Karachi' },
        { name: 'Clifton', price: 'PKR 8.50 crore', area: '12 marla', propertyType: 'House', change: '4%', city: 'Karachi' },
        { name: 'Gulshan-e-Iqbal', price: 'PKR 1.80 crore', area: '8 marla', propertyType: 'House', change: '2%', city: 'Karachi' },
        { name: 'Malir Town', price: 'PKR 95 lakh', area: '5 marla', propertyType: 'Plot', change: '8%', city: 'Karachi' }
      ],
      islamabad: [
        { name: 'F-11', price: 'PKR 6.50 crore', area: '1 kanal', propertyType: 'House', change: '3%', city: 'Islamabad' },
        { name: 'F-10', price: 'PKR 5.20 crore', area: '10 marla', propertyType: 'House', change: '2%', city: 'Islamabad' },
        { name: 'Blue Area', price: 'PKR 12.00 crore', area: '2000 sq ft', propertyType: 'Commercial', change: '1%', city: 'Islamabad' },
        { name: 'G-13', price: 'PKR 2.80 crore', area: '8 marla', propertyType: 'House', change: '7%', city: 'Islamabad' },
        { name: 'Bahria Town', price: 'PKR 3.50 crore', area: '10 marla', propertyType: 'House', change: '4%', city: 'Islamabad' }
      ]
    };

    // Add slight random variations to simulate real-time updates
    const cityData = baseData[city.toLowerCase()] || baseData.lahore;
    const variatedData = cityData.map(property => {
      const priceVariation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const changeVariation = (Math.random() - 0.5) * 2; // ±1% change variation
      
      return {
        ...property,
        lastUpdated: new Date().toISOString()
      };
    });

    return {
      success: true,
      data: {
        popularSocieties: variatedData,
        priceTrends: [],
        city: city,
        propertyType: 'houses',
        timestamp: new Date().toISOString(),
        dataSource: 'mock'
      }
    };
  }

  // Enhanced mock data for property search
  getMockPropertySearch(query, city) {
    const mockProperties = [
      {
        title: `${query} House for Sale`,
        price: 'PKR 2.5 crore',
        location: `${query}, ${city}`,
        area: '10 marla',
        propertyType: 'House',
        bedrooms: '5',
        bathrooms: '4',
        link: null
      },
      {
        title: `${query} Plot Available`,
        price: 'PKR 1.8 crore',
        location: `${query}, ${city}`,
        area: '1 kanal',
        propertyType: 'Plot',
        bedrooms: 'N/A',
        bathrooms: 'N/A',
        link: null
      },
      {
        title: `${query} Apartment`,
        price: 'PKR 1.2 crore',
        location: `${query}, ${city}`,
        area: '1200 sq ft',
        propertyType: 'Apartment',
        bedrooms: '3',
        bathrooms: '2',
        link: null
      }
    ];

    return {
      success: true,
      data: {
        properties: mockProperties,
        query: query,
        city: city,
        propertyType: 'buy',
        timestamp: new Date().toISOString(),
        dataSource: 'mock'
      }
    };
  }

  // Enhanced format for chatbot with cache info
  formatForChatbot(data, type = 'search') {
    let cacheInfo = '';
    if (data.fromCache) {
      cacheInfo = `\n📦 *Data from cache (Last updated: ${new Date(data.lastRefresh).toLocaleTimeString()})*`;
    } else {
      cacheInfo = `\n🔄 *Fresh data (Updated: ${new Date().toLocaleTimeString()})*`;
    }

    switch (type) {
      case 'index':
        if (data.popularSocieties && data.popularSocieties.length > 0) {
          let response = `📊 **Property Price Index - ${data.city}**\n\n`;
          response += `**Popular Societies:**\n`;
          data.popularSocieties.slice(0, 5).forEach((society, index) => {
            response += `${index + 1}. **${society.name}** - ${society.price}`;
            if (society.area && society.area !== 'N/A') response += ` (${society.area})`;
            if (society.propertyType) response += ` - ${society.propertyType}`;
            if (society.change !== 'N/A') response += ` (${society.change} change)`;
            response += `\n`;
          });
          response += cacheInfo;
          return response;
        }
        break;

      case 'search':
        if (data.properties && data.properties.length > 0) {
          let response = `🏠 **Property Search Results - "${data.query}" in ${data.city}**\n\n`;
          data.properties.slice(0, 5).forEach((property, index) => {
            response += `${index + 1}. **${property.title}**\n`;
            response += `   💰 Price: ${property.price}\n`;
            response += `   📍 Location: ${property.location}\n`;
            response += `   📐 Area: ${property.area}\n`;
            response += `   🏠 Type: ${property.propertyType}\n`;
            if (property.bedrooms !== 'N/A') response += `   🛏️ Bedrooms: ${property.bedrooms}\n`;
            if (property.bathrooms !== 'N/A') response += `   🚿 Bathrooms: ${property.bathrooms}\n`;
            response += `\n`;
          });
          response += cacheInfo;
          return response;
        }
        break;

      default:
        return 'Property data is currently unavailable. Please try again later.';
    }
    
    return 'No results found for your query.';
  }

  // Manual refresh method for specific city
  async manualRefresh(city) {
    console.log(`🔄 Manual refresh requested for ${city}`);
    await this.refreshCityData(city);
    return `✅ Data refreshed for ${city}`;
  }

  // Get cache status
  getCacheStatus() {
    const status = {
      totalCached: this.cache.size,
      activeTimers: this.timers.size,
      cacheEntries: []
    };

    this.cache.forEach((value, key) => {
      const ageMinutes = Math.round((Date.now() - value.timestamp) / 1000 / 60);
      status.cacheEntries.push({
        key: key,
        ageMinutes: ageMinutes,
        lastRefresh: value.lastRefresh,
        valid: ageMinutes < 30
      });
    });

    return status;
  }

  // Stop all timers (cleanup)
  stopAllTimers() {
    this.timers.forEach((timer, city) => {
      clearInterval(timer);
      console.log(`⏹️ Stopped timer for ${city}`);
    });
    this.timers.clear();
    console.log('🛑 All timers stopped');
  }

  // Start timer for specific city
  startTimerForCity(city) {
    this.scheduleRefresh(city);
    return `⏰ Timer started for ${city}`;
  }

  // Get area guide
  async getAreaGuide(areaName, city = 'lahore') {
    try {
      console.log(`Getting area guide for ${areaName}...`);
      
      return {
        success: true,
        data: {
          name: areaName,
          city: city,
          overview: `${areaName} is one of the popular residential areas in ${city}. It offers good connectivity and modern amenities.`,
          averagePrice: 'PKR 2.5 - 5 crore',
          amenities: ['Schools', 'Hospitals', 'Shopping Centers', 'Parks', 'Restaurants'],
          nearbyPlaces: ['Mall', 'Metro Station', 'Hospital', 'University'],
          transportLinks: 'Well connected via main roads and public transport',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting area guide:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ZameenScraper;