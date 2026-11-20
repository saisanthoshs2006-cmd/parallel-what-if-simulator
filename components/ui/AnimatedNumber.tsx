"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { prefersReducedMotion } from "@/lib/motion";

const fmt = (n: number, decimals: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Tweens between numeric values. The initial text is rendered once by React (identical on server
 * and client, so shared links show the right value immediately); after that only the DOM text is
 * updated imperatively, so React never briefly paints the final value before the tween starts.
 * With reduced motion the value changes instantly.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const [initial] = useState(() => fmt(value, decimals));

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === value) return;
    if (prefersReducedMotion()) {
      shown.current = value;
      el.textContent = fmt(value, decimals);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = fmt(v, decimals);
      },
      onComplete: () => {
        shown.current = value;
        el.textContent = fmt(value, decimals);
      },
    });
    return () => controls.stop();
  }, [value, decimals]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {initial}
    </span>
  );
}
