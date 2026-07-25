"use client";

import Link from "next/link";
import { DEMO_CASES, type DemoCase } from "@/lib/demoCases";

interface AppShellProps {
  onReset: () => void;
  onSelectDemo: (demo: DemoCase) => void;
  activeDemoId?: string | null;
  isLandscapeActive?: boolean;
  children: React.ReactNode;
}

/**
 * The persistent app frame — top bar, left rail, main panel — shared by
 * every route (intake/results at "/" and the treatment landscape at
 * "/landscape") so the product reads as one piece of software, not a
 * document per page. Demo-case selection always navigates to "/?demo=<id>"
 * rather than calling a same-page handler directly, so clicking a case from
 * the landscape page correctly returns to the intake flow with that case
 * loaded — see app/page.tsx's handling of the `demo` search param.
 */
export function AppShell({
  onReset,
  onSelectDemo,
  activeDemoId = null,
  isLandscapeActive = false,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-app text-primary">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-panel px-4">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight text-primary">
          TreatNet
        </Link>
        <p className="hidden text-[11px] font-medium uppercase tracking-[0.12em] text-warn sm:block">
          Synthetic data — not for clinical use
        </p>
        <button
          type="button"
          onClick={onReset}
          className="border border-hairline px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted transition-colors duration-150 hover:border-accent hover:text-primary"
        >
          ⟲ Reset
        </button>
      </header>

      <div className="flex flex-1">
        <nav className="hidden w-52 shrink-0 border-r border-hairline bg-panel p-3 sm:block">
          <p className="px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
            Demo cases
          </p>
          <div className="mt-2 space-y-0.5">
            {DEMO_CASES.map((demo) => {
              const isActive = activeDemoId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => onSelectDemo(demo)}
                  className={`block w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                    isActive
                      ? "bg-raised text-primary"
                      : "text-muted hover:bg-raised hover:text-primary"
                  }`}
                >
                  {demo.label.replace("Load example: ", "")}
                </button>
              );
            })}
          </div>

          <p className="mt-6 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
            Analysis
          </p>
          <Link
            href="/landscape"
            className={`mt-2 block rounded-sm px-2 py-1.5 text-sm transition-colors duration-150 ${
              isLandscapeActive
                ? "bg-raised text-primary"
                : "text-muted hover:bg-raised hover:text-primary"
            }`}
          >
            Treatment landscape
          </Link>
        </nav>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="rounded-sm bg-panel p-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
