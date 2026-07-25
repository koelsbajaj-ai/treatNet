"use client";

import { useMemo, useState } from "react";
import type { LandscapeResult, LandscapeTreatmentRow } from "@/lib/types";

type SortKey = "treatment" | "n" | "successRate" | "adverseEventRate";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-150 hover:text-primary ${
        active ? "text-primary" : "text-faint"
      } ${align === "right" ? "ml-auto flex-row-reverse" : ""}`}
    >
      {label}
      <span className="font-mono text-[10px]">{active ? (dir === "desc" ? "↓" : "↑") : ""}</span>
    </button>
  );
}

export function LandscapeTable({ landscape }: { landscape: LandscapeResult }) {
  const [sortKey, setSortKey] = useState<SortKey>("successRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const maxN = Math.max(1, ...landscape.treatments.map((t) => t.n));

  const sorted = useMemo(() => {
    const rows = [...landscape.treatments];
    const dirMul = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      switch (sortKey) {
        case "treatment":
          return dirMul * a.treatmentDisplay.localeCompare(b.treatmentDisplay);
        case "n":
          return dirMul * (a.n - b.n);
        case "adverseEventRate":
          return dirMul * (a.adverseEventRate - b.adverseEventRate);
        case "successRate":
        default:
          return dirMul * (a.successRate - b.successRate);
      }
    });
    return rows;
  }, [landscape.treatments, sortKey, sortDir]);

  const anyBelowThreshold = landscape.treatments.some((t) => t.belowThreshold);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-[1.4fr_0.6fr_1.4fr_0.8fr_0.8fr] items-center gap-3 border-b border-hairline pb-2">
        <SortHeader
          label="Treatment"
          active={sortKey === "treatment"}
          dir={sortDir}
          onClick={() => toggleSort("treatment")}
        />
        <SortHeader
          label="Cohort"
          active={sortKey === "n"}
          dir={sortDir}
          onClick={() => toggleSort("n")}
        />
        <SortHeader
          label="Response rate"
          active={sortKey === "successRate"}
          dir={sortDir}
          onClick={() => toggleSort("successRate")}
        />
        <SortHeader
          label="Adverse events"
          active={sortKey === "adverseEventRate"}
          dir={sortDir}
          onClick={() => toggleSort("adverseEventRate")}
        />
        {/* Reserved, not built: NHS/BNF list-price cost-per-month reference
            data, if added later, would visually mark itself as a citation
            (not a cohort-derived number) rather than sit beside these
            columns as if it were computed the same way. See README. */}
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-faint/50">
          Cost — n/a
        </span>
      </div>

      <div className="divide-y divide-hairline">
        {sorted.map((row) => (
          <TreatmentRow key={row.treatmentCode} row={row} maxN={maxN} />
        ))}
      </div>

      {anyBelowThreshold && (
        <p className="mt-3 text-xs text-faint">
          Dimmed rows fall below the minimum sample size (N=5) and are excluded from ranking —
          shown here for transparency, not compared against the others.
        </p>
      )}
    </div>
  );
}

function TreatmentRow({ row, maxN }: { row: LandscapeTreatmentRow; maxN: number }) {
  const barWeight = 4 + Math.round((row.n / maxN) * 10); // px, 4-14
  return (
    <div
      className={`grid grid-cols-[1.4fr_0.6fr_1.4fr_0.8fr_0.8fr] items-center gap-3 py-3 transition-colors duration-150 ${
        row.belowThreshold ? "opacity-40" : ""
      }`}
    >
      <span className="text-sm font-medium text-primary">{row.treatmentDisplay}</span>
      <span className="font-mono text-sm tnum text-muted">N={row.n}</span>
      <div className="flex items-center gap-2">
        <div className="h-4 flex-1 bg-raised">
          <div
            className="bg-accent"
            style={{ width: `${Math.round(row.successRate * 100)}%`, height: `${barWeight}px` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-sm tnum text-primary">
          {Math.round(row.successRate * 100)}%
        </span>
      </div>
      <span className="font-mono text-sm tnum text-muted">
        {Math.round(row.adverseEventRate * 100)}%
      </span>
      <span className="font-mono text-sm text-faint/50">—</span>
    </div>
  );
}
