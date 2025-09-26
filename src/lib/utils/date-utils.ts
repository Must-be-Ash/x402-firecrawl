import { format, isValid, parseISO, addDays, subDays } from 'date-fns';

export function formatDateForAPI(date: Date): string {
  if (!isValid(date)) {
    throw new Error('Invalid date provided');
  }
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }
  return format(dateObj, 'MMMM d, yyyy');
}

export function getLocalUserDate(timezone?: string): Date {
  const now = new Date();
  if (timezone) {
    try {
      // Convert to user's timezone
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      return userTime;
    } catch {
      console.warn('Invalid timezone provided, using UTC:', timezone);
    }
  }
  return now;
}

export function isValidNewsDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return false;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  // Allow up to 2 days in the future (to handle timezone differences) and not more than 1 year old
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const oneYearAgo = subDays(today, 365);
  
  console.log(`DEBUG: Validating date ${formatDateForAPI(dateObj)} - today: ${formatDateForAPI(today)}, valid range: ${formatDateForAPI(oneYearAgo)} to ${formatDateForAPI(twoDaysFromNow)}`);
  
  return inputDate <= twoDaysFromNow && inputDate >= oneYearAgo;
}

export function validateDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = parseISO(dateString);
  return isValid(date) && formatDateForAPI(date) === dateString;
}

export function getTimezoneFromRequest(request: Request): string {
  // Try to get timezone from headers
  const timezoneHeader = request.headers.get('x-timezone');
  if (timezoneHeader) {
    return timezoneHeader;
  }
  
  // Try to get from user-agent or other headers
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    // This is a basic implementation - in production you might use a geolocation service
    // For now, return UTC as default
  }
  
  return 'UTC';
}

export function getTodayInTimezone(timezone: string = 'UTC'): string {
  const now = new Date();
  try {
    // Get the current date in the specified timezone
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const result = formatDateForAPI(userTime);
    console.log(`DEBUG: getTodayInTimezone(${timezone}) = ${result}, UTC now = ${formatDateForAPI(now)}`);
    return result;
  } catch {
    console.warn('Invalid timezone, using UTC:', timezone);
    return formatDateForAPI(now);
  }
}

