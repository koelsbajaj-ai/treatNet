# components

- `IntakeForm.tsx` — free-text note textarea + the three demo load buttons.
- `ConfirmationForm.tsx` — editable extracted fields with per-field
  confidence badges; low-confidence fields get an amber ring. Nothing
  runs until "Confirm and run" is clicked.
- `ResultsView.tsx` — ranked treatments (numbered, N/tier/success rate)
  with clickable patient-ref chips, the red "avoid" list with gate
  reasons, and the insufficient-data refusal state.
- `ProvenanceModal.tsx` — fetches `/api/provenance?ref=<synthetic_ref>`
  and shows that patient's real condition/observations/treatment/outcome.
  Originally scoped as Stage 8; pulled forward into Stage 5 at the
  user's request since "clickable citations wired to record IDs" was
  already a Stage 5 line item and the backing data was cheap to wire up.

The persistent synthetic-data banner lives in `app/layout.tsx` (Stage 1),
not here, so it stays visible across every state without each component
needing to render it.
