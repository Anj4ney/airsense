/**
 * weatherCodes.js — WMO weather codes (Open-Meteo) -> label + lucide icon.
 * `getWeatherMeta(code, isDay)` returns { label, Icon }.
 */

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  Moon,
  Sun,
} from 'lucide-react';

const CODES = {
  0: { label: 'Clear sky', day: Sun, night: Moon },
  1: { label: 'Mainly clear', day: CloudSun, night: CloudMoon },
  2: { label: 'Partly cloudy', day: CloudSun, night: CloudMoon },
  3: { label: 'Overcast', any: Cloudy },
  45: { label: 'Fog', any: CloudFog },
  48: { label: 'Freezing fog', any: CloudFog },
  51: { label: 'Light drizzle', any: CloudDrizzle },
  53: { label: 'Drizzle', any: CloudDrizzle },
  55: { label: 'Dense drizzle', any: CloudDrizzle },
  56: { label: 'Freezing drizzle', any: CloudDrizzle },
  57: { label: 'Dense freezing drizzle', any: CloudDrizzle },
  61: { label: 'Light rain', any: CloudRain },
  63: { label: 'Rain', any: CloudRain },
  65: { label: 'Heavy rain', any: CloudRain },
  66: { label: 'Freezing rain', any: CloudRain },
  67: { label: 'Heavy freezing rain', any: CloudRain },
  71: { label: 'Light snow', any: CloudSnow },
  73: { label: 'Snow', any: CloudSnow },
  75: { label: 'Heavy snow', any: CloudSnow },
  77: { label: 'Snow grains', any: CloudSnow },
  80: { label: 'Light showers', any: CloudRain },
  81: { label: 'Showers', any: CloudRain },
  82: { label: 'Violent showers', any: CloudRain },
  85: { label: 'Snow showers', any: CloudSnow },
  86: { label: 'Heavy snow showers', any: CloudSnow },
  95: { label: 'Thunderstorm', any: CloudLightning },
  96: { label: 'Thunderstorm with hail', any: CloudLightning },
  99: { label: 'Severe thunderstorm with hail', any: CloudLightning },
};

export function getWeatherMeta(code, isDay = true) {
  const entry = CODES[code] || { label: 'Changing skies', day: Cloud, night: Cloud };
  const Icon = entry.any || (isDay ? entry.day : entry.night) || Cloud;
  return { label: entry.label, Icon };
}

/** Compass label for wind direction in degrees. */
export function windDirectionLabel(deg) {
  if (deg === null || deg === undefined) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
