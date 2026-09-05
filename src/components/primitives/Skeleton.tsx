import { cn } from '@/lib/cn';

/**
 * A skeleton must match the shape of what replaces it, or it trades a blank
 * frame for a layout shift — which is worse. Size these to the real content.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-xs bg-paper-sunken motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
