# BOM Weather Warnings Integration - Concept Design

## Overview

This document shows how the TC Work Zone Locator could integrate live weather warnings from the Bureau of Meteorology (BOM) into the application.

---

## Data Source

**Bureau of Meteorology (BOM) - Australia's National Weather Authority**

- RSS Feeds: `www.bom.gov.au/rss`
- FTP Access: `ftp://ftp.bom.gov.au/anon/gen/fwo/`
- Website: `www.bom.gov.au/weather-and-climate/warnings-and-alerts`
- Update Frequency: Real-time (as warnings are issued/updated)
- Format: RSS/XML or FTP XML files

**RSS Feed URLs by State:**

| State | RSS Feed URL |
|-------|-------------|
| WA | `http://www.bom.gov.au/wa/warnings/rss.xml` |
| NSW | `http://www.bom.gov.au/nsw/warnings/rss.xml` |
| VIC | `http://www.bom.gov.au/vic/warnings/rss.xml` |
| QLD | `http://www.bom.gov.au/qld/warnings/rss.xml` |
| SA | `http://www.bom.gov.au/sa/warnings/rss.xml` |
| TAS | `http://www.bom.gov.au/tas/warnings/rss.xml` |
| NT | `http://www.bom.gov.au/nt/warnings/rss.xml` |
| ACT | `http://www.bom.gov.au/act/warnings/rss.xml` |

---

## Data Structure

### BOM Warning Interface

```typescript
interface BomWarning {
  id: string;                    // Unique warning identifier
  title: string;                 // Warning headline
  description: string;           // Full warning text
  type: WarningType;             // Category of warning
  severity: WarningSeverity;     // Impact level
  status: WarningStatus;         // Current state
  
  // Location
  state: string;                 // e.g., 'WA', 'NSW'
  regions: string[];             // Affected forecast districts
  locations: string[];           // Specific towns/areas
  
  // Timing
  issued: string;                // ISO timestamp when issued
  updated: string;               // ISO timestamp last updated
  expires?: string;              // ISO timestamp when warning ends
  
  // Links
  url: string;                   // Link to full BOM warning page
  
  // Parsed metadata
  windGusts?: number;            // km/h if applicable
  rainfall?: number;             // mm if applicable
  temperature?: number;          // °C if applicable
  fireDangerRating?: string;     // For fire weather warnings
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
  | 'other';

type WarningSeverity = 
  | 'advice'      // Be aware
  | 'watch'       // Be prepared  
  | 'warning'     // Take action
  | 'emergency';  // Highest priority

type WarningStatus = 
  | 'current'
  | 'updated'
  | 'cancelled'
  | 'expired';
```

### RSS Feed Item Structure

```xml
<item>
  <title>Severe Weather Warning for Heavy Rain</title>
  <description>For people in parts of Kimberley, North Interior...</description>
  <category>Severe Weather Warning</category>
  <pubDate>Tue, 25 Mar 2025 14:30:00 +0800</pubDate>
  <link>http://www.bom.gov.au/wa/warnings/severe_weather.shtml</link>
  <guid isPermaLink="true">http://www.bom.gov.au/wa/warnings/severe_weather.shtml</guid>
</item>
```

---

## UI Integration

### 1. Home Page - Weather Warnings Section

Add a collapsible "Weather Warnings" section below the Road Incidents:

```
┌─────────────────────────────────────┐
│ 🌩️ Weather Warnings (2 active)    › │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔴 WARNING - Severe Thunderstorm│ │
│ │ Kimberley, North Interior       │ │
│ │ Damaging winds, large hail      │ │
│ │ Issued: 2:30 PM                 │ │
│ │ [View Details]                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 WATCH - Tropical Cyclone     │ │
│ │ Pilbara Coast                   │ │
│ │ forming off coast               │ │
│ │ Issued: 1:00 PM                 │ │
│ │ [View Details]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Updated: 5 minutes ago              │
│ Source: Bureau of Meteorology       │
└─────────────────────────────────────┘
```

### 2. Drive Page - Weather Warning Banner

