'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

const links=[['/','Overview'],['/jobs','Jobs'],['/google','Google Forms'],['/applications','Applications'],['/activity','Activity']] as const;

export function SiteNav(){
  const pathname=usePathname();
  return <nav className="site-nav" aria-label="Main navigation">{links.map(([href,label])=>{
    const active=href==='/'?pathname==='/':pathname===href||pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} className={active?'site-nav-active':undefined} aria-current={active?'page':undefined}>{label}</Link>;
  })}</nav>;
}
