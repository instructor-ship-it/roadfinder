'use client';

import { WarningsSection } from '@/components/WarningsSection';
import { WeatherData, WarningData } from '@/types/shared';

interface WeatherSectionProps {
  weather: WeatherData | null;
  warnings: WarningData | null;
  windGustThreshold: number;
  showWeather: boolean;
  onToggle: () => void;
  getUvColor: (level: string) => string;
}

export function WeatherSection({
  weather,
  warnings,
  windGustThreshold,
  showWeather,
  onToggle,
  getUvColor,
}: WeatherSectionProps) {
  if (!weather) return null;

  return (
    <div className="bg-gray-800 rounded-lg">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left">
        <h3 className="text-sm font-semibold text-blue-400">
          🌤️ Weather - {weather.location}
          {weather.dataUnavailable && (
            <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              No Cached Data
            </span>
          )}
          {weather.fromCache && !weather.dataUnavailable && (
            <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
              Cached {weather.cachedAt ? new Date(weather.cachedAt).toLocaleTimeString() : ''}
            </span>
          )}
          {warnings && warnings.count > 0 && (
            <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              {warnings.count} warning{warnings.count !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <span className="text-gray-400 text-lg">{showWeather ? '−' : '+'}</span>
      </button>

      {showWeather && (
        <div className="px-4 pb-4">
          {/* Data Unavailable Warning */}
          {weather.dataUnavailable && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
              <p className="text-sm font-semibold text-red-400">⚠️ Weather Data Unavailable</p>
              <p className="text-xs text-gray-400 mt-1">
                {weather.source || 'No cached weather data available in offline mode.'}
              </p>
              <p className="text-xs text-amber-400 mt-2">
                💡 Switch to ONLINE mode to fetch weather, or previously fetched weather will be
                cached for offline use.
              </p>
            </div>
          )}

          {/* Weather Warnings - Live from Bureau of Meteorology */}
          <WarningsSection state="WA" enabled={true} />

          {/* Weather Warnings */}
          {warnings && warnings.warnings.length > 0 && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
              <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ Weather Warnings</h4>
              <div className="space-y-2">
                {warnings.warnings.map((warning, i) => (
                  <div key={i} className="text-sm">
                    <a
                      href={warning.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-300 hover:text-red-200 underline"
                    >
                      {warning.title}
                    </a>
                    {warning.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {warning.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wind Gust Alert */}
          {weather.current.windGust >= windGustThreshold && (
            <div className="bg-amber-900/30 border border-amber-500/50 rounded p-3 mb-4">
              <p className="text-sm font-semibold text-amber-400">
                💨 High Wind Gust Alert: {weather.current.windGust} km/h
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Threshold: {windGustThreshold} km/h - Exercise caution with traffic control devices
              </p>
            </div>
          )}

          {/* Sun Data - First */}
          <div className="bg-gray-700/30 rounded p-3 mb-4">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-gray-400 text-xs">🌅 Sunrise</p>
                <p className="font-medium">{weather.sun.sunrise}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">🌇 Sunset</p>
                <p className="font-medium">{weather.sun.sunset}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">☀️ Daylight</p>
                <p className="font-medium">{weather.sun.daylightHours}</p>
              </div>
            </div>
            <div className="mt-2 text-center">
              <p className="text-gray-400 text-xs">UV Index</p>
              <p className={`text-lg font-bold ${getUvColor(weather.sun.uvLevel)}`}>
                {weather.sun.uvIndex} ({weather.sun.uvLevel})
              </p>
            </div>
          </div>

          {/* Current Conditions */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <p className="text-gray-400">Condition</p>
              <p className="font-medium">{weather.current.condition}</p>
            </div>
            <div>
              <p className="text-gray-400">Temp</p>
              <p className="font-medium">{weather.current.temp}°C</p>
            </div>
            <div>
              <p className="text-gray-400">Wind</p>
              <p className="font-medium">
                {weather.current.windSpeed} km/h {weather.current.windDir}
              </p>
              <p
                className={`text-xs ${weather.current.windGust >= windGustThreshold ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}
              >
                Gusts: {weather.current.windGust} km/h
                {weather.current.windGust >= windGustThreshold && ' ⚠️'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Humidity</p>
              <p className="font-medium">{weather.current.humidity}%</p>
            </div>
          </div>

          <h4 className="text-xs text-gray-400 mb-2">8 Hour Forecast</h4>
          <div className="text-xs space-y-1">
            {weather.forecast.map((hour, i) => (
              <div key={i} className="flex justify-between">
                <span>{hour.time}</span>
                <span>{hour.condition}</span>
                <span>{hour.temp}°C</span>
                <span>{hour.windSpeed}km/h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
