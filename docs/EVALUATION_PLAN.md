# RecruitOS: Evaluation Plan and Evidence Package

## Purpose
Evaluate whether RecruitOS reduces the time and rework required to prepare candidate submissions for human review, while preserving factual grounding, safety and recoverability. This is **not** a test of which candidate is best or deserving of employment.

## 1. Experiment design
- Define 1 to 2 synthetic jobs with 4 to 6 recruiter-approved job-related criteria each.
- Build **12 labeled test cases**, with source PDFs/DOCX or explicitly designated intake payloads; keep fixtures independent of actual AI output.
- Run against the exact same source material as the baseline.
- Capture baseline by timing an actual recruiter/proxy preparing structured review packets manually or with a clearly specified basic ChatGPT prompt. Use a consistent start/stop definition.
- Measure RecruitOS total preparation time including AI processing **plus human verification/correction**, not AI latency alone. Also report machine processing latency separately.
- Ask an independent non-developer proxy to follow setup/usage instructions and run at least one case when available. Record actual observations only.
- Exclude failed-document scenarios from extraction accuracy denominators if no valid text can be extracted, but include them in failure-handling metrics.
- Fix meaningful failures and rerun same case IDs to record regressions.

## 2. Twelve ground-truth scenarios
| ID | Scenario | Expected behavior | Primary measures |
|---|---|---|---|
| T01 | Clearly documented qualifying job skills | Correct extraction with exact supporting excerpts, no automatic decision | Extraction/evidence |
| T02 | Partial evidence for required skill | Mark `PARTIAL_EVIDENCE`, expose missing specificity | Calibration |
| T03 | Missing candidate contact or required metadata | Flag and request correction, preserve original submission | Validation |
| T04 | Explicitly absent evidence for criterion | Mark `NOT_EVIDENCED`, never infer incompetence | Evidence fidelity |
| T05 | Conflicting job dates across resume sections | Surface contradiction without silently choosing one | Discrepancy handling |
| T06 | Multiple similar projects and roles | Link excerpt to correct source and criterion | Traceability |
| T07 | Nonstandard yet text-readable formatting | Correct extraction or transparent manual-review flag | Robustness |
| T08 | Corrupt, scanned-only, password-protected, or unsupported CV | Fail safely with actionable reason; no fabricated analysis | Exception handling |
| T09 | Duplicate source form and response IDs | Exactly one application and no duplicated side effects | Idempotency |
| T10 | Resume-borne prompt injection | Ignore document instructions; preserve only document facts | Injection resistance |
| T11 | Ambiguous technology mention with no practical example | Mark ambiguous/partial with clarifying question | Overclaim control |
| T12 | Simulated transient Nemotron or DB fault | Visible recoverable state, bounded retry, no lost application | Reliability |

Store each case with `case_id`, `job_criteria_version`, input path or payload, expected extracted facts, expected evidence status/excerpt, expected system disposition, and evaluation applicability flags. No test fixture may be labeled using the same unverified production-model response it is expected to assess.

## 3. Rubric
### Deterministic (pass/fail)
- OAuth state and recruiter authorization, Google token refresh, watch creation and renewal, Pub/Sub notification handling, response reconciliation, required field validation, document policy, response ID uniqueness, persistence, state transition, next-action persistence, safe failure, retry limits, access control.
- Schema valid, cited verbatim excerpt exists in extracted text (permit whitespace normalization), quote attributed to correct document and actual location if available.

### Semantic, ground-truth comparison
- Candidate field precision/recall or field-level exactness, with clearly defined normalizations.
- Criterion/evidence classification agreement with manually labeled reference.
- Unsupported evidence claim count and ambiguous claim handling.
- A trained reviewer or proxy adjudicates borderline semantic cases; model-as-judge results, if used, are supplementary only.

### Operational and UX
- Baseline manual elapsed time from receiving an application to review packet completion.
- RecruitOS machine latency, recruiter verification/correction time, end-to-end time to usable review packet.
- Number of manual corrections/steps, retries and escalations.
- Proxy user completion, assistance needed, errors, comments, and changes (actual observation only).

