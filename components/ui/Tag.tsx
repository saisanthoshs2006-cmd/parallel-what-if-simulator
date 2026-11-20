const STYLES = {
  model: "border-leaf/30 text-leaf",
  assumption: "border-amber/30 text-amber",
  measured: "border-white/15 text-mute",
} as const;

const LABELS = { model: "Model output", assumption: "Assumption", measured: "Real-world data" } as const;

export function Tag({ kind }: { kind: keyof typeof STYLES }) {
  return (
    <span
      className={`rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${STYLES[kind]}`}
    >
      {LABELS[kind]}
    </span>
  );
}
