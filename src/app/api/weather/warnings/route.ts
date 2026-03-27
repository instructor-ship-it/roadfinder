import { NextRequest, NextResponse } from 'next/server';

// BOM RSS Feed URLs by state
const BOM_RSS_FEEDS: Record<string, string> = {
  WA: 'http://www.bom.gov.au/wa/warnings/rss.xml',
  NSW: 'http://www.bom.gov.au/nsw/warnings/rss.xml',
  VIC: 'http://www.bom.gov.au/vic/warnings/rss.xml',
  QLD: 'http://www.bom.gov.au/qld/warnings/rss.xml',
  SA: 'http://www.bom.gov.au/sa/warnings/rss.xml',
  TAS: 'http://www.bom.gov.au/tas/warnings/rss.xml',
  NT: 'http://www.bom.gov.au/nt/warnings/rss.xml',
  ACT: 'http://www.bom.gov.au/act/warnings/rss.xml',
};

export interface BomWarning {
  id: string;
  title: string;
  description: string;
  type: WarningType;
  severity: WarningSeverity;
  status: WarningStatus;
  state: string;
  regions: string[];
  locations: string[];
  issued: string;
  updated: string;
  expires?: string;
  url: string;
  windGusts?: number;
  rainfall?: number;
  temperature?: number;
  fireDangerRating?: string;
}

type WarningType = 
  | 'severe_thunderstorm'
  | 'severe_weather'
  | 'tropical_cyclone'
  | 'flood'
  | 'fire_weather'
  | 'wind'
  | 'rain'
  | 'heatwave'
  | 'frost'
  | 'fog'
  | 'tsunami'
  | 'other';

type WarningSeverity = 'advice' | 'watch' | 'warning' | 'emergency';
type WarningStatus = 'current' | 'updated' | 'cancelled' | 'expired';

// Parse warning type from title and category
function determineWarningType(title: string, category: string): WarningType {
  const text = (title + ' ' + category).toLowerCase();
  
  if (text.includes('thunderstorm')) return 'severe_thunderstorm';
  if (text.includes('tropical cyclone') || text.includes('cyclone')) return 'tropical_cyclone';
  if (text.includes('tsunami')) return 'tsunami';
  if (text.includes('flood')) return 'flood';
  if (text.includes('fire weather') || text.includes('fire danger')) return 'fire_weather';
  if (text.includes('severe weather')) return 'severe_weather';
  if (text.includes('wind')) return 'wind';
  if (text.includes('rain') || text.includes('heavy rain')) return 'rain';
  if (text.includes('heatwave')) return 'heatwave';
  if (text.includes('frost')) return 'frost';
  if (text.includes('fog')) return 'fog';
  
  return 'other';
}

// Determine severity from title and description
function determineSeverity(title: string, description: string): WarningSeverity {
  const text = (title + ' ' + description).toLowerCase();
  
  // Emergency indicators
  if (text.includes('emergency') || 
      text.includes('catastrophic') ||
      text.includes('code red') ||
      text.includes('tsunami warning')) {
    return 'emergency';
  }
  
  // Watch indicators - check before warning since "warning" might appear in both
  if (text.includes('watch') || 
      text.includes('alert') ||
      text.includes('advice') && text.includes('watch')) {
    // But if it also says "warning", treat as warning
    if (text.includes('warning') && !text.includes('watch and act')) {
      return 'warning';
    }
    return 'watch';
  }
  
  // Warning indicators
  if (text.includes('warning') || 
      text.includes('severe') ||
      text.includes('extreme')) {
    return 'warning';
  }
  
  return 'advice';
}

