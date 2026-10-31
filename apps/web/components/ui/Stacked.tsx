import type { ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Mobile layout for a table: one compact block per row. Use it below `sm` and keep the real table from `sm` up. */
export function Stacked({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return <ul aria-label={label} className={cx("divide-y divide-border", className)}>{children}</ul>;
}

/** One row as a block: a title line (primary cell on the left, key value on the right), then label and value rows. */
export function StackedItem({ title, value, rows = [], highlight = false, footer }: {
  title: ReactNode; value?: ReactNode; rows?: [ReactNode, ReactNode][]; highlight?: boolean; footer?: ReactNode;
}) {
  return (
    <li className={cx("px-4 py-3", highlight && "bg-muted")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">{title}</div>
        {value != null && <div className="num shrink-0 text-right text-sm text-ink">{value}</div>}
      </div>
      {rows.length > 0 && (
        <dl className="mt-2 grid gap-1.5">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <dt className="text-xs text-ink-3">{k}</dt>
              <dd className="num min-w-0 text-right text-[13px] text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-2.5">{footer}</div>}
    </li>
  );
}