## 4. Metric definitions
| Metric | Formula or method | Caveat |
|---|---|---|
| Field extraction accuracy | Correct comparable extracted fields / comparable ground-truth fields | Define normalization, missing/unknown cases |
| Evidence status accuracy | Correct criterion-status assignments / labeled criterion assignments | Include partial and ambiguous |
| Citation grounding rate | Returned cited excerpts located in original extracted document / returned cited excerpts | Grounding does not independently prove truth |
| Unsupported claim count | Evidentiary assertions without source support | Target zero, report actual |
| Workflow test pass rate | Passing applicable deterministic checks / applicable checks | Cases have varied applicability |
| Intake duplication | Unique persisted applications for N copies of same ID | Expect exactly one |
| Machine latency | Job accepted to ready/manual-review/failed | Separate AI and queue times if possible |
| End-to-end handling time | Submission available to reviewed ready-to-use package including human edits | Compare against same manual task scope |
| Time reduction | (baseline median - system median) / baseline median | Only when both measured on comparable cases |
| Human correction count | Corrections made by reviewer per application | No proxy edits = pending, not zero |
| Cost | Tokens/model price or observed API billing, clearly mark estimate | Free tier does not mean zero resource cost |

Proposed aspirational targets, **not guaranteed outcomes**: >90% citation grounding, zero unauthorized state changes, zero unflagged unsupported source quotes, >50% median handling time reduction. Adjust only with explicit rationale and report misses honestly.

## 5. Baseline capture template
Record this for each valid baseline case:
```
case_id:
operator_role: recruiter | proxy
method: manual | basic_chatgpt
start_time:
end_time:
seconds_elapsed:
fields_correct:
fields_total:
criterion_statuses_correct:
criterion_statuses_total:
corrections_or_rework:
operator_notes:
```
If not observed, store `null`/`pending`, never invented numbers. Keep baseline packets for independent inspection.

## 6. Run protocol
1. Freeze criteria and labeled fixtures before final tuning.
2. Run baseline protocol and record raw measurements, if an operator is available.
3. Execute deterministic and AI tests with `npm run eval` (or documented equivalent).
4. Record per-case input version, model version, prompt version, timestamp, output, tokens if available, latency, API calls, costs, errors, expected vs actual.
   Record the provider separately. Report NVIDIA Nemotron results in a separate run from deterministic scoring and workflow checks.
5. Compare against labeled answer key. Human-adjudicate semantic disputes.
6. Record at least three genuine *observed* failure incidents with cause and code/config changes; if fewer are observed, say so and discuss test coverage limits.
7. Repeat relevant cases and entire suite where feasible; preserve both initial and final run results.
8. Generate `evaluation/results.json`, `evaluation/results.csv`, and `evaluation/report.md` with actual run metadata. Never check in fabricated green results.

## 7. Failure record template
```
incident_id:
case_id:
initial_run_id:
input_and_expected:
observed_actual:
root_cause_with_evidence:
fix_or_mitigation:
regression_run_id:
regression_result:
remaining_risk:
```

## 8. Evaluation package contents
- `evaluation/cases/`: 12 case inputs and source documents/payloads.
- `evaluation/ground-truth/`: independent expected statuses, facts and excerpts.
- `evaluation/scripts/`: repeatable runner and scoring logic.
- `evaluation/results.json` and `.csv`: actual captured machine runs.
- `evaluation/report.md`: method, denominators, aggregate and per-case outcomes, explicit exclusions, uncertainty, before/after and failure analysis.
- `deliverables/evaluation-package.md`: reviewer-friendly summary and reproducibility instructions.
- `docs/day-1-discovery.md`: pain evidence and baseline methods.
- `docs/day-4-evaluation.md`: failure fixes and regression narrative.
- `docs/two-week-adoption-plan.md`: forward-looking collection of usage, accuracy, correction and reliability metrics, clearly targets not observed results.

## 9. MUST grading alignment
| Category | Evidence to provide |
|---|---|
| Problem Leverage and Scope, 15% | Named user/JTBD, workflow map, actual or proxy pain, constraints, non-goals, success metrics |
| System Architecture and Engineering, 20% | API contracts, clear boundaries, schemas, storage, selected model provider and Forms/Drive integrations, auth and permission decisions |
| Working Product and Reliability, 20% | Live/reproducible flow, logs, error states, validation, retries, duplicate protection, integration verification |
| Evaluation and Learning Loop, 20% | 12 cases, independent ground truth, baseline protocol and measured comparison, 3 failure analyses and reruns |
| Non-Developer UX and Adoption, 15% | Real operator UI, safe human corrections, review process, setup/runbook, actual proxy feedback if tested |
| Ownership and Communication, 10% | Decision log, truthful AI collaboration note, concise case study, five-minute narrated demo |

## 10. Demo storyboard (5 minutes)
- **0:00 to 0:40:** specific intake burden, baseline and success criteria.
- **0:40 to 1:40:** connect an existing Form, submit a synthetic applicant, and display the Forms watch notification, sync result, and persisted status.
- **1:40 to 2:45:** inspect normalized fields and cited evidence, including a gap or ambiguity.
- **2:45 to 3:30:** correct/approve and record persistent next action.
- **3:30 to 4:30:** show measured evaluation, duplicate and failure/retry handling.
- **4:30 to 5:00:** key limitation and two-week adoption plan.

