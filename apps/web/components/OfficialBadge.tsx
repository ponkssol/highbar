import { BadgeCheck } from "lucide-react";
import { InfoTip } from "./InfoTip";

const TIP = "Official highbar ecosystem token, launched by the verified dev wallet";

/** "Official" pill for the official highbar ecosystem token ($HIGHER), set by the API (`official: true`) only for the resolved official mint. */
export function OfficialBadge({ official, size = "sm" }: { official?: boolean; size?: "sm" | "md" }) {
  if (!official) return null;
  const cls = size === "md" ? "h-5 px-2 text-[11px]" : "h-[18px] px-1.5 text-[10px]";
  const pill = (
    <span data-testid="official-badge" title={size === "md" ? undefined : TIP}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink font-medium leading-none text-on-ink ${cls}`}>
      <BadgeCheck size={size === "md" ? 12 : 10} strokeWidth={2} />Official
    </span>
  );
  // md sits in the token header, where a tap target is needed for the explanation; sm (lists) keeps the hover title.
  if (size !== "md") return pill;
  return <span className="inline-flex items-center gap-1 self-center">{pill}<InfoTip label="About Official">{TIP}.</InfoTip></span>;
}
