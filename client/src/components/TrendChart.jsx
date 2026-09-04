import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { aqiColor, getAQILevel } from '../lib/aqiTheme';

/**
 * TrendChart — 7-day history + today (real past data from Open-Meteo,
 * cached in localStorage).
 *  • AQI line with severity-colored dots
 *  • temperature bars on the right axis
 *  • hover tooltip with exact values per day
 */

/** Per-day severity-colored dot on the AQI line. */
function AqiDot(props) {
  const { cx, cy, payload } = props;
  if (!payload || payload.aqi == null || cx == null || cy == null) return null;
  const color = aqiColor(payload.aqi);
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#0a0e17" strokeWidth={2} />;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const level = getAQILevel(point.aqi);
  const pretty = new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-xs space-y-1 !bg-[rgba(13,17,27,0.9)] border border-white/[0.1] shadow-2xl">
      <p className="font-semibold text-strong">{pretty}</p>
      {point.aqi != null && (
        <p className="flex items-center gap-2">
          <span className="text-muted">AQI</span>
          <span className="font-bold font-mono" style={{ color: level.color }}>
            {point.aqi}
          </span>
          <span className="text-muted">{level.label}</span>
        </p>
      )}
      {point.tMax != null && (
        <p className="flex items-center gap-2">
          <span className="text-muted">Temp</span>
          <span className="font-bold font-mono text-[#f2b06c]">
            {Math.round(point.tMax)}° / {Math.round(point.tMin ?? point.tMax)}°
          </span>
        </p>
      )}
    </div>
  );
}

export default function TrendChart({ series }) {
  const last = series.length ? series[series.length - 1].aqi : null;
  const liveColor = last != null ? aqiColor(last) : '#6c8cff';

  return (
    <div className="w-full" role="img" aria-label="Seven day AQI and temperature trend chart">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={series} margin={{ top: 10, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="tempBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2b06c" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#f2984c" stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#8b93a6', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          />
          <YAxis
            yAxisId="aqi"
            tick={{ fill: '#8b93a6', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={46}
            label={{ value: 'AQI', position: 'insideTopLeft', offset: 14, fill: '#8b93a6', fontSize: 10 }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fill: '#8b93a6', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${Math.round(v)}°`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar
            yAxisId="temp"
            dataKey="tMax"
            name="Max temp"
            fill="url(#tempBarGradient)"
            radius={[5, 5, 0, 0]}
            barSize={16}
          />
          <Line
            yAxisId="aqi"
            type="monotone"
            dataKey="aqi"
            name="AQI"
            stroke={liveColor}
            strokeWidth={3}
            dot={<AqiDot />}
            activeDot={{ r: 7, fill: liveColor, stroke: '#0a0e17', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* legend */}
      <div className="flex items-center gap-4 justify-center mt-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-1.5 rounded-full" style={{ background: liveColor }} />
          AQI (daily avg)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-t-sm bg-[#f2b06c]/50" />
          Max temp (°C)
        </span>
      </div>
    </div>
  );
}