// Extract affected regions from description
function extractRegions(description: string): string[] {
  // BOM descriptions often list regions like "For people in parts of Kimberley, North Interior..."
  const patterns = [
    /for people in (?:parts of )?([^\.]+)/i,
    /for people in the ([^\.]+)/i,
    /affecting (?:parts of )?([^\.]+)/i,
    /in the ([^\.]+) (?:district|region)/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const regions = match[1]
        .split(/,|and/)
        .map(r => r.trim())
        .filter(r => r.length > 2 && r.length < 50)
        .map(r => {
          // Clean up common prefixes
          return r
            .replace(/^(the|parts of|areas of)\s+/i, '')
            .replace(/\s+(district|region|area)$/i, '')
            .trim();
        });
      
      if (regions.length > 0) {
        return regions.filter(r => r.length > 2);
      }
    }
  }
  
  return [];
}

// Extract wind gust speed from description
function extractWindGusts(description: string): number | undefined {
  const patterns = [
    /wind gusts? (?:of|to|around|up to) (\d+)\s*km\/h/i,
    /gusts? (?:of|to|around|up to) (\d+)\s*km\/h/i,
    /(\d+)\s*km\/h (?:wind )?gusts?/i,
    /damaging winds (?:of|to) (\d+)\s*km\/h/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return undefined;
}

// Extract rainfall amount from description
function extractRainfall(description: string): number | undefined {
  const patterns = [
    /(\d+)\s*mm\s*(?:of\s+)?rain/i,
    /rainfall (?:of|around|up to) (\d+)\s*mm/i,
    /heavy rain (?:of|around|up to) (\d+)\s*mm/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return undefined;
}

// Extract fire danger rating
function extractFireDangerRating(description: string): string | undefined {
  const text = description.toLowerCase();
  
  if (text.includes('catastrophic')) return 'Catastrophic';
  if (text.includes('extreme')) return 'Extreme';
  if (text.includes('severe')) return 'Severe';
  if (text.includes('very high')) return 'Very High';
  if (text.includes('high')) return 'High';
  
  return undefined;
}

// Parse RSS item to BomWarning
function parseRssItem(item: any, state: string): BomWarning {
  const title = item.title || '';
  const description = item.description || '';
  const pubDate = item.pubDate || new Date().toISOString();
  const link = item.link || '';
  const category = item.category || '';
  
  // Determine warning type from title/category
  const type = determineWarningType(title, category);
  
  // Determine severity
  const severity = determineSeverity(title, description);
  
  // Extract affected regions from description
  const regions = extractRegions(description);
  
  // Parse wind gusts if mentioned
  const windGusts = extractWindGusts(description);
  
  // Parse rainfall if mentioned
  const rainfall = extractRainfall(description);
  
  // Parse fire danger rating
  const fireDangerRating = extractFireDangerRating(description);
  
  // Determine status
  let status: WarningStatus = 'current';
  if (title.toLowerCase().includes('cancel') || title.toLowerCase().includes('cancelled')) {
    status = 'cancelled';
  } else if (title.toLowerCase().includes('update')) {
    status = 'updated';
  }
  
  // Generate unique ID from URL
  const id = Buffer.from(link || title).toString('base64').slice(0, 16);
  
  return {
    id,
    title: title.trim(),
    description: description.trim().slice(0, 500),
    type,
    severity,
    status,
    state,
    regions,
    locations: regions,
    issued: pubDate,
    updated: pubDate,
    url: link,
    windGusts,
    rainfall,
    fireDangerRating,
  };
}

// Simple XML parser for RSS feeds
function parseRssFeed(xmlText: string, state: string): BomWarning[] {
  const warnings: BomWarning[] = [];
  
  // Extract items using regex (BOM RSS uses CDATA sections)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || 
                       itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    
    // Extract description
    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
                      itemXml.match(/<description>([\s\S]*?)<\/description>/i);
    
    // Extract publication date
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
    
    // Extract link
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i) ||
                      itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/i);
    
    // Extract category
    const categoryMatch = itemXml.match(/<category><!\[CDATA\[(.*?)\]\]><\/category>/i) ||
                          itemXml.match(/<category>(.*?)<\/category>/i);
    
    const item = {
      title: titleMatch?.[1]?.trim() || '',
      description: descMatch?.[1]?.trim() || '',
      pubDate: dateMatch?.[1]?.trim() || new Date().toISOString(),
      link: linkMatch?.[1]?.trim() || '',
      category: categoryMatch?.[1]?.trim() || '',
    };
    
    // Skip cancelled warnings or items without valid data
    if (item.title && !item.title.toLowerCase().includes('cancel')) {
      warnings.push(parseRssItem(item, state));
    }
  }
  
  return warnings;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  const state = searchParams.get('state')?.toUpperCase() || 'WA';
  const regions = searchParams.get('regions')?.split(',').map(r => r.trim().toLowerCase());
  
  try {
    if (action === 'all') {
      // Fetch warnings for specified state
      const feedUrl = BOM_RSS_FEEDS[state];
      
      if (!feedUrl) {
        return NextResponse.json({
          success: false,
          error: `Invalid state: ${state}. Valid states: ${Object.keys(BOM_RSS_FEEDS).join(', ')}`
        }, { status: 400 });
      }
      
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        // Cache for 5 minutes at fetch level
        next: { revalidate: 300 }
      });
      
      if (!response.ok) {
        throw new Error(`BOM RSS feed returned ${response.status}`);
      }
      
      const xmlText = await response.text();
      let warnings = parseRssFeed(xmlText, state);
      
      // Filter by regions if specified
      if (regions && regions.length > 0) {
        warnings = warnings.filter(w => 
          w.regions.some(r => 
            regions.some(filter => 
              r.toLowerCase().includes(filter) || filter.includes(r.toLowerCase())
            )
          )
        );
      }
      
      // Filter out cancelled warnings
      warnings = warnings.filter(w => w.status !== 'cancelled');
      
      // Group by severity
      const bySeverity = {
        emergency: warnings.filter(w => w.severity === 'emergency'),
        warning: warnings.filter(w => w.severity === 'warning'),
        watch: warnings.filter(w => w.severity === 'watch'),
        advice: warnings.filter(w => w.severity === 'advice'),
      };
      
      // Group by type
      const byType: Record<string, BomWarning[]> = {};
      warnings.forEach(w => {
        if (!byType[w.type]) byType[w.type] = [];
        byType[w.type].push(w);
      });
      
      return NextResponse.json({
        success: true,
        state,
        count: warnings.length,
        warnings,
        bySeverity,
        byType,
        lastUpdated: new Date().toISOString(),
        source: 'Bureau of Meteorology'
      });
    }
    
    if (action === 'states') {
      return NextResponse.json({
        success: true,
        states: Object.keys(BOM_RSS_FEEDS),
        feeds: BOM_RSS_FEEDS
      });
    }
    
    if (action === 'all-states') {
      // Fetch warnings from all states in parallel
      const results = await Promise.allSettled(
        Object.entries(BOM_RSS_FEEDS).map(async ([stateCode, feedUrl]) => {
          try {
            const response = await fetch(feedUrl, {
              headers: {
                'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)'
              },
              next: { revalidate: 300 }
            });
            const xmlText = await response.text();
            const warnings = parseRssFeed(xmlText, stateCode);
            return { state: stateCode, warnings, success: true };
          } catch (e) {
            return { state: stateCode, warnings: [], success: false, error: String(e) };
          }
        })
      );
      
      const allWarnings: Record<string, { warnings: BomWarning[], success: boolean }> = {};
      
      results.forEach((result, index) => {
        const stateCode = Object.keys(BOM_RSS_FEEDS)[index];
        if (result.status === 'fulfilled') {
          allWarnings[stateCode] = {
            warnings: result.value.warnings,
            success: result.value.success
          };
        } else {
          allWarnings[stateCode] = {
            warnings: [],
            success: false
          };
        }
      });
      
      return NextResponse.json({
        success: true,
        warningsByState: allWarnings,
        lastUpdated: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: all, states, or all-states'
    }, { status: 400 });
    
  } catch (error) {
    console.error('BOM Warnings API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch BOM warnings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
