import Link from "next/link";
import { DEMO_CASES } from "@/lib/demoCases";

// Deliberately outside the app shell (no top bar, no rail) — this is the
// product's front door, not a screen inside the tool. Entering a case or
// the landscape view is what crosses into the shell.
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-app px-6 py-10 text-primary">
      <div className="w-full max-w-2xl">
        <h1 className="font-mono text-7xl font-semibold tracking-tight text-primary sm:text-8xl">
          TreatNet
        </h1>
        <p className="mt-4 text-xl text-muted">
          Evidence surfaced for clinician review, not a prescription.
        </p>

        <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
          A patient fails a treatment. Months later, a patient with the same profile at another
          hospital is prescribed the same drug — the knowledge that it didn&apos;t work already
          existed. It just sat in a chart nobody else could see.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-hairline py-3 font-mono text-xs uppercase tracking-[0.08em] text-faint">
          <span>
            <span className="text-primary">116</span> synthetic patients
          </span>
          <span>
            <span className="text-primary">3</span> clinical domains
          </span>
          <span>
            <span className="text-primary">2</span> refusal paths
          </span>
          <span className="text-primary">Deterministic ranking</span>
        </div>

        <div className="mt-10">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint">
            Try a case
          </p>
          <div className="mt-3 grid grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-2">
            {DEMO_CASES.map((demo) => (
              <Link
                key={demo.id}
                href={`/case?demo=${demo.id}`}
                className="group flex items-center justify-between gap-2 bg-panel px-4 py-3 transition-colors duration-150 hover:bg-raised"
              >
                <span className="text-sm font-medium text-primary">
                  {demo.label.replace("Load example: ", "")}
                </span>
                <span className="text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/landscape"
          className="mt-4 inline-block text-xs text-accent underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-accent-hover"
        >
          Or browse the treatment landscape →
        </Link>

        <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.1em] text-warn">
          Synthetic data — not for clinical use
        </p>
      </div>
    </main>
  );
}
