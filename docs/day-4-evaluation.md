# Evaluation and observed failures

## Runs on 2026-10-21

`npm run eval` executed 12 frozen synthetic scenarios as deterministic local checks: 9 pass, 0 fail, 3 pending. Its fixture supplies the proposed semantic status, so this score is not model accuracy. A real Supabase integration test stored one synthetic application, replayed its Form and response ID, confirmed one record, downloaded the private CV, and cleaned up. The live NVIDIA Nemotron evaluation completed 9 of 9 synthetic calls. The initial run matched 5 of 9 original status labels and grounded 4 of 4 returned citations. After changes, the repeat matched 7 of 9 and grounded 6 of 6 returned citations. Raw outputs are preserved in `evaluation/nvidia-results-initial.json` and `evaluation/nvidia-results.json`. Median model call time in the repeat was 1,992 ms, with a 13,067 ms maximum. These are model call times, not submission-to-review times.

T03 and T05 expose a label-design issue: their expected `REQUIRES_REVIEW` status describes missing contact and conflicting dates, while the evaluation queried the separate TypeScript criterion. The model returned `NOT_EVIDENCED` for that criterion, which is defensible. Keep both cases in the original denominator and do not quietly relabel them after seeing output. T05 also did not produce a conflict warning, so date discrepancy handling remains an observed gap. The seven cases that directly test TypeScript evidence classification matched in the repeat, but this small synthetic set is not a production accuracy estimate.

## Incident records

| Incident | Observed actual | Change | Regression evidence | Remaining limit |
|---|---|---|---|---|
| Hosted Nemotron timeout | First synthetic CV call hit the 25-second abort deadline | Disabled optional reasoning and raised the fallback-specific timeout to 45 seconds | Same synthetic CV call completed in 2,063 ms after the change | Free endpoint latency and throttling can vary |
| Hosted Nemotron schema | Next call returned an object in `profile.history[0]` where the contract required a string | Serialize object entries as text for reviewer inspection before Zod validation | Same synthetic CV test passed after normalization | Other schema deviations still fail visibly and require retry or review |
| T02 and T11 calibration | First model run called both `NOT_EVIDENCED` | Corrected the evaluation criterion label from “Documented TypeScript work” to the frozen generic TypeScript criterion and clarified partial and ambiguous categories in the prompt | Repeat returned `PARTIAL_EVIDENCE` for T02 and `AMBIGUOUS` for T11, with source citations | Prompt and harness changes occurred together, so their separate effects are not measured |
| T05 discrepancy | Conflicting date ranges yielded no profile warning | No fix yet | Pending | Needs a focused test and reviewer-visible contradiction check |
| Windows evaluation runtime | `tsx` failed on this host with `os.userInfo` ENOMEM | Switched the deterministic runner to Node type stripping | `npm run eval` completed all 12 case records | Host-specific runtime failure, not a model result |

No human baseline, non-developer usability timing, correction count, Google Form watch, Drive CV retrieval, observed API bill, or completed video has been recorded.

## Full backend path verification

A generated synthetic text PDF was accepted by the intake contract, stored privately in Supabase, downloaded by the processor, parsed, sent to NVIDIA Nemotron, grounded against the source, and persisted as a ready application with cited TypeScript evidence. The integration test cleaned its job, application, and storage object afterward. Before the fix, the first two runs reached `manual_review` because the PDF library rejected a pooled Node `Buffer` in the test/runtime path. Passing a copied `Uint8Array` and bypassing the library's debug entrypoint made the PDF extraction test and full backend test pass. This is a genuine observed failure and regression, distinct from real Google Form verification.

## 2026-10-24, scorer evaluation

The production Job Fit Match scorer in `src/lib/job-fit.ts` was tested against 12 independent synthetic scenarios with `npm run eval:job-fit`. Ten applicable cases matched expected percentages and tone bands; zero failed. T08 (unreadable CV) and T12 (failed processing) correctly returned no score and are reported as blocked, not passes. Outputs are `evaluation/job-fit-results.json`, `.csv`, and `evaluation/job-fit-report.md`. The separate workflow runner was rerun with `npm run eval`: 9 pass, 0 fail, 3 blocked (T05 contradiction handling, T09 live database deduplication, T12 controlled transient failure). This matches the historical local 9/12 pass count; those checks do not exercise scorer arithmetic.

The 12-case evaluation reports scoring, workflow, model behavior, and operational estimates separately. Job Fit Match uses the documented RecruitOS product rule: required criteria weigh four times preferred criteria, and evidence status adjusts credit. No scorer weights or thresholds changed. The suite checks source excerpt presence and arithmetic, not whether an LLM semantically assigned the right evidence status. A present bare keyword mislabeled `EVIDENCE_FOUND` can still earn full points; this is the primary remaining quality risk.

Historical Nemotron results remain 5/9 then 7/9 expected-status matches and 4/4 then 6/6 grounded citations. The NVIDIA key is configured, but all 9 current attempted calls returned `fetch failed` before producing model output. Current model execution is blocked; this is not a zero-accuracy result. Do not claim current model status accuracy.

The supplied time-saving projection also needs arithmetic reconciliation. Stated assumptions calculate to 200 manual minutes versus 56.7 modeled RecruitOS minutes for 100 applications and 20 deeper reviews, approximately 71.7% potential savings. The prior 50 minutes/75% result is not consistent with those assumptions. This remains a projection, not a measured outcome. Human timing, correction counts, production accuracy, and observed cost remain pending.