When driving in an area with active weather warnings:

```
┌─────────────────────────────────────┐
│ 🌩️ SEVERE THUNDERSTORM WARNING      │
│ Kimberley District                   │
│ ⚠️ Damaging winds to 90 km/h        │
│ Large hail possible                  │
│ Seek shelter if conditions worsen    │
│ [Dismiss] [BOM Details]              │
└─────────────────────────────────────┘
```

### 3. Combined Alerts Panel (Home Page)

A unified view showing both road incidents AND weather warnings:

```
┌─────────────────────────────────────┐
│ ⚠️ ACTIVE ALERTS (5)              │ │
├─────────────────────────────────────┤
│ 🔴 CRITICAL                         │
│ ┌─────────────────────────────────┐ │
│ │ 🚗 Road: M031 SLK 45.20         │ │
│ │    Crash - Both directions      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🌩️ Weather: Severe Thunderstorm │ │
│ │    Kimberley District           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🟠 MAJOR                            │
│ ┌─────────────────────────────────┐ │
│ │ 🚗 Road: H005 SLK 12.50         │ │
│ │    Roadworks - Lane closure     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Show All Alerts]                   │
└─────────────────────────────────────┘
```

### 4. Drive Page - Compact Warning Strip

For landscape mode, a compact warning strip:

```
┌───────────────────────────────────────────────────────┐
│ 🌩️ SEVERE THUNDERSTORM  │ 🚗 ROAD INCIDENT 2.3km    │
│ Kimberley - Damaging winds│ M031 Crash - Delays      │
└───────────────────────────────────────────────────────┘
```

---

## API Route Implementation

### /api/weather/warnings/route.ts

