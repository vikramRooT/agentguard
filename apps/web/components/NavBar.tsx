"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Shield, Activity, AlertTriangle, PlayCircle, Code2 } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/demo", label: "Demo", icon: PlayCircle },
];

export function NavBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-6 md:px-10 lg:px-14">
        <Link href="/" className="group flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 ring-1 ring-accent-blue/40">
            <Shield className="h-4 w-4 text-accent-blue" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[15px] font-semibold tracking-tight text-primary">
              AgentGuard
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted group-hover:text-accent-blue">
              protocol
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = path?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition",
                  active
                    ? "bg-accent-blue/15 text-accent-blue"
                    : "text-muted hover:bg-bg-soft hover:text-primary",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-md border border-line bg-bg-soft px-2.5 py-1 font-mono text-[11px] text-muted md:flex">
            <span className="live-dot" />
            arc testnet
          </div>
          <a
            href="https://github.com/vikramRooT/agentguard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-line bg-bg-soft px-2.5 py-1 text-[12px] text-muted transition hover:border-accent-blue/50 hover:text-primary"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
