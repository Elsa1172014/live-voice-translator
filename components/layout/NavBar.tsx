'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useClerk } from '@clerk/nextjs';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/vocabulary', label: 'Vocabulary' },
  { href: '/errors', label: 'Recurring errors' },
  { href: '/analytics', label: 'Progress' },
  { href: '/settings', label: 'Settings' },
];

export function NavBar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <header className="border-b border-white/5 bg-navy-900/60 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="font-semibold text-gold-400">SpeakFlow AI</Link>
        <nav className="hidden gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx('rounded-lg px-3 py-1.5 text-sm', pathname === l.href ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => signOut({ redirectUrl: '/' })} className="btn-ghost text-sm">Sign out</button>
      </div>
    </header>
  );
}
