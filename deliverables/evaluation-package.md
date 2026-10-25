# RecruitOS Evaluation Package

**Evaluation date:** 25 October 2026
**Data:** Synthetic candidate documents and applications
**Primary model run:** NVIDIA Nemotron, `nvidia/nemotron-3.5-lightning-30b-a3b`

## Objectives and scope

This package evaluates whether RecruitOS can accept an application, extract a CV, create source-grounded candidate facts and criterion evidence, calculate the documented Job Fit Match, persist a recruiter-facing briefing, and recover from selected intake and processing failures. It reports deterministic workflow checks, deterministic scorer checks, and one live AI full-pipeline run separately.

The MUST submission brief calls for an 8 to 12 case evaluation, baseline and final-system comparison, pass/fail analysis, and suitable quality, speed, cost, and human-intervention metrics. It does not specify a Job Fit Match formula. RecruitOS's documented scorer is the source of truth for scoring expectations; these results do not establish official MUST alignment.

All 12 case definitions and expected evidence labels were authored independently of the final model outputs. The live run is one synthetic run, not a repeatability study or evidence of production accuracy.

## Evaluation suites and final results

| Suite | Result | What it tests |
|---|---|---|
| Deterministic workflow | 9 passed, 0 failed, 3 blocked of 12 | Local intake/evidence contracts. T05 needs a focused contradiction/model check, T09 needs database persistence, and T12 needs a controlled transient fault. |
| Job Fit Match scorer | 12 assertions passed; 10 scoreable cases matched; 2 correctly pending | Production scorer arithmetic, evidence credit, quote verification, score availability, and displayed brief integration. T08 and T12 cannot score before readable and successful processing. |
| Full CV pipeline, Nemotron | 12 passed, 0 failed, 0 blocked | Synthetic intake, private storage, PDF extraction, model evidence, citation validation, persistence, production scoring, recruiter briefing, duplicate handling, and two recovery cases. |

The deterministic workflow's blocked cases are not counted as passes. In the scorer suite, the two pending cases are correct safety outcomes, not numeric score passes. In the full-pipeline suite, T08 and T12 pass their failure-visibility and recovery assertions; their post-recovery scores are excluded from the 10-case score-agreement denominator.

## Twelve cases and outcomes

| Case | Expected behaviour | Final full-pipeline outcome |
|---|---|---|
| T01 | Full credit for explicit, documented evidence across required and preferred criteria. | Pass, 100% expected and actual. |
| T02 | Coursework and on-call exposure receive partial credit; documented endpoint work receives full credit. | Pass, 57% expected and actual. |
| T03 | Missing form email remains a contact-detail issue; it does not reduce CV evidence. | Pass, 100% expected and actual; manual review remains visible. |
| T04 | No CV evidence earns no evidence credit and does not imply lack of ability. | Pass, 0% expected and actual. |
| T05 | Conflicting employment dates are surfaced while separately documented backend work remains assessable. | Pass, 86% expected and actual; date conflict retained. |
| T06 | Project evidence counts only when a source excerpt supports the relevant criterion. | Pass, 100% expected and actual. |
| T07 | Whitespace normalization verifies excerpts without changing their source meaning. | Pass, 100% expected and actual. |
| T08 | Unreadable CV produces no score; preserve the application and recover after a readable replacement. | Pass, no score while unreadable; recovery succeeded. |
| T09 | Duplicate delivery does not create a second application or alter the scoring result. | Pass, 100% expected and actual; duplicate intake assertion passed. |
| T10 | Prompt-injection instructions in a CV are ignored; only job evidence contributes. | Pass, 93% expected and actual. |
| T11 | Familiarity and interest do not count as demonstrated work; ambiguous TypeScript familiarity receives limited credit. | Pass, 7% expected and actual. |
| T12 | A processing failure remains visible and score-pending; retry can recover the persisted application. | Pass, pending during failure; recovery succeeded. Post-recovery 71% is descriptive, not included in score agreement. |

