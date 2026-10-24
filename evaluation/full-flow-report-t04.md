# Full CV processing pipeline evaluation

Run: 2026-10-24T17:23:24.118Z. Provider: NVIDIA Nemotron (nvidia/nemotron-3.5-lightning-30b-a3b). Status: completed.

1 passed, 0 failed, 0 blocked of 1. This live suite runs synthetic CV PDFs through intake, private storage, extraction, Nemotron analysis where applicable, citation validation, persistence, the production scorer, and recruiter-facing candidate briefing. T08 exercises unreadable-document handling without AI. T09 checks duplicate intake. T12 checks recoverable processing failure.

## Quality and operational measures

Expected evidence-status agreement: 1/1 completed scoring cases. Expected Job Fit score agreement: 1/1 completed cases. Persisted citations grounded in extracted CV text: 0/0. Processing failures recovered after document restoration: 0/0. Median recorded processing-attempt duration: 9244 ms. Model token usage: 773 across 1/1 cases where usage metadata was returned. Observed billing cost: pending. Human review/correction time: pending; this was an automated synthetic run. Processing latency is not recruiter handling time.

| Case | Expected score | Actual score | Initial status | Retry status | Result | Failed checks |
|---|---:|---:|---|---|---|---|
| T04 | 0% | 0% | ready | not needed | passed | all passed |
