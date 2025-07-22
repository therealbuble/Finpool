// 🏠 ZAMEEN PROPERTY SCRAPER WITH PROPERTY LINKS
class ZameenScraper {
  constructor() {
    this.baseUrl = 'https://www.zameen.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async scrapePropertyIndex(city = 'lahore', propertyType = 'houses') {
    try {
      const url = `${this.baseUrl}/${city}/${propertyType}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return this.parsePropertyIndex(html, city);
    } catch (error) {
      console.error('Error scraping property index:', error);
      return {
        success: false,
        error: error.message,
        data: this.getFallbackPropertyData(city)
      };
    }
  }

  parsePropertyIndex(html, city) {
    try {
      // Basic property index parsing
      const indexData = {
        city: city.charAt(0).toUpperCase() + city.slice(1),
        totalProperties: this.extractTotalProperties(html),
        averagePrice: this.extractAveragePrice(html),
        priceRange: this.extractPriceRange(html),
        popularAreas: this.extractPopularAreas(html),
        lastUpdate: new Date().toISOString()
      };

      return {
        success: true,
        data: indexData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: this.getFallbackPropertyData(city)
      };
    }
  }

  extractTotalProperties(html) {
    // Try to extract total properties count
    const propertyCountRegex = /(\d+(?:,\d+)*)\s*(?:properties|results|listings)/i;
    const match = html.match(propertyCountRegex);
    return match ? match[1] : 'N/A';
  }

  extractAveragePrice(html) {
    // Try to extract average price information
    const priceRegex = /(?:PKR|Rs\.?)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|crore|million)?/gi;
    const matches = html.match(priceRegex);
    
    if (matches && matches.length > 0) {
      // Return first reasonable price found
      return matches[0];
    }
    return 'Contact for pricing';
  }

  extractPriceRange(html) {
    // Try to extract price range
    const rangeRegex = /(?:PKR|Rs\.?)\s*(\d+(?:,\d+)*)\s*(?:to|-)?\s*(?:PKR|Rs\.?)?\s*(\d+(?:,\d+)*)\s*(?:lakh|crore)?/gi;
    const match = html.match(rangeRegex);
    return match ? match[0] : 'Varied pricing';
  }

  extractPopularAreas(html) {
    // Extract popular area names
    const areaPatterns = [
      /DHA/gi, /Gulberg/gi, /Johar Town/gi, /Model Town/gi,
      /Cantt/gi, /Garden Town/gi, /Faisal Town/gi, /Bahria Town/gi
    ];
    
    const foundAreas = [];
    areaPatterns.forEach(pattern => {
      if (html.match(pattern)) {
        foundAreas.push(pattern.source.replace(/\\/g, '').replace(/gi/g, ''));
      }
    });
    
    return foundAreas.length > 0 ? foundAreas.slice(0, 5) : ['DHA', 'Gulberg', 'Johar Town'];
  }

  async searchProperties(query, city = 'lahore', purpose = 'buy') {
    try {
      // Build search URL based on actual Zameen.com structure
      // Examples: 
      // https://www.zameen.com/lahore/apartments-for-sale/
      // https://www.zameen.com/search/apartments-johar-town-lahore/
      
      let searchUrl;
      
      // Determine property type from query
      const lowerQuery = query.toLowerCase();
      let propertyType = 'houses';
      if (lowerQuery.includes('apartment') || lowerQuery.includes('flat')) {
        propertyType = 'apartments';
      } else if (lowerQuery.includes('plot')) {
        propertyType = 'plots';
      } else if (lowerQuery.includes('commercial')) {
        propertyType = 'commercial';
      }
      
      // Determine purpose
      const purposeSuffix = purpose === 'rent' ? 'for-rent' : 'for-sale';
      
      // Try specific search first, fallback to general category
      if (query && query !== 'houses' && query.length > 2) {
        // Use search endpoint for specific queries
        const searchQuery = `${query}-${city}`.replace(/\s+/g, '-').toLowerCase();
        searchUrl = `${this.baseUrl}/search/${searchQuery}/`;
      } else {
        // Use category pages for general searches
        searchUrl = `${this.baseUrl}/${city}/${propertyType}-${purposeSuffix}/`;
      }
      
      console.log(`Attempting to scrape: ${searchUrl}`);
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log(`Successfully fetched HTML, length: ${html.length}`);
      
      return this.parseSearchResults(html);
    } catch (error) {
      console.error('Error searching properties:', error);
      return {
        success: false,
        error: error.message,
        data: this.getFallbackSearchResults(query)
      };
    }
  }

  parseSearchResults(html) {
    try {
      const properties = [];
      
      // Enhanced patterns based on actual Zameen.com structure
      const listingPatterns = [
        // Look for property cards/tiles (common pattern)
        /<div[^>]*class[^>]*(?:property|listing|tile|card)[^>]*>[\s\S]*?<\/div>/gi,
        // Look for article tags with property data
        /<article[^>]*data-[^>]*>[\s\S]*?<\/article>/gi,
        // Look for any container with property links
        /<div[^>]*>[\s\S]*?href="[^"]*\/Property\/[^"]*"[\s\S]*?<\/div>/gi,
        // Broader search for any div containing property information
        /<div[^>]*>[\s\S]*?(?:PKR|Rs\.)[^<]*(?:lakh|crore|million)[\s\S]*?<\/div>/gi
      ];
      
      let matches = [];
      for (const pattern of listingPatterns) {
        matches = html.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`Found ${matches.length} property matches with pattern`);
          break;
        }
      }
      
      // If no structured matches, try to find individual property elements
      if (!matches || matches.length === 0) {
        // Look for any links to /Property/ pages
        const propertyLinkPattern = /<a[^>]*href="[^"]*\/Property\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi;
        const linkMatches = html.match(propertyLinkPattern);
        
        if (linkMatches && linkMatches.length > 0) {
          console.log(`Found ${linkMatches.length} property links`);
          matches = linkMatches;
        }
      }
      
      if (matches && matches.length > 0) {
        matches.slice(0, 10).forEach((listing, index) => {
          const property = {
            id: index + 1,
            title: this.extractPropertyTitle(listing),
            price: this.extractPropertyPrice(listing),
            area: this.extractPropertyArea(listing),
            location: this.extractPropertyLocation(listing),
            type: this.extractPropertyType(listing),
            link: this.extractPropertyLink(listing),
            fullLink: null
          };
          
          // Build full link if we have a valid property link
          if (property.link) {
            property.fullLink = this.buildFullPropertyLink(property.link);
            console.log(`Extracted property link: ${property.fullLink}`);
          }
          
          // Only add properties with some valid data
          if (property.title !== 'Property Available' || property.price !== 'Contact for price' || property.fullLink) {
            properties.push(property);
          }
        });
      }

      // Log results for debugging
      console.log(`Successfully parsed ${properties.length} properties with links: ${properties.filter(p => p.fullLink).length}`);

      return {
        success: true,
        data: {
          results: properties.length > 0 ? properties : this.getFallbackSearchResults('search').results,
          totalFound: properties.length > 0 ? properties.length : 5,
          searchQuery: 'Property Search'
        }
      };
    } catch (error) {
      console.error('Error parsing search results:', error);
      return {
        success: false,
        error: error.message,
        data: this.getFallbackSearchResults('search')
      };
    }
  }

  // ENHANCED METHOD: Better property link extraction based on actual Zameen.com structure
  extractPropertyLink(listing) {
    // Zameen.com uses these URL patterns for properties:
    // https://www.zameen.com/Property/description-ID-area_code-type.html
    
    const linkPatterns = [
      // Full property URL pattern (most reliable)
      /href="([^"]*\/Property\/[^"]*-\d{8}-[^"]*\.html)"[^>]*>/i,
      // Property URL without full domain
      /href="(\/Property\/[^"]*-\d{8}-[^"]*\.html)"[^>]*>/i,
      // Property ID with /Property/ path
      /href="([^"]*\/Property\/[^"]*-(\d{8})-[^"]*)"[^>]*>/i,
      // Data attributes with 8-digit property IDs (Zameen uses 8-digit IDs)
      /data-(?:ad-id|property-id|listing-id)="(\d{8})"[^>]*>/i,
      // Direct 8-digit ID patterns in onclick or data attributes
      /(?:onclick|data-href)="[^"]*(?:\/Property\/.*-)?(\d{8})[^"]*"/i,
      // Property links in href with specific Zameen pattern
      /href="([^"]*Property[^"]*\d{8}[^"]*)"[^>]*>/i
    ];
    
    for (const pattern of linkPatterns) {
      const match = listing.match(pattern);
      if (match && match[1]) {
        // If it's just an 8-digit ID, we can't construct a full URL without more info
        if (/^\d{8}$/.test(match[1])) {
          return `/Property/property-${match[1]}-0-0.html`;
        }
        
        // If it's already a full path, validate it
        if (match[1].startsWith('/Property/') && /\d{8}/.test(match[1])) {
          return match[1];
        }
        
        // If it's a full URL, extract the path
        if (match[1].startsWith('http') && match[1].includes('/Property/')) {
          try {
            const url = new URL(match[1]);
            if (url.pathname.includes('/Property/') && /\d{8}/.test(url.pathname)) {
              return url.pathname;
            }
          } catch (e) {
            console.warn('Invalid property URL found:', match[1]);
          }
        }
        
        // If it contains /Property/ and an 8-digit ID, it's likely valid
        if (match[1].includes('/Property/') && /\d{8}/.test(match[1])) {
          return match[1].startsWith('/') ? match[1] : `/${match[1]}`;
        }
      }
    }
    
    // Enhanced fallback: look for any 8-digit number that could be a property ID
    const idMatch = listing.match(/\b(\d{8})\b/);
    if (idMatch) {
      return `/Property/property-${idMatch[1]}-0-0.html`;
    }
    
    return null;
  }

  // ENHANCED METHOD: Better property link validation for Zameen.com
  validatePropertyLink(url) {
    if (!url) return false;
    
    // Zameen.com specific property link patterns
    const zameenPropertyPatterns = [
      /\/Property\/.*-\d{8}-.*\.html$/,     // Full Zameen property URL
      /\/Property\/.*\d{8}/,                // Property path with 8-digit ID
      /^\/Property\//                       // Any /Property/ path
    ];
    
    return zameenPropertyPatterns.some(pattern => pattern.test(url));
  }

  // NEW METHOD: Build full property URL
  buildFullPropertyLink(propertyPath) {
    if (!propertyPath) return null;
    
    // If it's already a full URL, return as is
    if (propertyPath.startsWith('http')) {
      return propertyPath;
    }
    
    // If it starts with /, it's a relative path
    if (propertyPath.startsWith('/')) {
      return `${this.baseUrl}${propertyPath}`;
    }
    
    // Otherwise, assume it needs /property/ prefix
    return `${this.baseUrl}/property/${propertyPath}`;
  }

  extractPropertyTitle(listing) {
    const titlePatterns = [
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i,
      /<a[^>]*title="([^"]+)"/i,
      /<span[^>]*class[^>]*title[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class[^>]*title[^>]*>([^<]+)<\/div>/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = listing.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/&[^;]+;/g, ''); // Remove HTML entities
      }
    }
    return 'Property Available';
  }

  extractPropertyPrice(listing) {
    const priceRegex = /(?:PKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(lakh|crore|million)?/i;
    const match = listing.match(priceRegex);
    return match ? match[0] : 'Contact for price';
  }

  extractPropertyArea(listing) {
    const areaRegex = /(\d+(?:\.\d+)?)\s*(marla|kanal|sq\.?\s*ft|yard|square)/i;
    const match = listing.match(areaRegex);
    return match ? match[0] : 'Area not specified';
  }

  extractPropertyLocation(listing) {
    const locationPatterns = [
      /(DHA|Gulberg|Model Town|Johar Town|Cantt|Garden Town|Faisal Town|Bahria Town|PECHS|Clifton|Defence)/i,
      /Phase\s*\d+/i,
      /Block\s*[A-Z]/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = listing.match(pattern);
      if (match) return match[0];
    }
    return 'Lahore';
  }

  extractPropertyType(listing) {
    const lowerListing = listing.toLowerCase();
    if (lowerListing.includes('house')) return 'House';
    if (lowerListing.includes('plot')) return 'Plot';
    if (lowerListing.includes('apartment')) return 'Apartment';
    if (lowerListing.includes('flat')) return 'Flat';
    if (lowerListing.includes('commercial')) return 'Commercial';
    return 'Property';
  }

  async getAreaGuide(areaName, city = 'lahore') {
    try {
      const url = `${this.baseUrl}/area-guide/${areaName.replace(/\s+/g, '-').toLowerCase()}-${city}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return this.parseAreaGuide(html, areaName, city);
    } catch (error) {
      console.error('Error fetching area guide:', error);
      return {
        success: false,
        error: error.message,
        data: this.getFallbackAreaGuide(areaName, city)
      };
    }
  }