```typescript
import { NextRequest, NextResponse } from 'next-server';

// BOM RSS Feed URLs
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
  | 'other';

type WarningSeverity = 'advice' | 'watch' | 'warning' | 'emergency';
type WarningStatus = 'current' | 'updated' | 'cancelled' | 'expired';

// Parse RSS item to BomWarning
function parseRssItem(item: any, state: string): BomWarning {
  const title = item.title || '';
  const description = item.description || '';
  const pubDate = item.pubDate || new Date().toISOString();
  const link = item.link || '';
  
  // Determine warning type from title/category
  const type = determineWarningType(title, item.category);
  
  // Determine severity
  const severity = determineSeverity(title, description);
  
  // Extract affected regions from description
  const regions = extractRegions(description);
  
  // Parse wind gusts if mentioned
  const windGusts = extractWindGusts(description);
  
  // Parse rainfall if mentioned
  const rainfall = extractRainfall(description);
  
  return {
    id: Buffer.from(link).toString('base64').slice(0, 16),
    title,
    description: description.slice(0, 500), // Truncate for storage
    type,
    severity,
    status: title.toLowerCase().includes('cancel') ? 'cancelled' : 'current',
    state,
    regions,
    locations: regions, // Same as regions for now
    issued: pubDate,
    updated: pubDate,
    url: link,
    windGusts,
    rainfall,
  };
}

function determineWarningType(title: string, category: string): WarningType {
  const text = (title + ' ' + category).toLowerCase();
  
  if (text.includes('thunderstorm')) return 'severe_thunderstorm';
  if (text.includes('tropical cyclone') || text.includes('cyclone')) return 'tropical_cyclone';
  if (text.includes('flood')) return 'flood';
  if (text.includes('fire') || text.includes('fire weather')) return 'fire_weather';
  if (text.includes('severe weather')) return 'severe_weather';
  if (text.includes('wind')) return 'wind';
  if (text.includes('rain')) return 'rain';
  if (text.includes('heatwave')) return 'heatwave';
  if (text.includes('frost')) return 'frost';
  if (text.includes('fog')) return 'fog';
  
  return 'other';
}

function determineSeverity(title: string, description: string): WarningSeverity {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('emergency') || text.includes('catastrophic')) return 'emergency';
  if (text.includes('warning') && !text.includes('watch')) return 'warning';
  if (text.includes('watch') || text.includes('alert')) return 'watch';
  
  return 'advice';
}

function extractRegions(description: string): string[] {
  // BOM descriptions often list regions like "For people in parts of Kimberley, North Interior..."
  const match = description.match(/for people in (?:parts of )?([^\.]+)/i);
  if (match) {
    return match[1]
      .split(/,|and/)
      .map(r => r.trim())
      .filter(r => r.length > 2);
  }
  return [];
}

function extractWindGusts(description: string): number | undefined {
  // Look for patterns like "damaging winds to 90 km/h"
  const match = description.match(/(\d+)\s*km\/h/);
  return match ? parseInt(match[1]) : undefined;
}

function extractRainfall(description: string): number | undefined {
  // Look for patterns like "heavy rainfall of 50mm"
  const match = description.match(/(\d+)\s*mm/);
  return match ? parseInt(match[1]) : undefined;
}

// Simple XML parser (or use a library like 'xml2js')
async function parseRssFeed(xmlText: string, state: string): Promise<BomWarning[]> {
  const warnings: BomWarning[] = [];
  
  // Basic regex-based parsing (consider using proper XML parser in production)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                       itemXml.match(/<title>(.*?)<\/title>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                      itemXml.match(/<description>(.*?)<\/description>/);
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const categoryMatch = itemXml.match(/<category>(.*?)<\/category>/);
    
    const item = {
      title: titleMatch?.[1] || '',
      description: descMatch?.[1] || '',
      pubDate: dateMatch?.[1] || new Date().toISOString(),
      link: linkMatch?.[1] || '',
      category: categoryMatch?.[1] || '',
    };
    
    warnings.push(parseRssItem(item, state));
  }
  
  return warnings;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  const state = searchParams.get('state')?.toUpperCase() || 'WA';
  const regions = searchParams.get('regions')?.split(',').map(r => r.trim());
  
  try {
    if (action === 'all') {
      // Fetch warnings for specified state
      const feedUrl = BOM_RSS_FEEDS[state];
      
      if (!feedUrl) {
        return NextResponse.json({
          success: false,
          error: `Invalid state: ${state}`
        }, { status: 400 });
      }
      
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`BOM RSS feed returned ${response.status}`);
      }
      
      const xmlText = await response.text();
      let warnings = await parseRssFeed(xmlText, state);
      
      // Filter by regions if specified
      if (regions && regions.length > 0) {
        warnings = warnings.filter(w => 
          w.regions.some(r => regions.some(filter => 
            r.toLowerCase().includes(filter.toLowerCase())
          ))
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
      
      return NextResponse.json({
        success: true,
        state,
        count: warnings.length,
        warnings,
        bySeverity,
        lastUpdated: new Date().toISOString(),
        source: 'Bureau of Meteorology'
      });
    }
    
    if (action === 'states') {
      return NextResponse.json({
        success: true,
        states: Object.keys(BOM_RSS_FEEDS)
      });
    }
    
    if (action === 'all-states') {
      // Fetch warnings from all states in parallel
      const results = await Promise.allSettled(
        Object.entries(BOM_RSS_FEEDS).map(async ([stateCode, feedUrl]) => {
          const response = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)'
            }
          });
          const xmlText = await response.text();
          const warnings = await parseRssFeed(xmlText, stateCode);
          return { state: stateCode, warnings };
        })
      );
      
      const allWarnings: Record<string, BomWarning[]> = {};
      
      results.forEach((result, index) => {
        const stateCode = Object.keys(BOM_RSS_FEEDS)[index];
        if (result.status === 'fulfilled') {
          allWarnings[stateCode] = result.value.warnings;
        } else {
          allWarnings[stateCode] = [];
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
```

---

## Frontend Component

### WarningsSection.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, AlertTriangle, Loader2, ExternalLink, Wind, CloudRain } from 'lucide-react';

interface BomWarning {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: 'advice' | 'watch' | 'warning' | 'emergency';
  status: string;
  state: string;
  regions: string[];
  issued: string;
  url: string;
  windGusts?: number;
  rainfall?: number;
}

