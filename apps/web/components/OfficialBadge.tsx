import { BadgeCheck } from "lucide-react";

/** "Official" pill for the official highbar ecosystem token ($HIGHER), set by the API (`official: true`) only for the resolved official mint. */
export function OfficialBadge({ official, size = "sm" }: { official?: boolean; size?: "sm" | "md" }) {
  if (!official) return null;
  const cls = size === "md" ? "h-5 px-2 text-[11px]" : "h-[18px] px-1.5 text-[10px]";
  return (
    <span data-testid="official-badge" title="Official highbar ecosystem token, launched by the verified dev wallet"
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink font-medium leading-none text-on-ink ${cls}`}>
      <BadgeCheck size={size === "md" ? 12 : 10} strokeWidth={2} />Official
    </span>
  );
}
