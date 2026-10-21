import './globals.css';
import Link from 'next/link';
import { recruiter } from '@/lib/auth';
import { logout } from './actions';
export default async function Layout({children}:{children:React.ReactNode}){const user=await recruiter().catch(()=>null);return <html lang="en"><body><header><strong>RecruitOS</strong>{user&&<><nav><Link href="/">Overview</Link><Link href="/jobs">Jobs</Link><Link href="/google">Google Forms</Link><Link href="/applications">Applications</Link><Link href="/activity">Activity</Link></nav><form action={logout} style={{marginLeft:'auto'}}><button>Sign out</button></form></>}</header><main>{children}</main></body></html>}
