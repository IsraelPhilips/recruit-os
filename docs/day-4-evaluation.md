# Evaluation and observed failures

## Current results, 2026-10-25

The three local suites are separate:

| Suite | Current result | What it tests |
|---|---|---|
| `npm run eval` | 9 passed, 0 failed, 3 blocked | Deterministic workflow checks; blocked cases require external persistence or injected failures. |
| `npm run eval:job-fit` | 12 assertions passed; 10 scoreable results matched, 2 correctly pending | The production scorer's arithmetic, excerpt eligibility, and pending behavior. T08 is unreadable and T12 is processing-failed. |
| Live full pipeline | 12 passed, 0 failed, 0 blocked | Synthetic intake, extraction, Nemotron analysis, evidence and citation validation, persistence, scoring, recruiter briefing, duplicate handling, and recovery. |

The final live run used NVIDIA Nemotron on 2026-10-25 at 03:27 UTC. Evidence-status agreement was 10/10 and Job Fit score agreement was 10/10. Persisted citations were grounded in extracted CV text (39/39), and both recovery cases succeeded (2/2). Median processing-attempt duration was 9,445 ms; token usage was 18,087 with 3 focused retry calls across 6 criteria. Billing cost and human review time were not measured. See `evaluation/full-flow-report.md` and `evaluation/full-flow-results-post-evidence-safeguards.json`.

The deterministic scorer retains the documented RecruitOS rule: required criteria weigh four times preferred criteria, with evidence status adjusting credit. This is a product rule, not a MUST-mandated formula. No score weights or thresholds changed during the latest fixes.

## Observed failure analysis

The earlier full-pipeline runs exposed genuine errors and coverage gaps. The original T05 expectation incorrectly removed backend evidence because of conflicting dates even though the criterion did not require duration. T07's quantified 8% reduction supported the outcome criterion. T11's blog reading and interest did not demonstrate practical experience. These labels were corrected independently of model output and documented in the case fixtures.

Subsequent Nemotron runs observed the following system failures:

| Case | Observed failure | General response | Latest result |
|---|---|---|---|
| T04 | Reliability criterion omitted despite relevant CV text. | Added exact criterion-set validation and a focused retry using relevant extracted passages. Unresolved rows remain for human review. | Pass |
| T06 | Explicit AWS deployment evidence was missed. | Search the full CV, not only the skills section, and retry relevant but negatively labeled criteria. | Pass |
| T11 | TypeScript familiarity and reliability rows were omitted or inconsistently labeled. | Preserve source-grounded self-assessment as ambiguous and require an explicit row for every criterion. | Pass |
| T02 | Completed TypeScript coursework was classified inconsistently. | Normalize completed coursework without applied work to partial evidence. | Pass, expected 57% |
| T12 | Production API operation was either overlooked or overstated as full reliability evidence. | Limit API operation without reliability practices to partial reliability evidence. Preserve score-pending state until retry succeeds. | Pass; recovered score is descriptive |

The fixes validate structure and conservative evidence distinctions. They do not prove that a model will classify all future CVs correctly. Citation grounding confirms the text exists in the extracted CV; it does not prove the CV claim itself is true.

## Before and after

The completed 2026-10-25 run before the final evidence safeguards passed 10/12 cases, with 9/10 evidence-status agreement, 9/10 score agreement, 39/39 grounded citations, and 2/2 recoveries. The final run passed 12/12, with 10/10 status agreement, 10/10 score agreement, 39/39 citations, and 2/2 recoveries. This is a measured change between two individual runs, not a stability estimate. Model outputs vary.

The completed 2026-10-24 run recorded 9/12, 8/10 status agreement, 8/10 score agreement, 34/34 grounded citations, and 2/2 recoveries. Historical text-only model runs (5/9 then 7/9 expected status matches) test a different suite and are not combined with full-pipeline results.

## Workflow measurement and open gaps

No manual baseline, proxy-recruiter timing study, human correction rate, production accuracy estimate, or observed model bill is available. A separate estimate for 100 applications and 20 deeper reviews calculates to 200 manual minutes and about 56.7 modeled RecruitOS minutes, or 71.7% potential savings. This is a projection from assumptions, not a measured result.

Next evidence to collect:

1. Verify production sync with a new synthetic submission.
2. Verify actual Pub/Sub notification delivery and watch renewal.
3. Observe a non-developer or proxy recruiter completing comparable manual and RecruitOS reviews, with time and corrections recorded.
4. Record the five-minute demo and check the saved video.

The latest live run does not establish MUST alignment or production accuracy. Human reviewers retain every hiring decision.
