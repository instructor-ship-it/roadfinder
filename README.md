# TC Work Zone Locator

A mobile-friendly web application for Traffic Controller (TC) work zone planning and real-time SLK (Straight Line Kilometre) tracking using Main Roads WA ArcGIS data.

## Features

### 📍 Work Zone Location Lookup
- Search roads by region and road ID
- Enter SLK (Start/End) to get work zone coordinates
- Get TC positions (±100m from work zone)
- View speed zones for the corridor
- See intersecting roads within the TC zone
- Navigate directly to Google Maps

### 📦 Offline SLK Tracking
- Download road data for offline use (no internet required)
- Real-time GPS-based SLK tracking
- Direction indicator (towards/away from target)
- Speed limit display from MRWA data
- Speed warning (turns red when over limit)
- SLK calibration for fine-tuning accuracy

### 🗺️ Navigation Integration
- One-tap navigation to Google Maps
- Street View links for all locations
- Direct link to start SLK tracking from any result

### 🌤️ Weather & Traffic Data
- Current weather conditions at work zone
- Sunrise/sunset times and daylight hours
- UV index with safety levels
- 8-hour weather forecast
- Traffic volume (AADT) data

### 🏥 Nearby Amenities
- Nearest hospital with emergency status
- Fuel stations
- Public toilets
- Distance and navigation links

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Modern web browser with Geolocation support

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

### Production Build

```bash
bun run build
bun start
```

## Usage Guide

### Work Zone Lookup
1. Select a **Region** (e.g., Wheatbelt, Metropolitan)
2. Select a **Road ID** from the dropdown
3. Enter **Start SLK** (and optionally End SLK)
4. Click **"Get Work Zone Info"**
5. View results including TC positions, speed zones, weather, and nearby amenities

### GPS Location Lookup
1. Expand **"📍 Find by GPS Location"**
2. Click **"Get My Location"** or enter coordinates manually
3. The app will auto-fill the road and SLK based on your location

### Offline SLK Tracking
1. Click the **⚙️ setup icon** in the header
2. Click **"Download Data"** to store road data locally
3. Click **"📍 Start SLK Tracking"** to begin real-time tracking
4. The app works offline after downloading data

#### SLK Calibration
If the SLK reading is inaccurate:
1. While tracking, tap **"🎯 Calibrate SLK"**
2. Enter the known correct SLK at your location
3. The offset is saved per-road for future use

### Direction Color Codes
- 🟢 **Green** - Moving towards target SLK
- 🔴 **Red (blinking)** - Moving away from target SLK
- 🟡 **Yellow** - Stationary

## Data Sources

- **Road Data**: Main Roads WA ArcGIS REST API
  - Layer 18: Road Network with SLK geometry
  - Layer 8: Speed Zones
- **Weather**: Open-Meteo API
- **Traffic**: Main Roads WA Traffic Count Data
- **Amenities**: Overpass API (OpenStreetMap)

## Technical Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Offline Storage**: IndexedDB (client-side)
- **Maps**: Google Maps Links (no API key required)

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main work zone lookup page
│   ├── drive/page.tsx    # SLK tracking page
│   └── api/              # API routes
│       ├── roads/        # Road data queries
│       ├── gps/          # GPS to SLK conversion
│       ├── sync-data/    # Offline data download
│       ├── weather/      # Weather data
│       ├── traffic/      # Traffic volume
│       ├── places/       # Nearby amenities
│       └── intersections/# Cross road detection
├── lib/
│   ├── offline-db.ts     # IndexedDB client-side storage
│   └── offline-data.ts   # Server-side data loading
└── components/ui/        # UI components
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/roads` | GET | List regions and roads |
| `/api/roads` | POST | Get SLK coordinates |
| `/api/gps` | GET | Convert GPS to SLK |
| `/api/sync-data` | POST | Download offline data |
| `/api/weather` | GET | Weather at coordinates |
| `/api/traffic` | GET | Traffic volume data |
| `/api/places` | GET | Nearby amenities |
| `/api/intersections` | GET | Cross roads in zone |

## Browser Support

- Chrome (recommended)
- Safari
- Firefox
- Edge

**Note**: Geolocation requires HTTPS in production.

## Version History

### v2.5.5 (Current)
- Fixed TypeScript build error (parameter order)
- Region-based downloading (downloads one region at a time)
- Avoids Vercel timeout by fetching smaller chunks

### v2.5.4
- Region-based downloading (downloads one region at a time)
- Avoids Vercel timeout by fetching smaller chunks
- Better progress messages showing current region
- Continues with other regions if one fails

### v2.5.3
- Changed to client-side downloading (bypasses server restrictions)
- Downloads road data directly from browser to MRWA API
- Better progress messages during download
- Connection test before starting download

### v2.5.2
- Improved offline data download with timeout handling
- Added connectivity test before downloading
- Shows detailed error messages from API
- Smaller batch sizes for more reliable downloads
- Better error recovery during fetch

### v2.5.1
- Added setup icon (⚙️) for offline data download
- Added auto-start SLK tracking button
- Added Street View links to all navigation buttons
- Shows offline ready status indicator

### v2.5
- Client-side IndexedDB for true offline support
- SLK calibration per road
- Direction color coding (towards/away/static)
- Speed limit from MRWA data
- Speed warning indicator

### v2.4
- Weather and UV index integration
- Traffic volume data
- Nearby amenities

### v2.0
- Complete rewrite with Next.js App Router
- MRWA ArcGIS API integration
- Work zone calculation

## License

This project is for internal use by Traffic Controllers for work zone planning and navigation.

## Acknowledgments

- Main Roads Western Australia for providing open road data
- OpenStreetMap contributors for amenity data
- Open-Meteo for weather API