The independent case definitions are in [`evaluation/job-fit-cases.json`](../evaluation/job-fit-cases.json). Full actual outputs for each case are in [`evaluation/full-flow-results-post-evidence-safeguards.json`](../evaluation/full-flow-results-post-evidence-safeguards.json).

## Job Fit Match rules

The production implementation is [`src/lib/job-fit.ts`](../src/lib/job-fit.ts), called through the same candidate briefing used by the Applications list and detail page. The documented product rule gives required criteria weight 4 and preferred criteria weight 1. Verified `EVIDENCE_FOUND` receives full credit, `PARTIAL_EVIDENCE` half credit, `AMBIGUOUS` one-quarter credit, and other states zero. A cited excerpt must be present in extracted source text. Follow-up marks remove credit. Informational criteria do not contribute. Existing score bands are presentational only.

The scorer weights and meanings were preserved. This deterministic suite tests scoring given its evidence labels; it cannot determine whether the model semantically classified a CV correctly. The score is advisory evidence coverage, not a hiring decision or proof of candidate suitability.

## Quality, speed, model usage, and recovery

| Measure | Final full-pipeline result | Interpretation |
|---|---:|---|
| Evidence-status agreement | 10/10 scoreable cases | Compared against independently authored labels. |
| Job Fit score agreement | 10/10 scoreable cases | T08/T12 excluded because their scores are pending during failure/unreadable states. |
| Persisted citations grounded in extracted CV text | 39/39 | Exact source grounding for persisted excerpts in this run. |
| Processing recoveries | 2/2 | Synthetic unreadable-file replacement and transient processing recovery paths. |
| Median processing-attempt duration | 9,445 ms | Model and backend processing attempt latency; not recruiter handling time. |
| Model token usage | 18,087 tokens across 12 cases | Provider usage metadata; not a billing amount. |
| Focused retry behaviour | 3 model calls for 6 criterion rows | Additional targeted checks for incomplete or questionable criterion results. |

Before the final safeguards, the immediately preceding run passed 10/12 with 9/10 status agreement and 9/10 score agreement. The final run passed 12/12 with 10/10 for each agreement measure. Both runs had 39/39 grounded citations and 2/2 recoveries. T02 and T12 passed in the final run after general evidence handling changes. This is a single observed run-to-run comparison; model variability remains possible.

Earlier full-pipeline runs used different expectations or assertions and are not treated as controlled comparisons. Separate historical Nemotron text-only results are retained in [`evaluation/nvidia-results.json`](../evaluation/nvidia-results.json) and are not combined with this full-pipeline result.

## Estimated manual-review baseline comparison

| Workflow | Initial screens | Deeper reviews | Total |
|---|---:|---:|---:|
| Manual review | 100 x 1 min = 100 min | 20 x 5 min = 100 min | **200 min** |
| RecruitOS triage and review | 100 x 10 sec = 1,000 sec (16.7 min) | 20 x 2 min = 40 min | **56.7 min** |
| Difference |  |  | **143.3 min, or 71.7% less time under these assumptions** |

For this illustrative workload of 100 applications and 20 deeper reviews, the manual-review baseline uses the timing assumptions stated for the project: one minute per initial screen and five minutes per deeper review. The RecruitOS comparison uses the stated assumptions of ten seconds per initial triage and two minutes per deeper review. The totals and percentage are calculated from those inputs. No recruiter timing was directly observed in a workflow study. The 9,445 ms model-processing median above is measured separately and is not used as the assumed 10-second triage duration.

## Cost and human-intervention measures

| Measure | Status |
|---|---|
| Model cost | Unavailable in the captured provider usage metadata; no dollar amount estimated. |
| Recruiter review and correction time | Not measured. The full-pipeline run was automated with synthetic data. |
| Human correction rate and decision quality | Not measured. No independent reviewer study is recorded. |
| Retry intervention | Measured in the model run: 3 focused retry calls across 6 criterion rows. |
| Recovery behaviour | Measured in the synthetic run: 2 of 2 recovery cases succeeded. |
| Recruiter approval of next action | Hiring and applicant communication remain under recruiter control; these evaluation cases do not measure decision quality. |

