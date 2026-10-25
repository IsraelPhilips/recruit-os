# RecruitOS evaluation package

Last verified: 2026-10-25. All candidate fixtures are synthetic. This package reports deterministic scorer checks, deterministic workflow checks, and live Nemotron pipeline results separately. None of these results establishes production accuracy or measured recruiter time savings.

## Evaluation sets and reproduction

The 12 frozen scenarios and independent evidence expectations are in [`evaluation/job-fit-cases.json`](../evaluation/job-fit-cases.json). PDF source text, scorer output, full-pipeline output, historical runs, and the runner are retained under `evaluation/`.

Run the local workflow checks:

```powershell
npm run eval
```

Run the production scorer against its 12-case deterministic suite:

```powershell
npm run eval:job-fit
```

This suite exercises the actual `src/lib/job-fit.ts` scorer. Its rules are the documented RecruitOS product rule, not a MUST-defined formula: each required criterion has weight 4, each preferred criterion weight 1, and evidence fractions are 1 for `EVIDENCE_FOUND`, 0.5 for `PARTIAL_EVIDENCE`, 0.25 for `AMBIGUOUS`, and 0 for other states. An excerpt must be present in the extracted source. Informational criteria do not contribute. T08 and T12 remain unscored when their evidence or processing is unavailable.

Run the live full pipeline only when Supabase and NVIDIA credentials and quota are available. It makes real API calls and consumes model quota:

```powershell
$env:RUN_FULL_EVALUATION_FLOW='1'
$env:FULL_FLOW_RUN_TAG='manual-rerun'
npx vitest run src/lib/full-flow.evaluation.integration.test.ts --testTimeout=900000
Remove-Item Env:RUN_FULL_EVALUATION_FLOW,Env:FULL_FLOW_RUN_TAG
```

The run writes machine-readable results and a report with the run tag. It uses synthetic CVs and exercises intake, private storage, PDF extraction, Nemotron analysis, evidence/citation validation, persistence, scoring, and recruiter briefing where applicable. T08 tests unreadable-file handling. T09 tests duplicate intake. T12 tests failure persistence and retry recovery. The full-flow test is not run by the ordinary test command unless explicitly enabled.

## Current results

| Suite | Latest result | Interpretation |
|---|---|---|
| Deterministic workflow, 2026-10-25 | 9 passed, 0 failed, 3 blocked | The blocked cases require a live database or controlled failure condition. This is not scorer or model accuracy. |
| Job Fit scorer, 2026-10-25 | 12 test assertions passed; 10 scoreable cases matched, 0 mismatches, 2 correctly pending | T08 has an unreadable CV and T12 has failed processing, so neither can produce a score until recovery. |
| Full CV pipeline, NVIDIA Nemotron, 2026-10-25 03:27 UTC | 12 passed, 0 failed, 0 blocked | Synthetic end-to-end checks. Evidence-status agreement 10/10; score agreement 10/10; grounded citations 39/39; recoveries 2/2. |

The final live run took a median 9,445 ms per recorded processing attempt, used 18,087 model tokens, and made 3 focused retry calls covering 6 criterion rows. Observed model cost and recruiter review/correction time were not measured. Processing latency is not recruiter handling time.

The full case-by-case output is [`evaluation/full-flow-results-post-evidence-safeguards.json`](../evaluation/full-flow-results-post-evidence-safeguards.json), with the readable summary in [`evaluation/full-flow-report.md`](../evaluation/full-flow-report.md). Deterministic score results are in [`evaluation/job-fit-report.md`](../evaluation/job-fit-report.md), [`evaluation/job-fit-results.json`](../evaluation/job-fit-results.json), and [`evaluation/job-fit-results.csv`](../evaluation/job-fit-results.csv). The workflow result is in [`evaluation/report.md`](../evaluation/report.md).

### Full-pipeline case outcomes

| Case | Expected score | Observed score | Result |
|---|---:|---:|---|
| T01 | 100% | 100% | Pass |
| T02 | 57% | 57% | Pass |
| T03 | 100% | 100% | Pass |
| T04 | 0% | 0% | Pass |
| T05 | 86% | 86% | Pass |
| T06 | 100% | 100% | Pass |
| T07 | 100% | 100% | Pass |
| T08 | No score before successful processing | No score while unreadable; recovered | Pass |
| T09 | 100% | 100% | Pass |
| T10 | 93% | 93% | Pass |
| T11 | 7% | 7% | Pass |
| T12 | No score during failure | No score during failure; recovered to a descriptive 71% | Pass |

T08 and T12 are recovery tests. Their post-recovery score values are descriptive and are excluded from the 10-case score-agreement denominator.

## Failure analysis and changes

Observed model failures were reviewed against synthetic source CVs and the approved criteria. The current code adds criterion completeness checks, a single focused retry for missing, duplicated, malformed, unsupported, or relevant-but-unreported criteria, and source-grounding validation. Unresolved retry rows remain flagged for recruiter review and receive no evidence credit. The prompt and general evidence validation distinguish coursework from applied work and operational API experience from documented reliability practices. The production weights and score thresholds did not change.

- **T04 and T06:** earlier Nemotron outputs omitted the reliability and cloud criteria despite relevant CV text. Criterion completeness and focused source review now recover or explicitly flag missing rows. The final live run passed both.
- **T11:** earlier outputs omitted TypeScript familiarity and reliability evidence. A source-grounded self-assessment is classified as ambiguous, not as demonstrated work; the final score matched the independent expected 7%.
- **T02:** a completed TypeScript course was inconsistently classified as ambiguous. General validation now treats completed coursework without application as partial evidence. The final run matched 57%.
- **T12:** operation of production APIs without reliability practices was inconsistently classified as either full evidence or no evidence. It is now limited to partial reliability evidence. The application stayed score-pending during the simulated processing failure and recovered on retry.

Before the final safeguards, the completed 2026-10-25 run passed 10/12 cases, with 9/10 status agreement, 9/10 score agreement, 39/39 grounded citations, and 2/2 recoveries. The final run passed 12/12, with 10/10 status agreement, 10/10 score agreement, 39/39 grounded citations, and 2/2 recoveries. This is one observed run-to-run improvement, not evidence of stable model behavior. Earlier runs and raw outputs are retained separately; unlike-for-like suites are not combined.

## What remains unmeasured

- No recruiter baseline or human handling-time study has been performed.
- No independent proxy-user feedback or correction-rate study has been recorded.
- Model billing cost was unavailable in usage metadata.
- One successful synthetic evaluation run does not establish production accuracy.
- Human recruiters must verify the source excerpts and retain all hiring decisions.

The time-saving estimate is a projection only. Under the stated assumptions, 100 initial reviews at one minute and 20 deeper reviews at five minutes total 200 manual minutes. RecruitOS assumptions of 10 seconds per initial triage and two minutes per deeper review total about 56.7 minutes, or about 71.7% modeled savings. No workflow study measured this result.
