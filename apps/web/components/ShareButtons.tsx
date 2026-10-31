"use client";
import { buttonClass } from "./ui";
import { useState } from "react";
import { Check, Link2, X as XIcon } from "lucide-react";

export function ShareButtons({ path, text }: { path: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;
  const copy = async () => { try { await navigator.clipboard.writeText(url()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  const tweet = () => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`, "_blank", "noopener,noreferrer");
  const btn = buttonClass("secondary");
  return (
    <div className="flex gap-2">
      <button onClick={copy} className={btn}>{copied ? <Check size={14} /> : <Link2 size={14} />}{copied ? "Copied" : "Copy link"}</button>
      <button onClick={tweet} className={btn}><XIcon size={14} />Share on X</button>
    </div>
  );
}