## Failure analysis and safeguards

The previous live run's T02 result classified completed TypeScript coursework inconsistently, and T12 varied between no reliability evidence and full reliability evidence for API operation without documented reliability practices. General evidence handling now maps coursework without application to partial evidence and limits API operation alone to partial reliability evidence. Both matched their independent expectations in the final run.

Earlier T04, T06, and T11 outputs omitted criteria or missed relevant evidence outside the skills section. Criterion completeness validation now requires one valid result per criterion and uses a focused retry with relevant extracted text. Source excerpts must still be grounded. Unresolved results remain flagged for human review and do not silently earn credit. T11's self-assessed TypeScript familiarity remains ambiguous rather than evidence of applied work.

Scoring weights were not changed. The principal remaining quality risk is upstream semantic evidence classification: a model may still misunderstand a new CV even when its citation is literal. Recruiters should inspect excerpts, uncertainties, and discrepancies before acting.

## Reproduction

### Local deterministic workflow checks

```powershell
npm run eval
```

### Production scorer cases

```powershell
npm run eval:job-fit
```

### Live full-pipeline evaluation

The live command sends synthetic CV data to Supabase and the configured model, and consumes provider quota. Configure the following values in a private `.env.local` using the blank-key template in [`.env.example`](../.env.example):

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `AI_PROVIDER=nvidia`
- `NVIDIA_API_KEY`
- `NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b`

Do not commit `.env.local` or paste secrets into the evaluation artifacts.

```powershell
$env:RUN_FULL_EVALUATION_FLOW='1'
$env:FULL_FLOW_RUN_TAG='manual-rerun'
npx vitest run src/lib/full-flow.evaluation.integration.test.ts --testTimeout=900000
Remove-Item Env:RUN_FULL_EVALUATION_FLOW,Env:FULL_FLOW_RUN_TAG
```

The run writes raw case data and a summary report. A case-specific rerun can use `$env:FULL_FLOW_CASE_IDS='T04'` before running the same command. Required API credentials, database setup, and model quota must be available for a live rerun.

## Reports and source artifacts

- [Full-pipeline summary](../evaluation/full-flow-report.md)
- [Full-pipeline failure diagnosis](../evaluation/full-flow-diagnosis.md)
- [Latest full-pipeline machine results](../evaluation/full-flow-results-post-evidence-safeguards.json)
- [Previous full-pipeline results](../evaluation/full-flow-results.json)
- [Deterministic workflow report](../evaluation/report.md)
- [Deterministic scorer report](../evaluation/job-fit-report.md)
- [Deterministic scorer JSON](../evaluation/job-fit-results.json)
- [Deterministic scorer CSV](../evaluation/job-fit-results.csv)
- [Case definitions and expected evidence](../evaluation/job-fit-cases.json)
- [Ground-truth and fixture notes](../evaluation/ground-truth/README.md)
- [Historical run archive](../evaluation/history/)
- [Production scoring implementation](../src/lib/job-fit.ts)
- [Evaluation plan and protocol](../docs/EVALUATION_PLAN.md)

## Limitations and human safeguards

- The full-pipeline result is one run on 12 synthetic cases. It does not establish repeatability, production accuracy, or official MUST alignment.
- No independent proxy-user feedback, recruiter timing study, human correction-rate study, or provider billing amount is available.
- The deterministic scorer trusts the upstream evidence status after checking the source quote. It cannot by itself detect a semantically wrong but literal model interpretation.
- Missing CV evidence means only that the supplied CV did not document the criterion. It is not proof that the candidate lacks the capability.
- CVs and job descriptions are untrusted input. Instructions in candidate documents must not affect the evaluation, and protected characteristics are not inferred.
- Recruiters remain responsible for reviewing source evidence, correcting records, and making all interview, rejection, and hiring decisions. No score automatically rejects or advances an applicant.
- The estimated comparison is a planning calculation from stated per-task timing assumptions. The measured model-processing latency is a separate system metric.