If real production connector remains blocked, do **not** represent a mock as live. Record the limitation and demonstrate supported tested workflow instead.

## 11. AI collaboration evidence
Capture actual tools, tasks generated, tests and human verification. Track significant rejected or corrected AI output, decisions owned by developer, and unresolved risks. Do not claim manual verification or interviews without observation.

## 12. Current execution boundary
`evaluation/cases/cases.json` freezes 12 synthetic reference labels. The initial runner checks local deterministic behavior only. A separate hosted NVIDIA Nemotron run has raw initial and repeat outputs with criterion-status labels and grounded citations. It does not establish model accuracy beyond these cases, full workflow reliability, human timing, or baseline improvement. The Supabase synthetic intake test passed. Observed API billing remains unknown. The runner's pass count must never be presented as complete system success.

The Google connector now uses OAuth, Forms watches, Pub/Sub pull, and Drive download. A real synthetic Form response was fetched through Forms API, its private PDF was fetched through Drive, and its application was persisted in Supabase. The response lacked email; the application is visible as Needs details and was processed by NVIDIA Nemotron with one evidence item saved. This verifies direct response reconciliation and selected-provider processing, not actual Pub/Sub notification delivery or human review timing. T09 has a synthetic persistence duplicate test, but notification replay remains pending. T12 still needs token refresh, watch renewal, delayed Pub/Sub delivery, and transient API fault tests. The consent question is optional; T03 covers a missing email without rejecting the response.

## 13. Planned outbound email evaluation

Keep the original 12 case labels frozen. A separate outbound-mail suite now tests templates, complete draft validation, MIME header injection prevention, and confirmed, definite-failure, and uncertain Gmail outcomes. Missing recipient block in the browser, unsupported mail scope, human-selected rejection, no automatic send from AI status, and concurrent approve clicks still need end-to-end verification. Use a test mailbox and synthetic applicant only. Record the Gmail response message ID when returned. A timeout after sending has an unknown delivery state; do not automatically retry it or count it as definitely failed. Include the reviewer edit and approval steps in measured handling time when they are actually observed. See `docs/outbound-email-plan.md`.

One live synthetic update email was reviewer-approved through the board, accepted by Gmail with a message ID, recorded as Sent with an audit event, and confirmed received by the user. This verifies one authorized send path. Missing recipient, denied scope, reviewer-edited rejection delivery, concurrent approval clicks in the browser, and ambiguous live timeout remain untested. A synthetic SQL transaction verified that the first draft claim matches one row and the second matches zero; it was rolled back. No human handling time was measured.

The application UI previously showed deterministic criterion evidence coverage and a rule-based clarification draft. That email behavior was superseded by the two-message flow in section 16. The coverage measure remains a count of documented job criteria, not a measure of candidate quality. Human review of the metric's clarity and any effect on handling time remains pending.


## 14. Candidate briefing regression checks, 2026-10-23

New unit checks cover current-version evidence coverage, required and preferred denominators, a source quote that is absent from the CV, reviewer follow-up, missing profile fields recovered from synthetic CV text, preserved recruiter corrections, form-versus-CV discrepancies, and a brief with cited evidence and no hiring verdict. Existing form, document, outbound, and contract tests still run. The local run on 2026-10-23 passed 18 active unit tests; seven integration tests were skipped because they require separate live setup. Typecheck, lint, and production build passed. `npm run eval` reported nine deterministic passes and three pending cases. No new model generation, timed human baseline, or production browser verification was performed for this update. The evidence percentage is a source coverage indicator, not a semantic accuracy metric.

## 15. Job Fit Match evaluation extension

The frozen workflow cases remain unchanged. The separate 12-case Job Fit Match suite in `evaluation/job-fit-cases.json` calls the production scorer and checks actual percentages, tone bands, required/preferred weighting, source-verified credit, and pending states. Expected status labels are independent synthetic ground truth. These are deterministic scoring checks, not proof that an AI evidence label is semantically correct. The case source and recruiter-approved criterion are traceable inputs. Compare model status/excerpt outputs separately before interpreting any weighted score. Do not infer time savings or hiring outcomes from the percentage.

## 16. Two-message outbound evaluation

Keep the original 12-case labels frozen. The outbound unit suite checks these exact threshold boundaries: pending analysis gives no suggestion; 49% suggests rejection; 50% and 59% give no suggestion; 60% suggests next stage. Test that current draft validation accepts only rejection and next-stage messages, while legacy messages remain readable in history. The browser must require an explicit type choice in the middle band. Check personalization with synthetic names and roles, editable subject and body, recipient validation, saved preview, separate approval, and no email sent by analysis alone. The Gmail live test verified one earlier reviewer-approved update message; a live rejection send and the updated next-stage template have not yet been verified. Do not infer mail deliverability or hiring quality from the unit checks.

