# Full CV processing pipeline evaluation

## Final Nemotron run after evidence safeguards

Run: 2026-10-25T03:27:51.994Z. Provider: NVIDIA Nemotron (`nvidia/nemotron-3.5-lightning-30b-a3b`). Status: completed.

12 passed, 0 failed, 0 blocked of 12. The synthetic suite exercises CV intake, private storage, extraction, Nemotron analysis where applicable, citation validation, persistence, the production scorer, and recruiter-facing briefing. T08 covers unreadable-document handling without AI. T09 checks duplicate intake. T12 checks persistence and recovery after a processing failure.

| Measure | Result |
|---|---:|
| Evidence-status agreement | 10/10 scoring cases |
| Job Fit score agreement | 10/10 scoring cases |
| Persisted citations grounded in extracted CV text | 39/39 |
| Processing recoveries | 2/2 |
| Median processing-attempt duration | 9,445 ms |
| Model token usage | 18,087 across 12/12 cases |
| Focused retry calls / criteria retried | 3 / 6 |
| Observed model cost | Pending |
| Human review/correction time | Pending; synthetic automated run |

Processing latency is not recruiter handling time. The 12 successful case assertions are not evidence of production accuracy.

| Case | Expected score | Actual score | Result |
|---|---:|---:|---|
| T01 | 100% | 100% | Pass |
| T02 | 57% | 57% | Pass |
| T03 | 100% | 100% | Pass |
| T04 | 0% | 0% | Pass |
| T05 | 86% | 86% | Pass |
| T06 | 100% | 100% | Pass |
| T07 | 100% | 100% | Pass |
| T08 | No score until successful processing | No score during failure; recovered | Pass |
| T09 | 100% | 100% | Pass |
| T10 | 93% | 93% | Pass |
| T11 | 7% | 7% | Pass |
| T12 | No score during failure; recover on retry | No score during failure; recovered to 71% | Pass |

T08 and T12 are recovery cases, so their post-recovery scores are descriptive; they are not included in the 10-case score-agreement denominator.

## Comparison with the previous completed Nemotron run

The immediately previous completed run on 2026-10-25T03:12:34.164Z had 10/12 passing, status agreement 9/10, score agreement 9/10, citations 39/39, and recoveries 2/2. After the local evidence safeguards, the final run recorded 12/12 passing, 10/10 status agreement, 10/10 score agreement, citations 39/39, and recoveries 2/2. T02 now classifies the completed TypeScript course as partial evidence, producing the expected 57%. T12 now limits production API operation without documented reliability practices to partial reliability evidence. These results show improvement on this single run; they do not establish stable model behavior.

The 2026-10-24 completed run remains separately recorded at 9/12, 8/10 status agreement, 8/10 score agreement, 34/34 citations, and 2/2 recoveries. The standard deterministic suite, live AI suite, citation grounding, and recovery checks are distinct measures.

## Changes and verification

General evidence safeguards normalize completed coursework without applied work to `PARTIAL_EVIDENCE`, and limit operational API experience without documented reliability practices to partial evidence for reliability criteria. Criterion coverage validation retries missing, duplicate, malformed, or unsupported rows using relevant extracted text; unresolved rows remain flagged for human review and do not silently earn score credit. Scoring weights were unchanged.

Commands run:

- `npx vitest run src/lib/full-flow.evaluation.integration.test.ts --testTimeout=900000` with `RUN_FULL_EVALUATION_FLOW=1` and `FULL_FLOW_RUN_TAG=post-evidence-safeguards`: live Nemotron run completed, 12/12 cases passed; 3 focused retry calls, 6 criterion rows retried.
- `npx vitest run`: 50 passed, 8 opt-in integration tests skipped.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run eval:job-fit`: 12/12 deterministic cases passed.
- `git diff --check`: passed.

Live model output can vary by request. Current limitations include the small synthetic set, pending observed billing cost, no measured recruiter handling or correction time, and no production accuracy claim. A human workflow timing study and independent proxy-user feedback remain necessary before making operational efficiency or usability claims.
