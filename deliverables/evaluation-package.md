# Evaluation package

The evaluation uses 12 synthetic cases and reports deterministic scoring separately from workflow and Nemotron results. Job Fit Match uses RecruitOS's documented rule: required criteria carry four times the weight of preferred criteria, with credit adjusted for evidence status and source verification.

## Reproduce deterministic scoring

Run `npm run eval:job-fit`. Vitest reads the reference labels in `evaluation/job-fit-cases.json`, calls the production scorer in `src/lib/job-fit.ts`, and writes per-case JSON, CSV, and Markdown output. The scorer uses 4 points per required criterion and 1 per preferred criterion; exact source presence is required for credit, while full, partial, ambiguous, and other evidence states earn 1, 0.5, 0.25, and 0 of the applicable weight. Informational criteria are excluded. The evaluation cases do not change these scoring rules.

Current deterministic run: 10 applicable cases passed with expected scores, 0 failed, and 2 were blocked from numeric scoring by design because the CV is unreadable (T08) or processing failed (T12). Scores by case are in `evaluation/job-fit-results.json` and `evaluation/job-fit-results.csv`; detailed methods and risks are in `evaluation/job-fit-report.md`. The 12-case workflow suite is separate: `npm run eval` currently reports 9 checks passed, 0 failed, and T05/T09/T12 blocked. Its archived 2026-10-23 run also reported 9/12, so the pass count did not change. These suites test different behaviors and must not be combined.

## Reproduce the live CV pipeline

The end-to-end evaluator uses the existing Supabase and NVIDIA configuration in `.env.local`. In PowerShell, run `$env:RUN_FULL_EVALUATION_FLOW='1'; npm run eval:full-flow; Remove-Item Env:RUN_FULL_EVALUATION_FLOW`. This creates temporary synthetic applications, generates CV PDFs from the case text, processes them through storage, extraction, Nemotron, evidence persistence, the production scorer, and recruiter briefing, then deletes the temporary records. Live results are written to `evaluation/full-flow-results.json` and `evaluation/full-flow-report.md`. To repeat one case, set `$env:FULL_FLOW_CASE_IDS='T04'`; this writes case-specific result files. These tests make real service calls and never replace unavailable model responses with mocks.

## Model evaluation and limitations

The historical Nemotron text-classification run improved from 5/9 to 7/9 expected-status matches, with grounded citations increasing from 4/4 to 6/6. The latest full CV pipeline run is separate: 5 cases passed, 6 failed reference checks, and 1 model request was blocked by a timeout. Among 9 completed scoring cases, 4 matched expected evidence statuses and Job Fit Match percentages. All 36 persisted excerpts in that run matched extracted CV text. T04 passed a separate live retest after the schema fix. Results are in `evaluation/full-flow-results.json`, `evaluation/full-flow-report.md`, and the focused T04 files.

The full flow also tested error recovery: T08's unreadable PDF produced manual review and no score, then processing succeeded after replacing the file; T12's missing stored file produced a failed state and no score, then processing succeeded after restoring the file. T09 replayed a duplicate intake and retained one application.

The deterministic suite verifies scoring arithmetic and source quote checks for its fixtures. The full pipeline run is a synthetic behavioral check, not proof of production model accuracy. Job Fit Match may credit a criterion if upstream analysis labels an excerpt `EVIDENCE_FOUND`; the scorer checks source presence but cannot independently judge semantic strength. Recruiter review and corrections remain necessary. The full pipeline recorded a median processing attempt of 11,467 ms and 9,240 model tokens across 11 responses; processing latency is not recruiter handling time. Billing cost, recruiter baseline, correction rate, and human review time remain unmeasured. The time-saving estimate is a projection: its assumptions calculate to 200 manual minutes versus 56.7 modeled RecruitOS minutes, about 71.7% potential savings, for 100 applications and 20 deeper reviews.

The current historical workflow runner reports 9 checks passed, 0 failed, and 3 blocked. This is a different suite from both scorer and full-flow evaluation. Historical local workflow results are not a baseline for scorer accuracy. The 5-day handoff, case study, AI collaboration note, and demo package files exist in `deliverables/`; no screen recording or independent proxy-user feedback has been recorded.

Historical failures and regression notes are in `docs/day-4-evaluation.md`. Human recruiters retain all hiring decisions; the score is not a suitability verdict or automatic disposition.
