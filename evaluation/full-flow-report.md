# Full CV processing pipeline evaluation

Run: 2026-10-24T17:17:56.501Z. Provider: NVIDIA Nemotron (nvidia/nemotron-3.5-lightning-30b-a3b). Status: partial.

5 passed, 6 failed, 1 blocked of 12. This live suite runs synthetic CV PDFs through intake, private storage, extraction, Nemotron analysis where applicable, citation validation, persistence, the production scorer, and recruiter-facing candidate briefing. T08 exercises unreadable-document handling without AI. T09 checks duplicate intake. T12 checks recoverable processing failure.

## Operational measures

Expected evidence-status and Job Fit score agreement: 4/9 completed scoring cases for each measure. Persisted excerpts grounded in extracted CV text: 36/36. Both failure recovery paths passed: T08 recovered after replacing the unreadable CV; T12 recovered after restoring the missing stored CV. Median recorded processing-attempt duration: 11467 ms. Model token usage: 9,240 tokens across 11/12 responses. Observed billing cost: pending. Human review/correction time: pending; this was an automated synthetic run. Processing latency is not recruiter handling time.

| Case | Expected score | Actual score | Initial status | Retry status | Result | Failed checks |
|---|---:|---:|---|---|---|---|
| T01 | 100% | 100% | ready | not needed | passed | all passed |
| T02 | 57% | 36% | manual_review | not needed | failed | expected_evidence_statuses, expected_job_fit, expected_tone |
| T03 | 100% | 100% | manual_review | not needed | passed | all passed |
| T04 | 0% | Pending | failed | not needed | blocked | profile_name_grounded, application_processed |
| T05 | 57% | 86% | ready | not needed | failed | expected_evidence_statuses, expected_job_fit, expected_tone |
| T06 | 100% | 93% | manual_review | not needed | failed | expected_evidence_statuses, expected_job_fit |
| T07 | 96% | 100% | ready | not needed | failed | expected_evidence_statuses, expected_job_fit |
| T08 | No score until recovery | 0% | manual_review (score pending) | ready | passed | all passed |
| T09 | 100% | 100% | ready | not needed | passed | all passed |
| T10 | 93% | 93% | ready | not needed | passed | all passed |
| T11 | 29% | 7% | manual_review | not needed | failed | expected_evidence_statuses, expected_job_fit |
| T12 | No score until recovery | 57% | failed (score pending) | ready | failed | expected_evidence_statuses |

T04 was blocked in this full suite by an aborted model request after CV extraction. A focused live rerun after the nullable metadata schema fix passed with the expected 0% Job Fit score: see `evaluation/full-flow-report-t04.md` and `evaluation/full-flow-results-t04.json`. This follow-up does not replace the blocked T04 result in the 12-case run.
