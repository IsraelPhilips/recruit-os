import Link from 'next/link';

export const metadata={title:'Terms and Conditions | RecruitOS'};
export default function Terms(){
  const contact=process.env.RECRUITER_EMAIL;
  return <article className="legal-page"><span className="eyebrow">RecruitOS / Legal</span><h1>Terms and Conditions</h1><p className="legal-date">Effective 23 October 2026</p><p>These terms apply to authorized recruiters using RecruitOS to organize and review applications. Applicants submit information through a hiring team&apos;s Google Form and should also read that team&apos;s application terms.</p>
    <section><h2>Using the service</h2><p>RecruitOS is for authorized recruiters preparing human review of applications received through a connected Google Form. Keep your account credentials private, connect only Forms you are allowed to access, and upload or process only information you are permitted to use. Do not use the service to make unlawful or discriminatory hiring decisions.</p></section>
    <section><h2>AI output and decisions</h2><p>Extracted profiles, criterion evidence, coverage summaries, and suggested follow-up text can be incomplete or incorrect. Coverage describes what the CV documents against selected job criteria; it is not a measure of a person&apos;s ability or suitability. Review the original source and make every hiring decision yourself. RecruitOS does not automatically reject applicants or send messages.</p></section>
    <section><h2>Google and email connections</h2><p>The recruiter authorizes access to selected Google Forms and private Drive uploads. Google Forms file uploads require applicants to sign in to Google. A separate Gmail authorization is required to send messages. A recruiter must review and approve each saved email draft before sending. Google&apos;s own terms also apply to its services.</p></section>
    <section><h2>Availability and changes</h2><p>Processing can be delayed or interrupted by API limits, outages, invalid documents, or expired permissions. Service features may change. Check processing and delivery status before repeating an action, especially where email delivery is uncertain.</p></section>
    <section><h2>Privacy and contact</h2><p>Read the <Link href="/privacy">Privacy Policy</Link> for current data handling and retention limits. {contact?<>Questions can be sent to <a href={`mailto:${contact}`}>{contact}</a>.</>:'Questions should be sent to the hiring team that shared the Google Form.'}</p></section>
  </article>;
}
