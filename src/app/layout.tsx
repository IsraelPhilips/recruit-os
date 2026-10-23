import './globals.css';
import Link from 'next/link';
import { recruiter } from '@/lib/auth';
import { logout } from './actions';
import { SiteNav } from './components/SiteNav';
export default async function Layout({children}:{children:React.ReactNode}){const user=await recruiter().catch(()=>null);return <html lang="en"><body><header className="site-header"><div className="header-inner"><Link className="brand" href={user?'/':'/login'}><span className="brand-mark">R</span>RecruitOS</Link>{user&&<><SiteNav/><form action={logout} className="signout-form"><button>Sign out</button></form></>}</div></header><main className="page-main">{children}</main><footer className="site-footer"><span>RecruitOS · Human-led hiring review</span><nav aria-label="Legal"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms and Conditions</Link></nav></footer></body></html>}
