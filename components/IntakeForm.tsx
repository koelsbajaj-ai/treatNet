"use client";

import { DEMO_CASES, type DemoCase } from "@/lib/demoCases";

interface IntakeFormProps {
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onExtract: () => void;
  onLoadDemo: (demo: DemoCase) => void;
  isExtracting: boolean;
}

export function IntakeForm({
  noteText,
  onNoteTextChange,
  onExtract,
  onLoadDemo,
  isExtracting,
}: IntakeFormProps) {
  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Paste a clinical note
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Or load a demo note below — three placeholder notes, one per domain.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {DEMO_CASES.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => onLoadDemo(demo)}
            className="flex flex-col items-center rounded-xl border-2 border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
          >
            {demo.label}
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">
              ⚡ instant demo
            </span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Demo notes use a pre-computed result and never call the live model —
        safe against venue wifi.
      </p>

      <textarea
        value={noteText}
        onChange={(e) => onNoteTextChange(e.target.value)}
        rows={8}
        placeholder="Paste a messy clinical note here..."
        className="mt-4 w-full rounded-md border border-zinc-300 bg-white p-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      <button
        type="button"
        onClick={onExtract}
        disabled={isExtracting || noteText.trim().length === 0}
        className="mt-3 rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isExtracting ? "Extracting..." : "Extract"}
      </button>
    </div>
  );
}
