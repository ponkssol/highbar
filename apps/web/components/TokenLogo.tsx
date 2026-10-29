"use client";
import { useState } from "react";
import { Avatar } from "./ui";

/** Token logo from the own-domain image proxy (/hb-api/img/:mint); falls back to initials when there is no image or it fails. */
export function TokenLogo({ src, name, size = 32, radius }: { src?: string | null; name: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return radius != null
    ? <span className="inline-flex shrink-0 items-center justify-center bg-ink font-semibold text-on-ink" style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.32) }}>{name.slice(0, 2).toUpperCase()}</span>
    : <Avatar name={name} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img data-testid="token-logo" src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)}
    className="shrink-0 bg-muted object-cover" style={{ width: size, height: size, borderRadius: radius ?? 9999 }} />;
}