import { MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * SkeletonLoader — shimmer placeholders (never spinners) so the app feels
 * alive while weather / AQI / advisory requests are in flight.
 * Dark-tone shimmer (see .skeleton in index.css).
 */

export function Skeleton({ className, style }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden="true" />;
}

export function MetricSkeleton({ className }) {
  return (
    <div className={cn('glass rounded-2xl p-5 space-y-3', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function AqiHeroSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-5 w-36" />
      </div>
      <Skeleton className="h-16 w-44" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export function AdvisorySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <div className="pt-2 space-y-2.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-10/12" />
        <Skeleton className="h-3.5 w-9/12" />
      </div>
      <div className="pt-3 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  const bars = [42, 66, 50, 78, 56, 70, 38, 60];
  return (
    <div className="h-[250px] w-full flex items-end gap-2 sm:gap-3 px-1" aria-hidden="true">
      {bars.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="h-[360px] sm:h-[420px] lg:h-[480px] w-full rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center justify-center gap-3">
      <MapPin className="w-8 h-8 text-accent/50 animate-pulse" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export default Skeleton;
