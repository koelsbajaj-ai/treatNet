"use client";

interface IntakeFormProps {
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onExtract: () => void;
  isExtracting: boolean;
}

export function IntakeForm({
  noteText,
  onNoteTextChange,
  onExtract,
  isExtracting,
}: IntakeFormProps) {
  return (
    <div className="w-full">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-faint">Case intake</h2>
      <p className="mt-2 text-lg text-primary">Paste a clinical note</p>
      <p className="mt-1 text-sm text-muted">
        Or pick one of the four demo cases from the rail — safe against venue wifi, never calls
        the live model.
      </p>

      <textarea
        value={noteText}
        onChange={(e) => onNoteTextChange(e.target.value)}
        rows={8}
        placeholder="Paste a messy clinical note here..."
        className="mt-5 w-full border border-hairline bg-raised p-3 text-sm text-primary transition-colors duration-150 focus:border-accent focus:outline-none"
      />

      <button
        type="button"
        onClick={onExtract}
        disabled={isExtracting || noteText.trim().length === 0}
        className="mt-4 bg-accent px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isExtracting ? "Extracting..." : "Extract"}
      </button>
    </div>
  );
}