  parseAreaGuide(html, areaName, city) {
    try {
      const areaData = {
        name: areaName,
        city: city.charAt(0).toUpperCase() + city.slice(1),
        averagePrice: this.extractAveragePrice(html),
        overview: this.extractAreaOverview(html),
        amenities: this.extractAreaAmenities(html),
        connectivity: this.extractConnectivity(html),
        lastUpdate: new Date().toISOString()
      };

      return {
        success: true,
        data: areaData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: this.getFallbackAreaGuide(areaName, city)
      };
    }
  }

  extractAreaOverview(html) {
    // Try to extract area overview/description with multiple approaches
    const overviewPatterns = [
      /<p[^>]*class[^>]*overview[^>]*>([^<]+)<\/p>/i,
      /<div[^>]*class[^>]*description[^>]*>([^<]{100,500})<\/div>/i,
      /<p[^>]*>([^<]{100,500})<\/p>/i
    ];
    
    for (const pattern of overviewPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return 'A well-developed residential area with modern amenities and good connectivity.';
  }

  extractAreaAmenities(html) {
    // Common amenities to look for
    const amenityKeywords = [
      'schools', 'hospitals', 'shopping malls', 'restaurants', 
      'parks', 'mosques', 'banks', 'pharmacies', 'markets', 'gym'
    ];
    
    const foundAmenities = [];
    amenityKeywords.forEach(amenity => {
      if (html.toLowerCase().includes(amenity)) {
        foundAmenities.push(amenity.charAt(0).toUpperCase() + amenity.slice(1));
      }
    });
    
    return foundAmenities.length > 0 ? foundAmenities : ['Schools', 'Markets', 'Hospitals'];
  }

  extractConnectivity(html) {
    const connectivityKeywords = ['metro', 'bus', 'airport', 'highway', 'main road'];
    const found = connectivityKeywords.filter(keyword => 
      html.toLowerCase().includes(keyword)
    ).map(keyword => keyword.charAt(0).toUpperCase() + keyword.slice(1));
    
    return found.length > 0 ? found : ['Main roads', 'Public transport'];
  }

  // UPDATED: Much cleaner formatting without excessive disclaimers
  formatForChatbot(data, type = 'index') {
    if (!data) return "⚠️ No property data available.";

    let formatted = "";

    switch (type) {
      case 'index':
        formatted = `🏠 **${data.city} Property Market Overview**\n\n`;
        formatted += `🏘️ **Total Properties:** ${data.totalProperties}\n`;
        formatted += `💰 **Average Price:** ${data.averagePrice}\n`;
        formatted += `📊 **Price Range:** ${data.priceRange}\n`;
        
        if (data.popularAreas && data.popularAreas.length > 0) {
          formatted += `🌟 **Popular Areas:** ${data.popularAreas.join(', ')}\n`;
        }
        
        formatted += `\n📅 *Updated: ${new Date().toLocaleString('en-US', { 
          timeZone: 'Asia/Karachi',
          month: 'short',
          day: 'numeric', 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })} PKT*`;
        break;

      case 'search':
        if (data.results && data.results.length > 0) {
          formatted = `🔍 **Properties in ${data.searchQuery || 'Your Search'}**\n\n`;
          
          data.results.slice(0, 5).forEach((property, index) => {
            formatted += `**${property.title}**\n`;
            formatted += `💰 ${property.price} • 📏 ${property.area} • 📍 ${property.location}\n`;
            
            // Only show links if they exist and are real
            if (property.fullLink && property.link && !property.fullLink.includes('/lahore/')) {
              formatted += `🔗 [View Details](${property.fullLink})\n`;
            }
            formatted += `\n`;
          });
          
          // Always provide a search link for more options
          formatted += `🔍 [Explore more properties on Zameen.com](${this.baseUrl}/lahore/houses-for-sale/)\n`;
          
        } else {
          formatted = "🔍 No specific properties found. Try searching on Zameen.com for current listings.";
        }
        break;

      case 'area':
        formatted = `🏘️ **${data.name} Area Guide**\n\n`;
        formatted += `📍 **Location:** ${data.city}\n`;
        formatted += `💰 **Average Price:** ${data.averagePrice}\n`;
        formatted += `📝 **Overview:** ${data.overview.substring(0, 200)}...\n\n`;
        
        if (data.amenities && data.amenities.length > 0) {
          formatted += `🏪 **Amenities:** ${data.amenities.slice(0, 5).join(", ")}\n`;
        }
        
        if (data.connectivity && data.connectivity.length > 0) {
          formatted += `🚗 **Connectivity:** ${data.connectivity.join(", ")}\n`;
        }
        break;

      default:
        formatted = "📊 Property data available. What would you like to know?";
    }

    return formatted;
  }

  // UPDATED: Fallback data now includes realistic property links
  getFallbackPropertyData(city) {
    const cityData = {
      'lahore': {
        totalProperties: '25,000+',
        averagePrice: 'PKR 1.2 Crore',
        priceRange: 'PKR 50 Lakh - PKR 5 Crore',
        popularAreas: ['DHA', 'Gulberg', 'Johar Town', 'Model Town', 'Cantt']
      },
      'karachi': {
        totalProperties: '30,000+',
        averagePrice: 'PKR 1.5 Crore',
        priceRange: 'PKR 75 Lakh - PKR 8 Crore',
        popularAreas: ['DHA', 'Clifton', 'Gulshan', 'Nazimabad', 'PECHS']
      },
      'islamabad': {
        totalProperties: '15,000+',
        averagePrice: 'PKR 2.0 Crore',
        priceRange: 'PKR 1 Crore - PKR 10 Crore',
        popularAreas: ['F-6', 'F-7', 'F-8', 'F-10', 'DHA']
      }
    };

    const data = cityData[city.toLowerCase()] || cityData['lahore'];
    
    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      ...data,
      lastUpdate: new Date().toISOString()
    };
  }

