# Evaluation package

The evaluation uses 12 synthetic cases and reports deterministic scoring separately from workflow and Nemotron results. Job Fit Match follows the scoring rules documented for RecruitOS: required criteria carry four times the weight of preferred criteria, with credit adjusted for evidence status and source verification. These are RecruitOS rules; the evaluation does not attribute a scoring formula to MUST.

## Reproduce deterministic scoring

Run `npm run eval:job-fit`. Vitest reads the reference labels in `evaluation/job-fit-cases.json`, calls the production scorer in `src/lib/job-fit.ts`, and writes per-case JSON, CSV, and Markdown output. The scorer uses 4 points per required criterion and 1 per preferred criterion; exact source presence is required for credit, while full, partial, ambiguous, and other evidence states earn 1, 0.5, 0.25, and 0 of the applicable weight. Informational criteria are excluded. The evaluation cases do not change these scoring rules.

Current deterministic run: 10 applicable cases passed with expected scores, 0 failed, and 2 were blocked from numeric scoring by design because the CV is unreadable (T08) or processing failed (T12). Scores by case are in `evaluation/job-fit-results.json` and `evaluation/job-fit-results.csv`; detailed methods and risks are in `evaluation/job-fit-report.md`. The 12-case workflow suite is separate: `npm run eval` currently reports 9 checks passed, 0 failed, and T05/T09/T12 blocked. Its archived 2026-10-23 run also reported 9/12, so the pass count did not change. These suites test different behaviors and must not be combined.

## Model evaluation and limitations

The historical Nemotron synthetic run improved from 5/9 to 7/9 expected-status matches, with grounded citations increasing from 4/4 to 6/6. The current model attempt is blocked: the NVIDIA key is configured, but all 9 requests returned `fetch failed` before any model output. Historical raw outputs and the failed attempt are retained in `evaluation/history/` and the NVIDIA result files.

The deterministic suite proves scoring arithmetic and source quote checks for these fixtures. It does not prove the model chooses semantically correct evidence labels. A false `EVIDENCE_FOUND` label can still earn full credit if its excerpt is present. Recruiter review and corrections remain necessary. No baseline timing, recruiter study, current model accuracy, production accuracy, human correction count, or observed API cost was measured. The supplied 75% time-saving figure is a planning projection, not a measurement, and its arithmetic does not match the stated assumptions. Those inputs calculate to 200 manual minutes versus 56.7 modeled RecruitOS minutes, about 71.7% potential savings, for 100 applications and 20 deeper reviews.

Historical failures and regression notes are in `docs/day-4-evaluation.md`. Human recruiters retain all hiring decisions; the score is not a suitability verdict or automatic disposition.
