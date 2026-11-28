"use client";
import type { ReactNode } from "react";

/** Square segment (.tabs) or underline tabs (.ttabs), copied from the mockup. Selection only. */
export function JtxSeg<T extends string>({ value, onChange, options, label, line = false }: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode }[];
  label?: string;
  line?: boolean;
}) {
  return (
    <div className={line ? "ttabs" : "tabs seg"} role="tablist" aria-label={label}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={String(o.id)} type="button" role="tab" aria-selected={on} className={on ? "on" : ""} onClick={() => { if (!on) onChange(o.id); }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
