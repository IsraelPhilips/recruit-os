# Job Fit Match deterministic evaluation

Run: 2026-10-25T04:14:46.967Z. Command: `npm run eval:job-fit`.

10 passed, 0 failed, 2 blocked/not scoreable across 12 cases. Applicable-case pass rate: 10/10. The blocked cases correctly remain blocked because an unreadable CV (T08) or failed processing (T12) cannot support a score.

## Scoring rules

The application scorer is `src/lib/job-fit.ts`, called through `candidateBrief` for both the Applications card and candidate detail view. Its existing product rule is documented in `docs/PROJECT_SPEC.md` section 15: required criteria weigh 4, preferred criteria weigh 1; source-verified `EVIDENCE_FOUND` receives full credit, `PARTIAL_EVIDENCE` half, `AMBIGUOUS` one quarter, and other states zero. Follow-up marks remove credit. Informational criteria are excluded. Score bands are presentational only. This suite changes none of these rules.

This 12-case evaluation reports deterministic scoring separately from workflow and model results. Job Fit Match follows the scoring rules documented for RecruitOS: required criteria carry four times the weight of preferred criteria, with credit adjusted for evidence status and source verification. The suite applies these rules without changing them.

Each case's evidence labels are independently authored synthetic ground truth and quotes are checked against its CV text. This evaluates arithmetic, eligibility, quote grounding, and pending behavior. It does not establish whether the production model assigns the right semantic evidence label.

## Case results

| Case | Scenario | Expected | Actual | Status | Required met | Preferred met |
|---|---|---:|---:|---|---:|---:|
| T01 | Strong documented match | 100% | 100% | pass | 3/3 | 2/2 |
| T02 | Borderline, mixed required evidence | 57% | 57% | pass | 1/3 | 0/2 |
| T03 | Missing contact does not change CV evidence score | 100% | 100% | pass | 3/3 | 2/2 |
| T04 | No CV evidence is not a finding of no competence | 0% | 0% | pass | 0/3 | 0/2 |
| T05 | Conflicting dates are surfaced while independently documented backend work remains evidence | 86% | 86% | pass | 3/3 | 0/2 |
| T06 | Similar projects are credited only through criterion-linked excerpts | 100% | 100% | pass | 3/3 | 2/2 |
| T07 | Whitespace-heavy CV text still verifies exact evidence | 100% | 100% | pass | 3/3 | 2/2 |
| T08 | Unsupported or unreadable CV keeps score pending | Pending | Pending | blocked | 0/3 | 0/2 |
| T09 | Duplicate delivery does not change the pure scoring result | 100% | 100% | pass | 3/3 | 2/2 |
| T10 | Prompt injection text is not itself evidence | 93% | 93% | pass | 3/3 | 1/2 |
| T11 | Keyword-heavy claims receive partial or ambiguous credit, not full credit | 7% | 7% | pass | 0/3 | 0/2 |
| T12 | Transient processing failure keeps score pending until recoverable processing completes | Pending | Pending | blocked | 1/3 | 0/2 |

## Historical comparisons and boundaries

The historical local workflow run remains in `evaluation/history/deterministic-workflow-2026-10-23.json`: 9 passed, 0 failed, 3 pending. It tested citation/contract checks, not Job Fit Match arithmetic, so it is not a comparable baseline for this scoring suite. The current workflow run reports 9 passed, 0 failed, 3 blocked. The historical synthetic Nemotron runs are preserved separately: initial 5/9 expected status matches and 4/4 grounded citations; revised 7/9 status matches and 6/6 grounded citations. They tested model labels/citations, not the deterministic scorer, so this run cannot be described as a model regression or gain. The live CV pipeline has its own report in evaluation/full-flow-report.md.

Operational planning remains a projection only: assumptions of 1 minute initial plus 5 minutes deep manual review versus 10 seconds initial plus 2 minutes deeper review, for 100 applications with 20 deep reviews, yield 200 manual minutes. The stated RecruitOS assumptions total 56.7 minutes, or 71.7% modeled savings. The 50-minute/75% estimate is inconsistent with those inputs. This remains a projection, not a RecruitOS measurement. Human workflow timing, production accuracy, and observed billing remain pending.

## Findings and limitations

No deterministic scorer defect was found in these 12 scenarios. T11 receives limited credit because the independent labels do not treat familiarity, interest, or reading as practical experience. The scorer trusts its upstream evidence status. If an AI incorrectly labels a bare keyword as `EVIDENCE_FOUND`, this deterministic function cannot recognize the semantic error and will award full criterion credit when the quote is present. Human source review and corrections remain necessary. Recruiter source review and corrections remain necessary.

T09 checks pure-scoring repeatability only. Database intake deduplication is a separate integration test. T08 and T12 are blocked from producing numeric scores by design; they are reported as blocked, not counted as score passes.