export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(formatDateForAPI(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

/**
 * Maps timezone to ISO 3166-1 alpha-2 country code and preferred languages
 */
export function getLocationFromTimezone(timezone: string): { country: string; languages: string[]; locationHint: string } {
  try {
    // Validate timezone using Intl API
    new Intl.DateTimeFormat('en', { timeZone: timezone });

    // Get country code dynamically
    const countryCode = getCountryCodeFromTimezone(timezone);

    // Get default languages for country
    const languages = getDefaultLanguagesForCountry(countryCode);

    // Build location hint from timezone
    const parts = timezone.split('/');
    let locationHint = '';

    if (parts.length >= 2) {
      // Extract city from timezone (e.g., "America/New_York" -> "New York")
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      const countryName = getCountryNameFromCode(countryCode);
      locationHint = `${city} ${countryName} `;
    } else {
      // No city in timezone, just use country
      locationHint = `${getCountryNameFromCode(countryCode)} `;
    }

    return { country: countryCode, languages, locationHint };

  } catch {
    console.warn(`Invalid or unknown timezone: ${timezone}, using fallback`);
    return { country: 'US', languages: ['en'], locationHint: '' };
  }
}

/**
 * Maps timezone to a human-readable location name for search queries
 * Dynamically parses IANA timezone format (e.g., "Europe/Dublin" -> "Dublin, Ireland")
 */
export function getLocationNameFromTimezone(timezone: string): string {
  try {
    // Validate timezone
    new Intl.DateTimeFormat('en', { timeZone: timezone });

    // Parse timezone to extract city and country
    const parts = timezone.split('/');
    const countryCode = getCountryCodeFromTimezone(timezone);
    const countryName = getCountryNameFromCode(countryCode);

    if (parts.length >= 2) {
      // Has city component: "Europe/Dublin" -> "Dublin, Ireland"
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      return `${city}, ${countryName}`;
    } else {
      // No city, just country: "GMT" -> "United Kingdom"
      return countryName;
    }

  } catch {
    console.warn(`Invalid or unknown timezone: ${timezone}, defaulting to United States`);
    return 'United States';
  }
}

/**
 * Dynamically generates a location identifier from IANA timezone
 * Format: "CountryCode-City" or "CountryCode" for non-specific locations
 * Examples: "CA-Vancouver", "US-NewYork", "GB-London", "JP-Tokyo"
 */
export function getLocationIdentifier(timezone: string): string {
  try {
    // Validate timezone using Intl API
    new Intl.DateTimeFormat('en', { timeZone: timezone });

    // Parse IANA timezone format: Continent/City or Country/City
    const parts = timezone.split('/');

    if (parts.length >= 2) {
      // Extract city from last part (handles zones like America/Indiana/Indianapolis)
      const city = parts[parts.length - 1]
        .replace(/_/g, '') // "New_York" → "NewYork"
        .replace(/\s+/g, ''); // Remove any spaces

      // Get country code from timezone
      const countryCode = getCountryCodeFromTimezone(timezone);

      return `${countryCode}-${city}`;
    }

    // Handle non-standard timezones (GMT, UTC, EST, PST, etc.)
    // These don't have city info, so just use country code
    return getCountryCodeFromTimezone(timezone);

  } catch {
    console.warn(`Invalid or unknown timezone: ${timezone}, using fallback`);
    // Fallback to country code only
    return getCountryCodeFromTimezone(timezone);
  }
}

/**
 * Maps country code to default languages
 */
function getDefaultLanguagesForCountry(countryCode: string): string[] {
  const languageMap: Record<string, string[]> = {
    'US': ['en'], 'CA': ['en', 'fr'], 'GB': ['en'], 'IE': ['en'],
    'AU': ['en'], 'NZ': ['en'],
    'FR': ['fr'], 'BE': ['fr', 'nl'], 'CH': ['de', 'fr', 'it'],
    'DE': ['de'], 'AT': ['de'],
    'ES': ['es'], 'MX': ['es'], 'AR': ['es'], 'CL': ['es'],
    'IT': ['it'],
    'NL': ['nl'],
    'SE': ['sv'], 'NO': ['no'], 'DK': ['da'], 'FI': ['fi'],
    'PL': ['pl'], 'CZ': ['cs'], 'HU': ['hu'], 'GR': ['el'],
    'PT': ['pt'], 'BR': ['pt'],
    'RU': ['ru'],
    'TR': ['tr'],
    'JP': ['ja'], 'KR': ['ko'], 'CN': ['zh'], 'HK': ['zh', 'en'],
    'SG': ['en', 'zh'], 'TH': ['th'], 'ID': ['id'], 'PH': ['en', 'tl'],
    'IN': ['en', 'hi'], 'PK': ['en', 'ur'],
    'AE': ['ar', 'en'], 'SA': ['ar'],
    'IL': ['he', 'ar', 'en'],
    'EG': ['ar'], 'ZA': ['en', 'af'], 'NG': ['en']
  };
  return languageMap[countryCode] || ['en'];
}

/**
 * Maps country code to country name
 */
function getCountryNameFromCode(countryCode: string): string {
  const countryNames: Record<string, string> = {
    'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'IE': 'Ireland',
    'AU': 'Australia', 'NZ': 'New Zealand',
    'FR': 'France', 'BE': 'Belgium', 'CH': 'Switzerland',
    'DE': 'Germany', 'AT': 'Austria',
    'ES': 'Spain', 'MX': 'Mexico', 'AR': 'Argentina', 'CL': 'Chile',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
    'PL': 'Poland', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'GR': 'Greece',
    'PT': 'Portugal', 'BR': 'Brazil',
    'RU': 'Russia',
    'TR': 'Turkey',
    'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China', 'HK': 'Hong Kong',
    'SG': 'Singapore', 'TH': 'Thailand', 'ID': 'Indonesia', 'PH': 'Philippines',
    'IN': 'India', 'PK': 'Pakistan',
    'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia',
    'IL': 'Israel',
    'EG': 'Egypt', 'ZA': 'South Africa', 'NG': 'Nigeria'
  };
  return countryNames[countryCode] || 'United States';
}

/**
 * Maps timezone to country code by parsing region and city
 * Uses a simplified approach with major city mappings
 */
function getCountryCodeFromTimezone(timezone: string): string {
  const lowerTimezone = timezone.toLowerCase();

  // Canadian cities
  const canadianCities = ['vancouver', 'toronto', 'montreal', 'calgary', 'edmonton', 'ottawa', 'winnipeg', 'quebec', 'hamilton', 'halifax'];
  if (canadianCities.some(city => lowerTimezone.includes(city))) {
    return 'CA';
  }

  // UK cities
  const ukCities = ['london', 'manchester', 'birmingham', 'glasgow', 'edinburgh'];
  if (ukCities.some(city => lowerTimezone.includes(city)) || lowerTimezone.includes('gb')) {
    return 'GB';
  }

  // Parse by continent/region prefix
  if (lowerTimezone.startsWith('america/')) {
    // Distinguish between North/Central/South America
    const usaCities = ['new_york', 'los_angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san_antonio', 'san_diego', 'dallas', 'san_jose', 'detroit', 'denver', 'boston', 'seattle', 'miami', 'atlanta'];
    const mexicoCities = ['mexico_city', 'cancun', 'tijuana', 'guadalajara', 'monterrey'];
    const brazilCities = ['sao_paulo', 'rio', 'brasilia', 'salvador', 'fortaleza'];

    if (usaCities.some(city => lowerTimezone.includes(city))) return 'US';
    if (mexicoCities.some(city => lowerTimezone.includes(city))) return 'MX';
    if (brazilCities.some(city => lowerTimezone.includes(city))) return 'BR';
    if (lowerTimezone.includes('argentina')) return 'AR';
    if (lowerTimezone.includes('chile')) return 'CL';

    // Default America/ to US
    return 'US';
  }

  if (lowerTimezone.startsWith('europe/')) {
    const cityToCountry: Record<string, string> = {
      'paris': 'FR', 'berlin': 'DE', 'madrid': 'ES', 'rome': 'IT',
      'amsterdam': 'NL', 'brussels': 'BE', 'vienna': 'AT', 'zurich': 'CH',
      'stockholm': 'SE', 'oslo': 'NO', 'copenhagen': 'DK', 'helsinki': 'FI',
      'warsaw': 'PL', 'prague': 'CZ', 'budapest': 'HU', 'athens': 'GR',
      'lisbon': 'PT', 'dublin': 'IE', 'moscow': 'RU', 'istanbul': 'TR'
    };

    for (const [city, country] of Object.entries(cityToCountry)) {
      if (lowerTimezone.includes(city)) return country;
    }

    return 'GB'; // Default Europe to GB
  }

  if (lowerTimezone.startsWith('asia/')) {
    const cityToCountry: Record<string, string> = {
      'tokyo': 'JP', 'seoul': 'KR', 'shanghai': 'CN', 'beijing': 'CN', 'hong_kong': 'HK',
      'singapore': 'SG', 'bangkok': 'TH', 'jakarta': 'ID', 'manila': 'PH',
      'mumbai': 'IN', 'delhi': 'IN', 'kolkata': 'IN', 'bangalore': 'IN',
      'dubai': 'AE', 'riyadh': 'SA', 'tehran': 'IR', 'karachi': 'PK'
    };

    for (const [city, country] of Object.entries(cityToCountry)) {
      if (lowerTimezone.includes(city)) return country;
    }

    return 'CN'; // Default Asia to CN
  }

  if (lowerTimezone.startsWith('australia/') || lowerTimezone.startsWith('pacific/auckland')) {
    if (lowerTimezone.includes('auckland')) return 'NZ';
    return 'AU';
  }

  if (lowerTimezone.startsWith('africa/')) {
    if (lowerTimezone.includes('cairo')) return 'EG';
    if (lowerTimezone.includes('johannesburg')) return 'ZA';
    if (lowerTimezone.includes('lagos')) return 'NG';
    return 'ZA'; // Default Africa to South Africa
  }

  // Fallback to US for unknown timezones
  return 'US';
}