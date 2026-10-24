# Full CV processing pipeline evaluation

Run: 2026-10-24T16:58:06.885Z. Provider: NVIDIA Nemotron (nvidia/nemotron-3.5-lightning-30b-a3b). Status: completed.

6 passed, 6 failed, 0 blocked of 12. This live suite runs synthetic CV PDFs through intake, private storage, extraction, Nemotron analysis where applicable, citation validation, persistence, the production scorer, and recruiter-facing candidate briefing. T08 exercises unreadable-document handling without AI. T09 checks duplicate intake. T12 checks recoverable processing failure.

| Case | Expected score | Actual score | Status | Checks | Error |
|---|---:|---:|---|---|---|
| T01 | 100% | 100% | passed | all passed |  |
| T02 | 57% | 36% | failed | expected_evidence_statuses, citations_grounded, expected_job_fit, expected_tone |  |
| T03 | 100% | 100% | passed | all passed |  |
| T04 | 0% | 0% | passed | all passed |  |
| T05 | 57% | 57% | failed | expected_evidence_statuses, citations_grounded |  |
| T06 | 100% | 93% | failed | expected_evidence_statuses, citations_grounded, expected_job_fit |  |
| T07 | 96% | 100% | failed | expected_evidence_statuses, expected_job_fit |  |
| T08 | Pending | 0% | passed | all passed |  |
| T09 | 100% | 100% | passed | all passed |  |
| T10 | 93% | 93% | passed | all passed |  |
| T11 | 29% | 7% | failed | expected_evidence_statuses, citations_grounded, expected_job_fit |  |
| T12 | Pending | 57% | failed | expected_evidence_statuses, citations_grounded |  |
