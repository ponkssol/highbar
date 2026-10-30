import Image from "next/image";

/** highbar lockup (column mark + wordmark). Dark text in light mode, white text in dark mode. Source is 375x96 (3x at 32px). */
export function Logo({ height = 28, className = "" }: { height?: number; className?: string }) {
  const width = Math.round((375 / 96) * height);
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <Image src="/brand/highbar-logo-light.png" alt="highbar" width={width} height={height} priority className="block dark:hidden" />
      <Image src="/brand/highbar-logo-dark.png" alt="highbar" width={width} height={height} priority className="hidden dark:block" />
    </span>
  );
}
