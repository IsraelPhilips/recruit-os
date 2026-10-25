# RecruitOS

RecruitOS turns Google Form applications into review packets with source-linked CV evidence. Recruiters can inspect and correct the evidence, then decide what happens next. Job Fit Match summarizes documented evidence against approved role criteria. It is advisory and never makes a hiring decision.

**Live application:** [recruit-os-mu.vercel.app](https://recruit-os-mu.vercel.app)
**Stack:** Next.js, TypeScript, Supabase, Google Forms and Drive APIs, Google OAuth, Cloud Pub/Sub, NVIDIA Nemotron or Gemini.

## What works

- Public signup with a private workspace for each recruiter account.
- Google OAuth connection, Form discovery, question mapping, Forms watches, response reconciliation, and private Drive file retrieval.
- CV extraction, structured analysis, criterion-level evidence, exact excerpt validation, and recruiter review.
- Required and preferred evidence scoring with visible criteria, weights, and cited excerpts. The score does not automatically reject, rank, or contact candidates.
- Editable rejection or next-stage email drafts. Sending requires recipient and message review and explicit recruiter approval through a separate Gmail authorization.
- Processing status, duplicate protection, retry paths, audit history, and synthetic evaluation fixtures.

Live verification is not complete for every integration path. The recruiter confirmed the deployed app loads and lists the connected Form. A synthetic Google Form response and private CV were retrieved and persisted in a local integration run. Actual Pub/Sub notification delivery, watch renewal, production sync, and cross-account workspace isolation remain to be verified. One synthetic Gmail message was approved and received. Use only synthetic data until privacy, retention, and access controls are reviewed for real applicant use.

## Start locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and add credentials in the local file. Never commit `.env.local` or expose server secrets to the browser.
3. Apply the SQL migrations in `supabase/migrations/` to a dedicated Supabase project.
4. Follow [Google connector setup](docs/google-connector-setup.md) for one-time owner configuration. Applicants need a Google account to upload a file through Google Forms.
5. Start the app with `npm run dev`.

For a recruiter walkthrough, see the [operator runbook](docs/operator-runbook.md). For deployment and known verification limits, see [deployment notes](docs/deployment.md).

## Checks and evaluation

```sh
npm test
npm run lint
npx tsc --noEmit
npm run eval
npm run eval:job-fit
```

The 12-case deterministic scorer evaluation has 10 scoreable cases and two cases that correctly remain pending without a readable CV or successful processing. The latest live synthetic Nemotron full-pipeline run passed all 12 case assertions, with 10/10 evidence-status agreement, 10/10 score agreement, and 39/39 persisted citations grounded in extracted CV text. This is a single synthetic run, not production accuracy. Results, commands, comparisons, and limits are in the [evaluation package](deliverables/evaluation-package.md).

The measured human baseline, recruiter correction time, and model billing cost are pending. A separate time-saving calculation is a projection only. Independent proxy-user feedback and the five-minute screen recording also remain outstanding.

## Project and submission documents

- [Product specification](docs/PROJECT_SPEC.md)
- [Evaluation plan](docs/EVALUATION_PLAN.md)
- [Evaluation package](deliverables/evaluation-package.md)
- [Working system handoff](deliverables/working-system.md)
- [Case study](deliverables/case-study.md)
- [AI collaboration note](deliverables/ai-collaboration-note.md)
- [Five-minute demo script](deliverables/demo-script.md) and [recording checklist](deliverables/demo-checklist.md)

The `/privacy` and `/terms` pages are public. Recruiter workspace pages require application sign-in.