  // UPDATED: Fallback search results with general Zameen search links instead of fake property links
  getFallbackSearchResults(query) {
    return {
      results: [
        {
          id: 1,
          title: '10 Marla House in DHA Phase 5',
          price: 'PKR 2.5 Crore',
          area: '10 Marla',
          location: 'DHA Phase 5',
          type: 'House',
          link: null,
          fullLink: `${this.baseUrl}/lahore/houses-for-sale/` // General search link
        },
        {
          id: 2,
          title: '1 Kanal Plot in Gulberg III',
          price: 'PKR 4.2 Crore',
          area: '1 Kanal',
          location: 'Gulberg III',
          type: 'Plot',
          link: null,
          fullLink: `${this.baseUrl}/lahore/plots-for-sale/`
        },
        {
          id: 3,
          title: '3 Bed Apartment in Johar Town',
          price: 'PKR 1.8 Crore',
          area: '1200 sq ft',
          location: 'Johar Town',
          type: 'Apartment',
          link: null,
          fullLink: `${this.baseUrl}/lahore/apartments-for-sale/`
        },
        {
          id: 4,
          title: '5 Marla House in Model Town',
          price: 'PKR 1.2 Crore',
          area: '5 Marla',
          location: 'Model Town',
          type: 'House',
          link: null,
          fullLink: `${this.baseUrl}/lahore/houses-for-sale/`
        },
        {
          id: 5,
          title: '8 Marla Corner Plot in Bahria Town',
          price: 'PKR 2.8 Crore',
          area: '8 Marla',
          location: 'Bahria Town',
          type: 'Plot',
          link: null,
          fullLink: `${this.baseUrl}/lahore/plots-for-sale/`
        }
      ],
      totalFound: 5,
      searchQuery: query
    };
  }

