# Operator runbook

1. Sign in with the configured recruiter account.
2. Open Jobs and create a role. Check each criterion is job-related, then save it as approved.
3. Open Google Forms, click Connect Google, select an existing Form, map the name and CV questions, optionally map email or other fields, and choose the approved role. A consent question is not required. No script or webhook setup is needed by the recruiter.
4. Watch Overview for a received, processing, ready, manual review, or failed application.
5. Open the application, inspect every source excerpt and ambiguity. `NOT_EVIDENCED` means the CV did not document the criterion, not that the person lacks it.
6. Mark each evidence item and add notes. Use Process or retry when a receipt is pending or a retryable failure appears.
7. Record an administrative next action. To email an applicant, choose a rejection or next-stage draft, review and edit the recipient and full message, save it, then explicitly approve sending. The app does not make a hiring decision.

After three failed processing attempts, inspect the error and handle manually. Do not upload actual personal data to a demo environment.