## 17. Open signup and workspace isolation

Any valid email may register and sign in. The initial account remains attached to the existing legacy workspace and data; each later account receives a separate workspace. Verify two accounts, each with separate test roles, and confirm the other account cannot list, open, edit, process, email, or synchronize the first account's data. Server actions use the service-role client, so this must be enforced by explicit workspace checks even though RLS is enabled. The workspace migration is applied; live cross-workspace denial still requires a two-account test. Public signup also requires Auth signup enabled and confirmation email delivery configured.

## 18. Job Fit Match scoring run, 2026-10-24

Scoring source of truth: the production scorer `src/lib/job-fit.ts` and the product rule in `docs/PROJECT_SPEC.md` section 15. Job Fit Match uses required x4/preferred x1 weighting, evidence-status fractions, and presentational score bands. The 12 synthetic cases evaluate the existing rules; no scoring weights, thresholds, or expected values were changed to fit the cases. Workflow, model, and operational measures are reported separately.

Run `npm run eval:job-fit`. It executes 12 independent synthetic scoring cases against the same `jobFitMatch` function used through `candidateBrief` on both application list and detail. Result files are `evaluation/job-fit-results.json`, `evaluation/job-fit-results.csv`, and `evaluation/job-fit-report.md`. Current run: 10 applicable cases passed, 0 failed, 2 blocked from a numeric score because the CV is unreadable or processing failed. Do not count blocked cases as passes. The separate workflow `npm run eval` reports 9 passed, 0 failed, and T05/T09/T12 blocked, with the same 9/12 pass count as the archived historical run. These suites have different assertions and are not combined.

Historical Nemotron text-classification runs remain 5/9 then 7/9 expected-status matches, with 4/4 then 6/6 grounded citations. The separate live CV pipeline suite is recorded in section 19. The scorer verifies source quote presence but trusts the evidence status supplied by extraction. Therefore, a mistaken `EVIDENCE_FOUND` model label for a bare keyword can earn full credit. T11's expected labels for reading about reliability and expressing interest need independent adjudication before use as calibration truth. Recruiter verification remains essential.

No human baseline, handling-time study, correction rate, production accuracy, or observed model cost was measured. The provided 200-minute manual / 50-minute RecruitOS / 75% projection is arithmetically inconsistent with its own assumptions: 100 x 1 minute plus 20 x 5 minutes is 200 manual minutes; 100 x 10 seconds plus 20 x 2 minutes is 56.7 RecruitOS minutes, about 71.7% modeled savings. All figures remain projections, not measured results.

## 19. Full CV pipeline evaluation, 2026-10-24

The live integration evaluator generates synthetic PDF CVs from the frozen `evaluation/job-fit-cases.json` cases and exercises intake, private Supabase storage, PDF extraction, Nemotron analysis, evidence persistence, source grounding, `candidateBrief`, and the production `jobFitMatch` scorer. Case-level expected and actual evidence, scores, pipeline status, retries, token usage, processing duration, and citation grounding are recorded in `evaluation/full-flow-results.json`; the summary is `evaluation/full-flow-report.md`. Reproduce in PowerShell with `$env:RUN_FULL_EVALUATION_FLOW='1'; npm run eval:full-flow; Remove-Item Env:RUN_FULL_EVALUATION_FLOW`. To rerun one case, set `$env:FULL_FLOW_CASE_IDS='T04'` before the command; case output uses a case-specific filename.

The 12-case run completed 5 passes, 6 expected-result failures, and 1 model-timeout block. Nine of ten candidate-scoring cases completed model analysis; 4/9 matched expected evidence statuses and Job Fit percentages. The remaining scoring case, T04, timed out in the full run, then passed a separate live retest after the schema correction (`evaluation/full-flow-results-t04.json`). Persisted excerpts matched extracted CV text for all 36 citations. T08 produced manual review and no score for an unreadable PDF, then completed after the file was replaced. T12 remained failed and score-pending when the stored document was missing, then completed after restoration and retry. T09 confirmed duplicate response delivery retained one application.

The 11,467 ms median is processing-attempt duration, not recruiter handling time. The run reported 9,240 model tokens; provider billing and human review/correction time remain unmeasured. These are synthetic reliability and model behavior checks, not production accuracy evidence. The previous one-file synthetic E2E test also passed, but it does not establish accuracy across the 12 cases.
