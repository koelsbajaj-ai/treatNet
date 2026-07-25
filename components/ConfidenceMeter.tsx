import type { ConfidenceTier, FieldConfidence } from "@/lib/types";

// One visual system for confidence, used everywhere it appears: three
// segments, filled left-to-right. Applies identically to extraction-field
// confidence (low/medium/high) and cohort ranking confidence
// (insufficient/low/moderate) — both are three-tier scales.
function SegmentMeter({ filled, label }: { filled: 1 | 2 | 3; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 w-3 transition-colors duration-150 ${
              i < filled ? "bg-accent" : "bg-hairline-strong"
            }`}
          />
        ))}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}

const TIER_METER: Record<ConfidenceTier, { filled: 1 | 2 | 3; label: string }> = {
  insufficient: { filled: 1, label: "Insufficient data" },
  low: { filled: 2, label: "Low confidence" },
  moderate: { filled: 3, label: "Moderate confidence" },
};

export function TierMeter({ tier }: { tier: ConfidenceTier }) {
  const { filled, label } = TIER_METER[tier];
  return <SegmentMeter filled={filled} label={label} />;
}

const FIELD_METER: Record<FieldConfidence, { filled: 1 | 2 | 3; label: string }> = {
  low: { filled: 1, label: "low" },
  medium: { filled: 2, label: "medium" },
  high: { filled: 3, label: "high" },
};

export function FieldConfidenceMeter({ confidence }: { confidence: FieldConfidence }) {
  const { filled, label } = FIELD_METER[confidence];
  return <SegmentMeter filled={filled} label={label} />;
}
