# components

- `IntakeForm.tsx` — free-text note textarea + the three demo load buttons.
- `ConfirmationForm.tsx` — editable extracted fields with per-field
  confidence badges; low-confidence fields get an amber ring. Nothing
  runs until "Confirm and run" is clicked.
- `ResultsView.tsx` — ranked treatments with N/tier/success rate, the
  red "avoid" list with gate reasons, and the insufficient-data refusal
  state.

The persistent synthetic-data banner lives in `app/layout.tsx` (Stage 1),
not here, so it stays visible across every state without each component
needing to render it. The provenance modal (Stage 8, click a citation to
see the backing patient records) doesn't exist yet.
