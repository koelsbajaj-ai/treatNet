"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LandscapeTable } from "@/components/LandscapeTable";
import type { DemoCase } from "@/lib/demoCases";
import type { LandscapeConditionOption, LandscapeResult } from "@/lib/types";

function LandscapeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conditions, setConditions] = useState<LandscapeConditionOption[] | null>(null);
  // Deep-linked from a results screen ("View full treatment landscape") —
  // the condition is already known, so this reads straight from the URL as
  // lazy initial state rather than an effect; it only needs to happen once,
  // on mount, not resync on every searchParams change.
  const [selectedCode, setSelectedCode] = useState<string | null>(() => searchParams.get("condition"));
  const [landscape, setLandscape] = useState<LandscapeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/landscape")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load conditions (${res.status})`);
        return (await res.json()) as { conditions: LandscapeConditionOption[] };
      })
      .then((data) => setConditions(data.conditions))
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : "Failed to load."));
  }, []);

  useEffect(() => {
    if (!selectedCode) {
      // Clearing derived data when its source id disappears — legitimately
      // an effect (this syncs against the fetch below, not render-time
      // computation) rather than something to derive during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLandscape(null);
      return;
    }
    setErrorMessage(null);
    fetch(`/api/landscape?conditionCode=${encodeURIComponent(selectedCode)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load landscape (${res.status})`);
        return (await res.json()) as LandscapeResult;
      })
      .then(setLandscape)
      .catch((err) => setErrorMessage(err instanceof Error ? err.message : "Failed to load."));
  }, [selectedCode]);

  function handleSelectDemo(demo: DemoCase) {
    router.push(`/?demo=${demo.id}`);
  }

  return (
    <AppShell onReset={() => router.push("/")} onSelectDemo={handleSelectDemo} isLandscapeActive>
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Analysis</h2>
      <p className="mt-2 text-lg text-primary">Treatment landscape</p>
      <p className="mt-1 text-sm text-muted">
        Every treatment recorded for a condition across the whole database — not the tight,
        severity- and age-matched cohort a single case gets from Confirm and run. Use this to see
        the full picture; use a confirmed case for a recommendation.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(conditions ?? []).map((c) => (
          <button
            key={c.conditionCode}
            type="button"
            onClick={() => setSelectedCode(c.conditionCode)}
            className={`border px-3 py-1.5 text-sm transition-colors duration-150 ${
              selectedCode === c.conditionCode
                ? "border-accent text-accent"
                : "border-hairline text-muted hover:border-hairline-strong hover:text-primary"
            }`}
          >
            {c.conditionDisplay}
          </button>
        ))}
      </div>

      {errorMessage && <p className="mt-4 text-sm text-muted">{errorMessage}</p>}

      {!selectedCode && !errorMessage && (
        <p className="mt-8 text-sm text-faint">Pick a condition above to see its treatments.</p>
      )}

      {landscape && <LandscapeTable landscape={landscape} />}
    </AppShell>
  );
}

export default function LandscapePage() {
  return (
    <Suspense fallback={null}>
      <LandscapeContent />
    </Suspense>
  );
}
