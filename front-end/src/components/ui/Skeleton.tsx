import type { HTMLAttributes, ReactNode } from "react";

const cx = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" ");

export function Skeleton({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cx("skeleton rounded-xl", className)} {...rest} />
  );
}

interface SkeletonRegionProps {
  label?: string;
  className?: string;
  children: ReactNode;
}

export function SkeletonRegion({
  label = "Loading",
  className,
  children,
}: SkeletonRegionProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cx("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-3.5 rounded-full"
          style={{ width: i === lines - 1 && lines > 1 ? "62%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cx("size-11 shrink-0 rounded-full", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cx("clay rounded-3xl p-5", className)}>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="mt-5 space-y-4">
        <Skeleton className="h-5 w-3/5 rounded-full" />
        <SkeletonText lines={2} />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cx("clay-soft rounded-2xl p-5", className)}>
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-4 h-9 w-20 rounded-xl" />
      <Skeleton className="mt-5 h-2.5 w-full rounded-full" />
    </div>
  );
}

interface SkeletonListProps {
  rows?: number;
  className?: string;
}

export function SkeletonList({ rows = 5, className }: SkeletonListProps) {
  return (
    <div className={cx("space-y-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="clay-soft flex items-center gap-4 rounded-2xl p-4">
          <SkeletonAvatar />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-4/5 rounded-full" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMap({ className }: { className?: string }) {
  return (
    <div className={cx("clay-inset relative overflow-hidden rounded-3xl", className)}>
      <Skeleton className="absolute inset-0 rounded-none" />
      <Skeleton className="absolute left-[22%] top-[30%] size-5 rounded-full bg-white/70" />
      <Skeleton className="absolute left-[58%] top-[48%] size-5 rounded-full bg-white/70" />
      <Skeleton className="absolute left-[40%] top-[68%] size-5 rounded-full bg-white/70" />
    </div>
  );
}

export function SkeletonPage({ className }: { className?: string }) {
  return (
    <SkeletonRegion className={cx("mx-auto w-full max-w-6xl space-y-8 px-4 py-10", className)}>
      <div className="space-y-3">
        <Skeleton className="h-9 w-64 rounded-2xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SkeletonMap className="h-80" />
        <SkeletonList rows={3} />
      </div>
    </SkeletonRegion>
  );
}