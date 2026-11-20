"use client";

import type { ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/** Accessible segmented control (radio group semantics). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
  nowrap = false,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  className?: string;
  /** Keep each option on one line (compact HUD controls). */
  nowrap?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid auto-cols-fr grid-flow-col rounded-lg border border-line bg-bg p-0.5 ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`${nowrap ? "whitespace-nowrap" : ""} rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-raised text-ink shadow-[inset_0_0_0_1px_#2a343e]" : "text-mute hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
