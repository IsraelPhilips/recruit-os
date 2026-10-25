# Full-pipeline failure review

## Final run

The final live Nemotron run is `full-flow-results-post-evidence-safeguards.json`, dated 2026-10-25T03:27:51Z. All 12 case assertions passed. Ten of ten scoreable cases matched their independent evidence labels and Job Fit scores. All 39 persisted citations were grounded in the extracted synthetic CV text. Both recovery tests succeeded. This run is one observation and does not establish stable model behavior.

## Observed failure causes and resolutions

| Case | Source and criterion review | Cause in earlier run | Resolution and final outcome |
|---|---|---|---|
| T02 | A completed TypeScript fundamentals course is evidence of study, not applied work. On-call participation without incident ownership is partial reliability exposure. | Nemotron inconsistently returned `AMBIGUOUS` for coursework and omitted or under-classified the on-call evidence. The course status affected the score, 50% versus the independent 57% expectation. | General evidence normalization maps completed coursework without application to `PARTIAL_EVIDENCE`. Final status labels and score matched. |
| T04 | The CV contains relevant reliability information. | Nemotron omitted the reliability criterion entirely. | The output is checked for exactly one row per supplied criterion. Missing rows trigger a focused retry; malformed unresolved rows remain `REQUIRES_REVIEW`. Final case passed. |
| T06 | The CV explicitly says the candidate deployed services to AWS. | Nemotron missed cloud deployment evidence appearing in the CV outside the skills section. | The prompt checks the entire CV, and a relevant negative row is eligible for a focused retry using extracted passages. Final case passed. |
| T11 | “Familiar with TypeScript” is a self-assessment, not applied skill evidence. The CV does not document practical reliability work. | The model omitted criterion rows or inconsistently labeled familiarity and reliability. | Exact criterion coverage is validated; source-grounded familiarity is classified as `AMBIGUOUS`, not applied skill. Final score matched the independent 7% expectation. |
| T12 | “Operated production APIs” supports relevant operational exposure but does not document monitoring, alerts, incidents, or runbooks. | The model sometimes returned no reliability evidence and in one run treated API operation as full reliability evidence. | A general reliability validation limits this wording to `PARTIAL_EVIDENCE`. Processing remained score-pending during the simulated failure, then recovered. Final case passed. Its 71% post-recovery score is descriptive, not part of the 10-case score-agreement denominator. |

T05, T07, and T11 also had expected labels reviewed against the source and criterion wording. Conflicting dates do not erase backend/API evidence when the criterion asks for no duration. A documented 8% outcome is complete evidence for a measurable outcome. Blog reading and interest do not demonstrate practical experience. These corrections were made to the independent fixture expectations, not to the production scoring weights.

## Before and after

The completed run immediately before the final safeguards passed 10/12, with 9/10 evidence-status agreement, 9/10 score agreement, 39/39 grounded citations, and 2/2 recoveries. The final run passed 12/12, with 10/10 status agreement, 10/10 score agreement, 39/39 citations, and 2/2 recoveries. The observed T02 and T12 failures were resolved in that final run. Results can vary across model requests, so this is not a stability estimate.

The earlier 2026-10-24 run passed 9/12, with 8/10 status agreement, 8/10 score agreement, 34/34 grounded citations, and 2/2 recoveries. Earlier text-only Nemotron evaluations (5/9 and then 7/9 expected status matches) are a separate suite. Do not combine the denominators or interpret them as production accuracy.

## Guardrails and limits

- Every requested criterion must have exactly one valid evidence row. Missing, duplicated, malformed, or unsupported rows trigger a focused check. Unresolved rows stay flagged for recruiter review and do not silently earn credit.
- A focused retry is limited to relevant criteria and excerpts from the extracted CV. Citations still have to match the source.
- Missing CV evidence remains distinct from lack of ability. Completed coursework, self-assessed familiarity, practical work, and operational exposure receive distinct statuses.
- The scorer and its weights were unchanged. Synthetic passing cases do not prove semantic accuracy for other documents.
