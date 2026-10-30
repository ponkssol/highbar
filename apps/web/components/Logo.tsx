import Image from "next/image";

/** highbar lockup (yellow pillar + wordmark), from public/brand/sidebar-logo.png (404x80, trimmed to the artwork, 2x at 40px tall).
 *  The original has a white wordmark (dark mode); sidebar-logo-light.png has it recolored to #111 for light mode. */
export function Logo({ height = 32, className = "" }: { height?: number; className?: string }) {
  const width = Math.round((404 / 80) * height);
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <Image src="/brand/sidebar-logo-light.png" alt="highbar" width={width} height={height} priority className="block dark:hidden" />
      <Image src="/brand/sidebar-logo.png" alt="highbar" width={width} height={height} priority className="hidden dark:block" />
    </span>
  );
}
