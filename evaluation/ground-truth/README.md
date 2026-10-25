# Independent evaluation labels

The synthetic case definitions and expected evidence statuses are in `../job-fit-cases.json`. They are the independent reference labels for this evaluation, not labels copied from model output and not established facts about real applicants. Case wording and criteria were reviewed against each synthetic CV. Where an earlier expectation did not follow from the CV or criterion scope, the rationale and correction are documented in `../full-flow-diagnosis.md`.

The final 2026-10-25 Nemotron run exercised all 12 cases through the full pipeline where applicable. T08 tests unreadable-document handling and recovery. T09 tests duplicate intake. T12 tests processing-failure persistence and recovery; its post-recovery score is descriptive and excluded from score agreement. A passing synthetic case indicates only that the observed output met that case's assertions.
