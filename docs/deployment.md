# Deployment and integration status

## Application setup

RecruitOS is deployed at [https://recruit-os-mu.vercel.app](https://recruit-os-mu.vercel.app). The operator confirmed in a browser that the site loads, recruiter pages require RecruitOS sign-in, the Google Forms page lists the connected Form, and `/privacy` and `/terms` load in an Incognito window.

The latest repository change is commit `5d8307b`. The Vercel deployment for that commit has not been independently checked in this update. A successful build or the earlier browser check does not verify every production integration path.

For a new deployment, install dependencies with `npm ci`, configure the Vercel project from the repository, and add production variables from `.env.example` using Vercel's encrypted environment settings. Set `APP_ORIGIN` and `GOOGLE_REDIRECT_URI` to the deployed origin and callback. Register the exact callback URL on the Google OAuth web client. Never commit `.env.local`, credential JSON, refresh tokens, or secret environment values.

Apply the SQL migrations in `supabase/migrations/` in filename order. In Supabase Auth, enable signup and configure email delivery and allowed redirects. Each account is intended to receive a private workspace. Two-account live isolation has not yet been verified.

## Google Forms and Drive

The app uses recruiter OAuth, Forms response watches, a Cloud Pub/Sub pull subscription, scheduled reconciliation, and Drive file retrieval. The recruiter connects Google, selects an existing Form, maps questions, and selects an approved job. A consent question is optional. Native Google Forms file uploads require applicant Google sign-in. Public use of sensitive Google OAuth scopes may require Google's verification process. Pub/Sub requires billing to be enabled in the Google Cloud project; free allowance is not a guarantee of no charges.

A synthetic Form watch was created. Direct reconciliation retrieved a synthetic response through Forms, downloaded its private CV through Drive, and persisted the application and document. The subscriber credential successfully made an authenticated pull request. Actual notification delivery and watch renewal remain unverified. The deployed page listing the Form was confirmed by the operator; a new production sync has not been confirmed.

See [`google-connector-setup.md`](google-connector-setup.md) for OAuth scopes, service-account permissions, topic and subscription setup, scheduling, and test procedure. The configured Vercel Hobby cron runs daily; use an authenticated external scheduler if a shorter interval is required. Do not promise near-real-time ingestion until the production scheduler and Pub/Sub notification path are tested.

## AI, email, and evaluation

The application supports Gemini and an explicitly selected NVIDIA Nemotron provider. The latest full-pipeline evaluation used Nemotron and does not verify Gemini behavior. Model/provider identity is kept with evaluation outputs. See [`../deliverables/evaluation-package.md`](../deliverables/evaluation-package.md).

One synthetic Gmail message was reviewed, explicitly approved, sent, and confirmed received. Email sending requires a separate Gmail authorization and approval of the saved recipient and message. Do not send real applicant emails as part of a demo.

The 2026-10-25 final Nemotron run passed 12/12 synthetic case assertions. It is not production accuracy evidence. Manual review time, correction rate, model billing, production sync, Pub/Sub delivery, and watch renewal remain unmeasured or unverified. See the [full-pipeline report](../evaluation/full-flow-report.md) for exact results.

## Data and operational limits

CV objects are private. The application uses privileged database credentials on the server, so server actions must continue checking workspace ownership. Review RLS, retention, deletion, Google OAuth verification, and access boundaries before processing real applicant data. Unsupported, unreadable, or failed CV processing must remain visible and score-pending until evidence is available.
