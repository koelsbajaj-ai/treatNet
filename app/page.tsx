"use client";

import { useState } from "react";
import { IntakeForm } from "@/components/IntakeForm";
import { ConfirmationForm } from "@/components/ConfirmationForm";
import { ResultsView } from "@/components/ResultsView";
import { InsufficientExtractionView } from "@/components/InsufficientExtractionView";
import type { DemoCase } from "@/lib/demoCases";
import type { ConfirmedCase, ExtractedCase, MatchResult, SufficientExtraction } from "@/lib/types";

type Stage = "intake" | "confirming" | "insufficientExtraction" | "results";

// If a demo note is active and the live call takes longer than this, fall
// back to the pre-computed cached result instantly rather than let venue
// wifi stall the demo. Only applies to the three known demo notes — a
// freely typed note has no fallback and just waits for the real response.
const FALLBACK_TIMEOUT_MS = 3000;

function withFallback<T>(promise: Promise<T>, fallback: T | null, timeoutMs: number): Promise<T> {
  if (!fallback) return promise;
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, timeoutMs);
    promise.then(
      (value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      },
      () => {
        // Venue wifi can drop the connection outright, not just slow it
        // down — an outright failure on a demo case falls back too, same
        // as a timeout. Only reachable when fallback is non-null (checked
        // above), so this never masks a real error on a manually typed note.
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      }
    );
  });
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("intake");
  const [noteText, setNoteText] = useState("");
  const [activeDemo, setActiveDemo] = useState<DemoCase | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<SufficientExtraction | null>(null);
  const [insufficientReason, setInsufficientReason] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  function handleLoadDemo(demo: DemoCase) {
    setNoteText(demo.noteText);
    setActiveDemo(demo);
    setErrorMessage(null);
  }

  function handleNoteTextChange(text: string) {
    setNoteText(text);
    // Editing away from the exact demo text invalidates the fallback pairing.
    if (activeDemo && text !== activeDemo.noteText) {
      setActiveDemo(null);
    }
  }

  function applyExtractionResult(result: ExtractedCase) {
    if (result.sufficientInformation) {
      setExtracted(result);
      setStage("confirming");
    } else {
      // Distinct from the matching engine's insufficient-cohort-data refusal
      // (ResultsView) — this fires before /api/match is ever called, because
      // there wasn't enough here to build a case from in the first place.
      setInsufficientReason(result.insufficientReason);
      setStage("insufficientExtraction");
    }
  }

  async function handleExtract() {
    setErrorMessage(null);

    // Demo notes never touch the live LLM call — venue wifi and Anthropic
    // billing/uptime can't stall or break the booth demo. Editing the note
    // text away from the exact demo string already clears activeDemo (see
    // handleNoteTextChange), so this only fires for the unmodified demo.
    if (activeDemo) {
      applyExtractionResult(activeDemo.fallbackExtraction);
      return;
    }

    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Extraction failed (${res.status})`);
      }
      const result = (await res.json()) as ExtractedCase;
      applyExtractionResult(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleConfirm(confirmedCase: ConfirmedCase) {
    setIsMatching(true);
    setErrorMessage(null);
    try {
      const fallback = activeDemo?.fallbackMatch ?? null;
      const result = await withFallback(
        fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(confirmedCase),
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Match failed (${res.status})`);
          }
          return (await res.json()) as MatchResult;
        }),
        fallback,
        FALLBACK_TIMEOUT_MS
      );
      setMatchResult(result);
      setStage("results");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Match failed.");
    } finally {
      setIsMatching(false);
    }
  }

  function handleStartOver() {
    setStage("intake");
    setNoteText("");
    setActiveDemo(null);
    setExtracted(null);
    setInsufficientReason(null);
    setMatchResult(null);
    setErrorMessage(null);
  }

  return (
    <main className="relative flex flex-1 flex-col items-center px-6 py-12">
      <button
        type="button"
        onClick={handleStartOver}
        className="fixed right-4 top-16 z-[70] rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-red-700"
      >
        ↺ Reset
      </button>

      <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
        TreatmentNet
      </h1>
      <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
        Evidence surfaced for clinician review, not a prescription.
      </p>

      <div className="mt-10 flex w-full flex-col items-center">
        {errorMessage && (
          <div className="mb-4 w-full max-w-2xl rounded-md border border-red-400 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {stage === "intake" && (
          <IntakeForm
            noteText={noteText}
            onNoteTextChange={handleNoteTextChange}
            onExtract={handleExtract}
            onLoadDemo={handleLoadDemo}
            isExtracting={isExtracting}
          />
        )}
        {stage === "confirming" && extracted && (
          <ConfirmationForm
            extracted={extracted}
            onConfirm={handleConfirm}
            isMatching={isMatching}
          />
        )}
        {stage === "insufficientExtraction" && insufficientReason && (
          <InsufficientExtractionView reason={insufficientReason} />
        )}
        {stage === "results" && matchResult && (
          <ResultsView result={matchResult} treatmentHistory={extracted?.treatmentHistory ?? []} />
        )}
      </div>
    </main>
  );
}