interface WarningsData {
  success: boolean;
  state: string;
  count: number;
  warnings: BomWarning[];
  lastUpdated: string;
}

interface WarningsSectionProps {
  state?: string;
  regions?: string[];
  enabled?: boolean;
}

export function WarningsSection({ state = 'WA', regions, enabled = true }: WarningsSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [warnings, setWarnings] = useState<BomWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetchWarnings();

    // Refresh every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state, regions, enabled]);

  async function fetchWarnings() {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/weather/warnings?action=all&state=${state}`;
      if (regions && regions.length > 0) {
        url += `&regions=${regions.join(',')}`;
      }

      const response = await fetch(url);
      const data: WarningsData = await response.json();

      if (data.success) {
        setWarnings(data.warnings);
        setLastUpdated(data.lastUpdated);
      } else {
        setError('Failed to load weather warnings');
      }
    } catch (err) {
      setError('Network error - unable to fetch warnings');
      console.error('Failed to fetch BOM warnings:', err);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'emergency':
        return {
          bg: 'bg-purple-900/40',
          border: 'border-purple-500/50',
          text: 'text-purple-400',
          icon: '🚨',
          label: 'EMERGENCY'
        };
      case 'warning':
        return {
          bg: 'bg-red-900/40',
          border: 'border-red-500/50',
          text: 'text-red-400',
          icon: '🔴',
          label: 'WARNING'
        };
      case 'watch':
        return {
          bg: 'bg-orange-900/40',
          border: 'border-orange-500/50',
          text: 'text-orange-400',
          icon: '🟠',
          label: 'WATCH'
        };
      default:
        return {
          bg: 'bg-blue-900/40',
          border: 'border-blue-500/50',
          text: 'text-blue-400',
          icon: '🔵',
          label: 'ADVICE'
        };
    }
  }

  function getWarningIcon(type: string) {
    switch (type) {
      case 'severe_thunderstorm':
        return '⛈️';
      case 'tropical_cyclone':
        return '🌀';
      case 'flood':
        return '🌊';
      case 'fire_weather':
        return '🔥';
      case 'wind':
        return '💨';
      case 'rain':
        return '🌧️';
      case 'heatwave':
        return '🌡️';
      default:
        return '🌩️';
    }
  }

  function formatIssuedTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-AU', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return dateStr;
    }
  }

  // Count by severity
  const emergencyCount = warnings.filter(w => w.severity === 'emergency').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;
  const watchCount = warnings.filter(w => w.severity === 'watch').length;

  if (!enabled) return null;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <AlertTriangle className={`h-4 w-4 ${warnings.length > 0 ? 'text-amber-400' : 'text-gray-400'}`} />
          <span className="font-medium text-sm">
            🌩️ Weather Warnings
            {warnings.length > 0 && (
              <span className="ml-2 text-amber-400">({warnings.length} active)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {warnings.length > 0 && (
            <div className="flex gap-1 text-xs">
              {emergencyCount > 0 && (
                <span className="bg-purple-600 px-1.5 py-0.5 rounded">{emergencyCount}</span>
              )}
              {warningCount > 0 && (
                <span className="bg-red-600 px-1.5 py-0.5 rounded">{warningCount}</span>
              )}
              {watchCount > 0 && (
                <span className="bg-orange-600 px-1.5 py-0.5 rounded">{watchCount}</span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-700">
          {error && (
            <div className="p-4 text-center text-red-400 text-sm">
              {error}
              <button
                onClick={fetchWarnings}
                className="block mx-auto mt-2 text-blue-400 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!error && warnings.length === 0 && !loading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>No active weather warnings for {state}</p>
              <p className="text-xs mt-1">Data from Bureau of Meteorology</p>
            </div>
          )}

          {!error && warnings.length > 0 && (
            <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
              {warnings.map((warning) => {
                const styles = getSeverityStyles(warning.severity);
                const warningIcon = getWarningIcon(warning.type);
                
                return (
                  <div
                    key={warning.id}
                    className={`p-3 ${styles.bg} border-l-2 ${styles.border}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{styles.icon}</span>
                        <span className={`text-xs font-bold uppercase ${styles.text}`}>
                          {styles.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatIssuedTime(warning.issued)}
                      </span>
                    </div>

                    {/* Warning type & icon */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xl">{warningIcon}</span>
                      <div>
                        <span className={`text-sm font-medium ${styles.text}`}>
                          {warning.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Affected regions */}
                    <div className="mt-2">
                      <p className="text-sm text-gray-300">
                        {warning.regions.slice(0, 4).join(', ')}
                        {warning.regions.length > 4 && ` +${warning.regions.length - 4} more`}
                      </p>
                    </div>

                    {/* Description snippet */}
                    <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                      {warning.description.slice(0, 150)}...
                    </p>

                    {/* Weather details */}
                    {(warning.windGusts || warning.rainfall) && (
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        {warning.windGusts && (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Wind className="h-3 w-3" />
                            {warning.windGusts} km/h gusts
                          </span>
                        )}
                        {warning.rainfall && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <CloudRain className="h-3 w-3" />
                            {warning.rainfall} mm
                          </span>
                        )}
                      </div>
                    )}

                    {/* BOM Link */}
                    <div className="mt-2 flex justify-end">
                      <Button
                        onClick={() => window.open(warning.url, '_blank')}
                        className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        BOM Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {lastUpdated && (
            <div className="px-3 py-2 bg-gray-900 text-xs text-gray-500 text-center">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
              {' • '}
              Source: Bureau of Meteorology
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Drive Page Integration

### Weather Warning Banner Component

```typescript
// components/WeatherWarningBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface BomWarning {
  id: string;
  title: string;
  type: string;
  severity: 'advice' | 'watch' | 'warning' | 'emergency';
  regions: string[];
  description: string;
  url: string;
  windGusts?: number;
}

interface WeatherWarningBannerProps {
  state?: string;
  currentRegion?: string;
  enabled?: boolean;
}

export function WeatherWarningBanner({ 
  state = 'WA', 
  currentRegion, 
  enabled = true 
}: WeatherWarningBannerProps) {
  const [warnings, setWarnings] = useState<BomWarning[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastFetch, setLastFetch] = useState<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    // Only fetch every 5 minutes
    if (now - lastFetch < 5 * 60 * 1000) return;

    fetchWarnings();

    // Refresh every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state, currentRegion, enabled]);

  async function fetchWarnings() {
    try {
      const response = await fetch(
        `/api/weather/warnings?action=all&state=${state}`
      );
      const data = await response.json();

      if (data.success && data.warnings) {
        // Filter to only warning and emergency severity, and not dismissed
        const relevantWarnings = data.warnings.filter(
          (w: BomWarning) => 
            (w.severity === 'warning' || w.severity === 'emergency') && 
            !dismissed.has(w.id) &&
            (!currentRegion || w.regions.some(r => 
              r.toLowerCase().includes(currentRegion.toLowerCase()) ||
              currentRegion.toLowerCase().includes(r.toLowerCase())
            ))
        );
        setWarnings(relevantWarnings);
        setLastFetch(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch weather warnings:', err);
    }
  }

  function dismissWarning(id: string) {
    setDismissed(prev => new Set([...prev, id]));
    setWarnings(prev => prev.filter(w => w.id !== id));
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'emergency':
        return {
          bg: 'bg-purple-900/70',
          border: 'border-purple-500',
          text: 'text-purple-200',
          pulse: 'animate-pulse'
        };
      case 'warning':
        return {
          bg: 'bg-red-900/60',
          border: 'border-red-500',
          text: 'text-red-200',
          pulse: ''
        };
      default:
        return {
          bg: 'bg-orange-900/50',
          border: 'border-orange-500',
          text: 'text-orange-200',
          pulse: ''
        };
    }
  }

  function getWarningIcon(type: string) {
    switch (type) {
      case 'severe_thunderstorm': return '⛈️';
      case 'tropical_cyclone': return '🌀';
      case 'flood': return '🌊';
      case 'fire_weather': return '🔥';
      default: return '🌩️';
    }
  }

  if (!enabled || warnings.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {warnings.map((warning) => {
        const styles = getSeverityStyles(warning.severity);
        const icon = getWarningIcon(warning.type);
        
        return (
          <div
            key={warning.id}
            className={`${styles.bg} border ${styles.border} rounded-lg p-3 ${styles.pulse}`}
            style={{ animationDuration: '3s' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className={`text-sm font-bold uppercase ${styles.text}`}>
                    {warning.severity} - {warning.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-white text-sm mt-1">
                  {warning.regions.slice(0, 3).join(', ')}
                </p>
                <p className="text-gray-200 text-xs mt-1 line-clamp-2">
                  {warning.description.slice(0, 120)}...
                </p>
                {warning.windGusts && (
                  <p className="text-cyan-300 text-xs mt-2">
                    ⚠️ Wind gusts to {warning.windGusts} km/h
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.open(warning.url, '_blank')}
                  className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                  BOM
                </button>
                <button
                  onClick={() => dismissWarning(warning.id)}
                  className="flex items-center justify-center text-gray-400 hover:text-white px-2 py-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Integration in Home Page

```typescript
// In src/app/page.tsx

import { WarningsSection } from '@/components/WarningsSection';

// Add below the IncidentsSection:
<WarningsSection 
  state="WA"  // Or derive from selected region
  enabled={true} 
/>
```

---

## Integration in Drive Page

```typescript
// In src/app/drive/page.tsx

import { WeatherWarningBanner } from '@/components/WeatherWarningBanner';

// Add in the portrait layout, before the main content:
<WeatherWarningBanner 
  state="WA" 
  currentRegion={roadInfo?.region} // If you have region info
  enabled={isTracking && !!roadInfo} 
/>
```

---

## Caching Strategy

```typescript
// Cache warnings for 5 minutes
const WARNINGS_CACHE_KEY = 'bom_warnings_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedWarnings {
  timestamp: number;
  state: string;
  warnings: BomWarning[];
}

function getCachedWarnings(state: string): BomWarning[] | null {
  const cached = localStorage.getItem(WARNINGS_CACHE_KEY);
  if (!cached) return null;

  const data: CachedWarnings = JSON.parse(cached);
  if (data.state !== state) return null;
  if (Date.now() - data.timestamp > CACHE_DURATION) return null;

  return data.warnings;
}

function setCachedWarnings(state: string, warnings: BomWarning[]) {
  const data: CachedWarnings = {
    timestamp: Date.now(),
    state,
    warnings
  };
  localStorage.setItem(WARNINGS_CACHE_KEY, JSON.stringify(data));
}
```

---

## Benefits for Traffic Controllers

1. **Weather Awareness** - Know about approaching severe weather before it hits the work zone
2. **Safety Planning** - Prepare for high winds, heavy rain, or extreme heat
3. **Work Scheduling** - Adjust work plans based on weather warnings
4. **Equipment Protection** - Secure signs and equipment before storms
5. **Compliance** - Some traffic control operations have weather-related restrictions

---

## Limitations

1. **Internet Required** - Warnings need live internet connection
2. **Regional Matching** - Matching warning regions to road locations may not be exact
3. **RSS Reliability** - BOM RSS feeds are best-effort, not guaranteed uptime
4. **Warning Interpretation** - Users need to understand warning severity levels

---

## Alternative: Direct BOM Links

If full integration is not desired, simple links to BOM can be provided:

```typescript
const BOM_LINKS = {
  waWarnings: 'http://www.bom.gov.au/wa/warnings/',
  waRadar: 'http://www.bom.gov.au/wa/observations/',
  waForecast: 'http://www.bom.gov.au/wa/forecasts/perth.shtml',
};

// In UI:
<Button onClick={() => window.open(BOM_LINKS.waWarnings, '_blank')}>
  🌩️ BOM WA Warnings
</Button>
```

---

*This is a conceptual design based on BOM's publicly available RSS feeds. Implementation would require testing with live data and consideration of BOM's terms of use.*
