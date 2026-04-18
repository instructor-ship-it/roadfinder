# Troubleshooting Guide

This guide covers common issues encountered when using or developing the TC Work Zone Locator application, along with their solutions. Issues are organized by category for easy navigation.

## Table of Contents

- [GPS and Location Issues](#gps-and-location-issues)
- [Offline Mode Issues](#offline-mode-issues)
- [Data Synchronization Issues](#data-synchronization-issues)
- [Map Display Issues](#map-display-issues)
- [Performance Issues](#performance-issues)
- [Development Environment Issues](#development-environment-issues)
- [Build and Deployment Issues](#build-and-deployment-issues)
- [Browser Compatibility Issues](#browser-compatibility-issues)
- [Error Messages Reference](#error-messages-reference)

---

## GPS and Location Issues

### GPS Not Getting Location

**Symptoms:**
- "Waiting for GPS" message persists
- Location marker doesn't appear on map
- SLK values don't update while driving

**Possible Causes and Solutions:**

1. **Browser Permission Denied**
   - Check browser location permissions
   - Chrome: Click the lock icon in the address bar → Site settings → Location → Allow
   - Safari: Safari → Preferences → Websites → Location → Allow
   - Firefox: Click the location icon in the address bar → Clear the "Temporarily Blocked" status

2. **HTTPS Required**
   - Geolocation API requires HTTPS (except for localhost)
   - Ensure you're accessing via `https://` or `http://localhost`
   - Self-signed certificates may not work in some browsers

3. **Device Location Services Disabled**
   - **Windows**: Settings → Privacy → Location → Enable location services
   - **macOS**: System Preferences → Security & Privacy → Privacy → Location Services → Enable
   - **iOS**: Settings → Privacy → Location Services → Enable
   - **Android**: Settings → Location → Enable

4. **GPS Hardware Issues**
   - Try opening Google Maps or another GPS app to verify hardware works
   - Restart the device if GPS has been on for extended periods
   - Move to an area with better sky visibility (away from tall buildings)

### GPS Accuracy Issues

**Symptoms:**
- Location jumps around erratically
- SLK values fluctuate wildly
- Position shows off-road when on the road

**Solutions:**

1. **Wait for Better Accuracy**
   - GPS accuracy improves with time as more satellites are acquired
   - The app shows accuracy in meters; wait until it's below 20m for reliable results

2. **Check Device Settings**
   - Enable "High Accuracy" mode on Android devices
   - Ensure Wi-Fi and Bluetooth scanning are enabled for assisted GPS

3. **Environmental Factors**
   - GPS is less accurate in urban canyons, tunnels, and under heavy tree cover
   - Weather conditions can affect GPS signal quality

4. **Calibration (Mobile Devices)**
   - On Android: Open Google Maps → Blue dot → Calibrate → Follow instructions
   - On iOS: No manual calibration; rotate device in figure-8 motion if prompted

### Direction Detection Not Working

**Symptoms:**
- Direction shows as "Unknown"
- Work zones appear for both directions when should be filtered

**Solutions:**

1. **Movement Required**
   - Direction detection requires movement (minimum 5 km/h)
   - Start driving before direction filtering activates

2. **Compass Calibration**
   - Wave device in figure-8 pattern to calibrate compass
   - Avoid using near magnetic interference (metal objects, speakers)

3. **Check Device Orientation**
   - Ensure device is mounted in a consistent orientation
   - Some dash mounts can interfere with compass readings

---

## Offline Mode Issues

### Offline Data Not Available

**Symptoms:**
- "No offline data" message appears
- Download button doesn't work
- Data appears to download but isn't available offline

**Solutions:**

1. **Check IndexedDB Storage**
   - Open browser DevTools → Application → Storage → IndexedDB
   - Look for databases named `work-zone-db`, `roads-db`, `speed-zones-db`
   - If missing, try downloading again

2. **Clear and Re-download**
   ```javascript
   // Run in browser console to clear all offline data
   indexedDB.deleteDatabase('work-zone-db');
   indexedDB.deleteDatabase('roads-db');
   indexedDB.deleteDatabase('speed-zones-db');
   // Then re-download from the app
   ```

3. **Check Storage Quota**
   - Open DevTools → Application → Storage → Quota
   - If quota is exceeded, clear some data or use incognito mode for testing

4. **Service Worker Issues**
   ```javascript
   // Check service worker status in console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     console.log('Registered service workers:', registrations.length);
   });
   
   // Unregister all service workers
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

### Download Fails or Times Out

**Symptoms:**
- Download progress bar stops mid-way
- "Download failed" error message
- Partial data in offline storage

**Solutions:**

1. **Check Network Connection**
   - Large datasets (roads, speed zones) require stable connection
   - Try downloading over Wi-Fi instead of cellular

2. **Download in Smaller Batches**
   - Download one region at a time instead of all regions
   - Use the region selector to limit data scope

3. **Increase Timeout (Development)**
   ```typescript
   // In download-roads.js, increase timeout
   const response = await fetch(url, {
     signal: AbortSignal.timeout(300000) // 5 minutes
   });
   ```

4. **Check Server Response**
   - Open DevTools → Network tab
   - Look for failed requests (red entries)
   - Check response status codes and error messages

### Offline Data Out of Sync

**Symptoms:**
- Offline data doesn't match online data
- Missing new work zones
- Incorrect speed limits

**Solutions:**

1. **Check Last Sync Date**
   - The app shows when offline data was last downloaded
   - If more than a week old, consider re-downloading

2. **Manual Sync**
   - Go to Settings → Offline Data
   - Click "Check for Updates"
   - Download if updates are available

3. **Background Sync Issues**
   - Background sync may fail if app isn't opened regularly
   - Manually trigger sync by opening the app

---

## Data Synchronization Issues

### Weather Data Not Loading

**Symptoms:**
- Weather section shows "Unable to load weather"
- Weather warnings don't appear
- BOM alerts missing

**Solutions:**

1. **Check BOM API Status**
   - Bureau of Meteorology APIs occasionally have outages
   - Visit [BOM Status Page](http://www.bom.gov.au/) to check for known issues

2. **CORS Issues**
   - BOM API requires proper CORS headers
   - If developing locally, ensure proxy is configured:
   ```javascript
   // next.config.mjs
   async rewrites() {
     return [
       {
         source: '/api/bom/:path*',
         destination: 'http://www.bom.gov.au/:path*'
       }
     ];
   }
   ```

3. **Rate Limiting**
   - BOM API may rate-limit frequent requests
   - Weather data is cached for 30 minutes; wait before retrying

### Work Zone Data Not Updating

**Symptoms:**
- Old work zones still showing
- New zones not appearing
- Data appears stale

**Solutions:**

1. **Check Data Source**
   - Work zones are sourced from Main Roads WA
   - Verify source data at Main Roads Open Data portal

2. **Force Refresh**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

3. **API Route Issues**
   - Check DevTools → Network for API errors
   - Verify `/api/sync-data` endpoint is responding

---

## Map Display Issues

### Map Tiles Not Loading

**Symptoms:**
- Gray or blank map areas
- "Map data not available" errors
- Partial tile loading

**Solutions:**

1. **Check Internet Connection**
   - Map tiles are loaded from OpenStreetMap servers
   - Requires active internet connection (not available offline)

2. **Tile Server Issues**
   - OpenStreetMap servers occasionally have outages
   - Try refreshing the page

3. **CORS or Ad Blocker**
   - Some ad blockers block tile servers
   - Add exception for `tile.openstreetmap.org`

### Map Markers Not Appearing

**Symptoms:**
- Work zones don't show on map
- Signage markers missing
- Saved locations not visible

**Solutions:**

1. **Check Data Availability**
   - Ensure work zones exist for the selected road/region
   - Try a different road to verify marker functionality

2. **Browser Console Errors**
   - Open DevTools → Console
   - Look for JavaScript errors related to markers or layers

3. **Z-Index Issues**
   - Markers may be hidden behind other layers
   - Check if layer toggle is enabled

### Map Performance Lag

**Symptoms:**
- Panning/zooming is slow
- Map takes time to respond
- Browser becomes unresponsive

**Solutions:**

1. **Too Many Markers**
   - Limit the number of work zones displayed simultaneously
   - Use the "Set Distance" filter to reduce displayed items

2. **Hardware Acceleration**
   - Enable hardware acceleration in browser settings
   - Update graphics drivers

3. **Browser Memory**
   - Close other tabs to free memory
   - Restart browser if memory usage is high

---

## Performance Issues

### App Loading Slowly

**Symptoms:**
- Initial load takes more than 10 seconds
- White screen before app appears
- Slow page transitions

**Solutions:**

1. **Clear Browser Cache**
   - Old cached assets may conflict with new versions
   - Hard refresh (Ctrl+F5) or clear cache

2. **Check Bundle Size**
   - Large JavaScript bundles slow initial load
   - Run `bun run build` and check output sizes

3. **Network Speed**
   - Test on different network connections
   - Consider using offline mode for frequently accessed data

### Search/Filter Performance

**Symptoms:**
- Typing in search feels laggy
- Filters take time to apply
- Results appear slowly

**Solutions:**

1. **Use Debouncing**
   - Search inputs are debounced to avoid excessive processing
   - Wait 300ms after typing for results

2. **Large Dataset Issues**
   - Roads dataset contains 50,000+ entries
   - Consider downloading only needed regions

3. **Index Rebuild**
   ```javascript
   // Rebuild IndexedDB indexes if corruption suspected
   indexedDB.deleteDatabase('roads-db');
   // Then re-download
   ```

---

## Development Environment Issues

### Dependencies Installation Fails

**Symptoms:**
- `bun install` fails with errors
- Peer dependency warnings
- Package not found errors

**Solutions:**

1. **Clear Lock File**
   ```bash
   rm bun.lock
   bun install
   ```

2. **Node/Bun Version**
   - Ensure you're using Node.js 18+ or Bun 1.0+
   - Check version: `node -v` or `bun -v`

3. **Registry Issues**
   ```bash
   # Try with different registry
   bun install --registry https://registry.npmjs.org
   ```

### TypeScript Errors

**Symptoms:**
- `bun run typecheck` fails
- IDE shows type errors
- Build fails with type errors

**Solutions:**

1. **Regenerate Types**
   ```bash
   bun run db:generate  # Regenerate Prisma types
   ```

2. **Check Import Paths**
   - Ensure `@/` aliases are correctly configured
   - Check `tsconfig.json` paths configuration

3. **Stale Build Cache**
   ```bash
   rm -rf .next
   rm tsconfig.tsbuildinfo
   bun run typecheck
   ```

### Hot Reload Not Working

**Symptoms:**
- Code changes don't reflect in browser
- Manual refresh required
- HMR errors in console

**Solutions:**

1. **Clear Next.js Cache**
   ```bash
   rm -rf .next
   bun run dev
   ```

2. **Check File Watcher Limits**
   - Linux: `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf`
   - Apply: `sudo sysctl -p`

3. **WSL2 Specific**
   - Files on Windows filesystem may not trigger hot reload
   - Move project to WSL filesystem (`~/`)

---

## Build and Deployment Issues

### Build Fails

**Symptoms:**
- `bun run build` exits with error
- Out of memory during build
- Compilation errors

**Solutions:**

1. **Increase Node Memory**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" bun run build
   ```

2. **Check Build Output**
   - Read error messages carefully
   - Often points to specific file/line causing issue

3. **Clean Build**
   ```bash
   rm -rf .next node_modules
   bun install
   bun run build
   ```

### Deployment Fails on Vercel

**Symptoms:**
- Vercel build times out
- Deployment fails with errors
- Environment variables missing

**Solutions:**

1. **Check Vercel Logs**
   - Review build logs for specific errors
   - Common issues: missing env vars, memory limits

2. **Environment Variables**
   - Ensure all required env vars are set in Vercel dashboard
   - Check for typos in variable names

3. **Function Timeout**
   - API routes may timeout if processing large data
   - Consider using Vercel's Edge Functions for better performance

### Production Server Issues

**Symptoms:**
- Server crashes on start
- API routes return 500 errors
- Memory leaks

**Solutions:**

1. **Check Server Logs**
   ```bash
   # Logs are written to server.log
   tail -f server.log
   ```

2. **Memory Issues**
   - Monitor memory usage: `top` or `htop`
   - Increase available memory or optimize code

3. **Database Connection**
   - Check Prisma connection string
   - Verify database is accessible from server

---

## Browser Compatibility Issues

### Safari-Specific Issues

**Symptoms:**
- Features work in Chrome but not Safari
- Layout issues on Safari
- Touch events not working

**Solutions:**

1. **IndexedDB Limitations**
   - Safari has stricter storage limits (7% of available disk)
   - User must grant persistent storage permission

2. **Service Worker**
   - Safari requires HTTPS for service workers
   - Service worker scope must be correct

3. **Date/Time Handling**
   - Safari has different date parsing
   - Use `date-fns` library for consistent behavior

### Mobile Browser Issues

**Symptoms:**
- App doesn't work on mobile
- Touch targets too small
- Layout breaks on small screens

**Solutions:**

1. **Viewport Meta Tag**
   - Ensure viewport meta tag is present
   - Check `public/manifest.json` for PWA settings

2. **Touch Events**
   - Use `touch-action` CSS for proper touch handling
   - Increase touch target sizes to 44x44px minimum

3. **Address Bar Behavior**
   - Account for dynamic viewport height on mobile browsers
   - Use `dvh` units for dynamic viewport height

---

## Error Messages Reference

### Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Failed to fetch` | Network request failed | Check internet connection; verify API endpoint |
| `QuotaExceededError` | Storage quota exceeded | Clear old data; reduce download scope |
| `Position unavailable` | GPS couldn't get location | Check permissions; move to better location |
| `Permission denied` | User denied permission | Grant permission in browser/device settings |
| `Network error` | Connection lost | Check network; retry request |
| `Invalid SLK` | SLK value out of range | Enter SLK within road segment range |
| `Region not found` | Invalid region code | Select valid region from list |
| `Work zone not found` | No work zones for criteria | Check road selection; expand search radius |

### IndexedDB Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | `UnknownError` | Generic error; check console for details |
| 1 | `ConstraintError` | Duplicate key or constraint violation |
| 2 | `DataError` | Invalid data provided |
| 3 | `TransactionInactiveError` | Transaction completed or aborted |
| 4 | `ReadOnlyError` | Attempted write in read-only transaction |
| 5 | `VersionError` | Database version mismatch |

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Backend error; check server logs |
| 502 | Bad Gateway | Upstream server error |
| 503 | Unavailable | Server temporarily down |

---

## Getting Additional Help

If your issue isn't covered in this guide:

1. **Check Existing Issues**
   - Search [GitHub Issues](https://github.com/your-repo/issues) for similar problems

2. **Enable Debug Logging**
   ```javascript
   // In browser console
   localStorage.setItem('debug', 'true');
   // Refresh page to see verbose logs
   ```

3. **Collect Diagnostic Information**
   - Browser and version
   - Operating system
   - Device type (desktop/mobile)
   - Console error messages
   - Network tab showing failed requests
   - Steps to reproduce

4. **Report a Bug**
   - Open a new issue on GitHub
   - Include diagnostic information
   - Describe expected vs actual behavior

---

## Prevention Tips

To avoid common issues:

1. **Regular Updates**
   - Keep browser updated
   - Update app when new versions are available

2. **Data Hygiene**
   - Re-download offline data weekly
   - Clear old saved locations periodically

3. **Permission Management**
   - Grant necessary permissions on first use
   - Don't deny permissions unless necessary

4. **Network Awareness**
   - Ensure stable connection for data-intensive operations
   - Use Wi-Fi for large downloads

5. **Regular Maintenance**
   - Clear browser cache monthly
   - Check storage usage periodically
