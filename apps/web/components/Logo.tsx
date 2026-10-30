import Image from "next/image";

/** highbar v3 lockup (yellow pillar and serif wordmark), public/brand/sidebar-logo.png is 1684x270 (trimmed, 8px padding), sized by height.
 *  It has a white wordmark (dark mode). sidebar-logo-light.png is the same file with only the wordmark recolored to the light ink #16130D. */
export function Logo({ height = 32, className = "" }: { height?: number; className?: string }) {
  const width = Math.round((1684 / 270) * height);
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <Image src="/brand/sidebar-logo-light.png" alt="highbar" width={width} height={height} quality={90} priority className="block dark:hidden" />
      <Image src="/brand/sidebar-logo.png" alt="highbar" width={width} height={height} quality={90} priority className="hidden dark:block" />
    </span>
  );
}
