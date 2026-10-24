# Evaluation report

Run at: 2026-10-24T17:54:41.549Z. Adapter: deterministic-local.

Deterministic local checks: 9 pass, 0 fail, 3 blocked out of 12. These are check outcomes, not full scenario success. T05 requires a focused contradiction/model check, T09 requires connected database persistence, and T12 requires a controlled transient model fault. This adapter does not measure model accuracy, human time, or cost. A separate NVIDIA Nemotron run is in evaluation/nvidia-report.md; the Supabase synthetic intake test and observed failures are documented in docs/day-4-evaluation.md. Current model execution and live Google notification delivery remain unverified.

| Case | Check | Outcome |
|---|---|---|
| T01 | grounding | pass |
| T02 | grounding | pass |
| T03 | missing_email | pass |
| T04 | no_quote | pass |
| T05 | conflict_pending | blocked |
| T06 | location | pass |
| T07 | grounding | pass |
| T08 | bad_pdf | pass |
| T09 | dedupe_schema | blocked |
| T10 | injection_quote | pass |
| T11 | grounding | pass |
| T12 | fault_pending | blocked |

Observed failures and before/after results are documented in docs/day-4-evaluation.md.