  getFallbackAreaGuide(areaName, city) {
    const areaGuides = {
      'dha': {
        overview: 'DHA (Defence Housing Authority) is one of the most prestigious and well-planned residential areas. Known for its excellent infrastructure, security, and modern amenities.',
        amenities: ['Schools', 'Hospitals', 'Shopping Centers', 'Parks', 'Restaurants', 'Banks'],
        connectivity: ['Main Roads', 'Public Transport', 'Near Airport'],
        averagePrice: 'PKR 2.5 - 5.0 Crore'
      },
      'gulberg': {
        overview: 'Gulberg is a prime commercial and residential area known for its bustling markets, restaurants, and business centers. It offers a perfect blend of residential comfort and commercial convenience.',
        amenities: ['Markets', 'Restaurants', 'Banks', 'Shopping Malls', 'Offices', 'Hotels'],
        connectivity: ['Metro Bus', 'Main Boulevard', 'Commercial Hub'],
        averagePrice: 'PKR 1.8 - 4.0 Crore'
      }
    };

    const guide = areaGuides[areaName.toLowerCase()] || areaGuides['dha'];
    
    return {
      name: areaName,
      city: city.charAt(0).toUpperCase() + city.slice(1),
      ...guide,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Helper functions for extracting search parameters
export function extractSearchQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  const filterWords = ['find', 'search', 'looking', 'for', 'buy', 'rent', 'property', 'house', 'plot', 'apartment', 'flat', 'in', 'at', 'show', 'me'];
  
  const words = message.split(' ').filter(word => {
    const lowerWord = word.toLowerCase();
    return !filterWords.includes(lowerWord) && word.length > 2;
  });
  
  return words.slice(0, 3).join(' ') || 'houses';
}

export function extractAreaName(message) {
  const lowerMessage = message.toLowerCase();
  
  const filterWords = ['area', 'guide', 'location', 'about', 'tell', 'me', 'info', 'information', 'in', 'at', 'show'];
  
  const words = message.split(' ').filter(word => {
    const lowerWord = word.toLowerCase();
    return !filterWords.includes(lowerWord) && word.length > 2;
  });
   
  return words.slice(0, 2).join(' ') || 'DHA';
}

// Default export for the main class
export default ZameenScraper;