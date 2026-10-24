# Job Fit Match deterministic evaluation

Run: 2026-10-24T16:14:32.737Z. Command: `npm run eval:job-fit`.

10 passed, 0 failed, 2 blocked/not scoreable across 12 cases. Applicable-case pass rate: 10/10. The blocked cases correctly remain blocked because an unreadable CV (T08) or failed processing (T12) cannot support a score.

## Scoring source and MUST alignment

The application scorer is `src/lib/job-fit.ts`, called through `candidateBrief` for both the Applications card and candidate detail view. Its existing product rule is documented in `docs/PROJECT_SPEC.md` section 15: required criteria weigh 4, preferred criteria weigh 1; source-verified `EVIDENCE_FOUND` receives full credit, `PARTIAL_EVIDENCE` half, `AMBIGUOUS` one quarter, and other states zero. Follow-up marks remove credit. Informational criteria are excluded. Score bands are presentational only. This suite changes none of these rules.

The supplied MUST screenshots specify an evaluation package with 8 to 12 cases, baseline/final comparison, pass/fail analysis, and appropriate quality/speed/cost/human-intervention metrics. They do not specify Job Fit Match weights or score thresholds. The 4:1 weighting and status fractions are RecruitOS product rules, not a MUST-mandated formula.

Each case's evidence labels are independently authored synthetic ground truth and quotes are checked against its CV text. This evaluates arithmetic, eligibility, quote grounding, and pending behavior. It does not establish that Gemini or Nemotron would assign the right semantic evidence label.

## Case results

| Case | Scenario | Expected | Actual | Status | Required met | Preferred met |
|---|---|---:|---:|---|---:|---:|
| T01 | Strong documented match | 100% | 100% | pass | 3/3 | 2/2 |
| T02 | Borderline, mixed required evidence | 57% | 57% | pass | 1/3 | 0/2 |
| T03 | Missing contact does not change CV evidence score | 100% | 100% | pass | 3/3 | 2/2 |
| T04 | No CV evidence is not a finding of no competence | 0% | 0% | pass | 0/3 | 0/2 |
| T05 | Contradictory employment dates receive no experience credit | 57% | 57% | pass | 2/3 | 0/2 |
| T06 | Similar projects are credited only through criterion-linked excerpts | 100% | 100% | pass | 3/3 | 2/2 |
| T07 | Whitespace-heavy CV text still verifies exact evidence | 96% | 96% | pass | 3/3 | 1/2 |
| T08 | Unsupported or unreadable CV keeps score pending | Pending | Pending | blocked | 0/3 | 0/2 |
| T09 | Duplicate delivery does not change the pure scoring result | 100% | 100% | pass | 3/3 | 2/2 |
| T10 | Prompt injection text is not itself evidence | 93% | 93% | pass | 3/3 | 1/2 |
| T11 | Keyword-heavy claims receive partial or ambiguous credit, not full credit | 29% | 29% | pass | 0/3 | 0/2 |
| T12 | Transient processing failure keeps score pending until recoverable processing completes | Pending | Pending | blocked | 2/3 | 0/2 |

## Historical comparisons and boundaries

The historical local workflow run remains in `evaluation/history/deterministic-workflow-2026-10-23.json`: 9 passed, 0 failed, 3 pending. It tested citation/contract checks, not Job Fit Match arithmetic, so it is not a comparable baseline for this scoring suite. The current workflow run reports 9 passed, 0 failed, 3 blocked. The historical synthetic Nemotron runs are preserved separately: initial 5/9 expected status matches and 4/4 grounded citations; revised 7/9 status matches and 6/6 grounded citations. They tested model labels/citations, not the deterministic scorer, so this run cannot be described as a model regression or gain. Gemini remains unverified because prior provider calls were blocked by account quota.

Operational planning remains a projection only: assumptions of 1 minute initial plus 5 minutes deep manual review versus 10 seconds initial plus 2 minutes deeper review, for 100 applications with 20 deep reviews, yield 200 manual minutes. The stated RecruitOS assumptions total 56.7 minutes, or 71.7% modeled savings. The supplied 50-minute/75% estimate does not match those inputs and should be reconciled. This remains a projection, not a RecruitOS measurement. Human workflow timing, production accuracy, and observed billing remain pending.

## Findings and limitations

No deterministic scorer defect was found in these 12 scenarios. T11 receives only 29% because the independent labels mark keyword-only claims ambiguous/partial; the scorer correctly discounts them. The scorer trusts its upstream evidence status. If an AI incorrectly labels a bare keyword as `EVIDENCE_FOUND`, this deterministic function cannot recognize the semantic error and will award full criterion credit when the quote is present. The separate model evaluation had 7/9 status agreement and does not remove this risk. Recruiter source review and corrections remain necessary.

T09 checks pure-scoring repeatability only. Database intake deduplication is a separate integration test. T08 and T12 are blocked from producing numeric scores by design; they are reported as blocked, not counted as score passes.
