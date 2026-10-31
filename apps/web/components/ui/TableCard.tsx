import type { ReactNode } from "react";
import { Card } from "../ui";

/** Card for a table or a stacked list: the title row sits outside any scroller, so it never slides away and the card edge never cuts a cell.
 *  `info` takes an InfoTip next to the title, `aside` sits on the right (counts, filters, links). */
export function TableCard({ title, info, aside, children, footer, className = "", testId }: {
  title?: ReactNode; info?: ReactNode; aside?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string; testId?: string;
}) {
  return (
    <Card className={`overflow-hidden p-0 ${className}`}>
      <div data-testid={testId}>
        {title != null && (
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="flex min-w-0 items-center gap-1.5 font-semibold">{title}{info}</h3>
            {aside}
          </div>
        )}
        {children}
        {footer && <div className="border-t border-border px-4 py-3 text-xs text-ink-3">{footer}</div>}
      </div>
    </Card>
  );
}
