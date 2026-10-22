'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="card centered-card"><span className="eyebrow">Something interrupted this page</span><h1>We could not load this view.</h1><p>Your saved data is still available. Try again, or return to the overview.</p><div className="inline-actions"><button onClick={reset}>Try again</button><Link className="button-secondary inline-button" href="/">Go to overview</Link></div></div>}
