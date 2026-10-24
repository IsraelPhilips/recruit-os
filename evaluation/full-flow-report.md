# Full CV processing pipeline evaluation

Run: 2026-10-24T20:34:33.055Z. Provider: NVIDIA Nemotron (nvidia/nemotron-3.5-lightning-30b-a3b). Status: completed.

9 passed, 3 failed, 0 blocked of 12. This live suite runs synthetic CV PDFs through intake, private storage, extraction, Nemotron analysis where applicable, citation validation, persistence, the production scorer, and recruiter-facing candidate briefing. T08 exercises unreadable-document handling without AI. T09 checks duplicate intake. T12 checks recoverable processing failure.

## Quality and operational measures

Expected evidence-status agreement: 7/10 completed scoring cases. Expected Job Fit score agreement: 8/10 completed cases. Persisted citations grounded in extracted CV text: 37/37. Processing failures recovered after document restoration: 2/2. Median recorded processing-attempt duration: 11004 ms. Model token usage: 14662 across 12/12 cases where usage metadata was returned. Observed billing cost: pending. Human review/correction time: pending; this was an automated synthetic run. Processing latency is not recruiter handling time.

| Case | Expected score | Actual score | Initial status | Retry status | Result | Failed checks |
|---|---:|---:|---|---|---|---|
| T01 | 100% | 100% | ready | not needed | passed | all passed |
| T02 | 57% | 57% | ready | not needed | passed | all passed |
| T03 | 100% | 100% | manual_review | not needed | passed | all passed |
| T04 | 0% | 0% | manual_review | not needed | failed | expected_evidence_statuses |
| T05 | 86% | 86% | ready | not needed | passed | all passed |
| T06 | 100% | 93% | manual_review | not needed | failed | expected_evidence_statuses, expected_job_fit |
| T07 | 100% | 100% | ready | not needed | passed | all passed |
| T08 | No score until recovery | 0% | manual_review (score pending) | ready | passed | all passed |
| T09 | 100% | 100% | ready | not needed | passed | all passed |
| T10 | 93% | 93% | ready | not needed | passed | all passed |
| T11 | 7% | 0% | manual_review | not needed | failed | expected_evidence_statuses, expected_job_fit |
| T12 | No score until recovery | 71% | failed (score pending) | ready | passed | all passed |

## Follow-up fixes and remaining failures

The latest run used the reinforced Nemotron instructions and source-grounded profile completion. It passes T02, T03, T05, and T12, which failed in the prior run. The T03 skill profile and T05 date warning are now derived from verified source evidence, and T12's relevant operational exposure was classified as partial. Coursework is capped at partial skill evidence by a general validation rule.

Three cases still fail. In T04, the model omitted the reliability criterion, so the production guard correctly leaves it for review instead of inventing a classification. In T06, it omitted cloud deployment despite a direct AWS deployment statement, also leaving that criterion for review. In T11, it omitted the TypeScript familiarity statement and the reliability criterion, producing 0% instead of the independently expected 7%. These are model coverage/classification failures. The missing criteria remain visible; they are not converted into passing outcomes. Across the run, 37/37 persisted citations were grounded. The run is not a clean pass and does not establish stable model accuracy.
