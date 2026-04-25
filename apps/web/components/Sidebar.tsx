"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  AlertOctagon,
  PlayCircle,
  BookOpen,
  Shield,
  Code2,
  ExternalLink,
  Home,
} from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home, end: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertOctagon },
  { href: "/demo", label: "Demo", icon: PlayCircle },
];

const external = [
  { href: "https://testnet.arcscan.app", label: "Arc Explorer" },
  {
    href: "https://github.com/vikramRooT/agentguard",
    label: "GitHub",
    icon: Code2,
  },
  { href: "https://pypi.org/project/agentguard-protocol/", label: "PyPI" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg-panel lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple shadow-glow">
          <Shield className="h-4 w-4 text-white" strokeWidth={2.75} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-bold tracking-tight text-primary">
            AgentGuard
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Protocol · v0.1
          </span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="mb-1 px-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
            Navigate
          </span>
        </div>
        <ul className="space-y-0.5 px-2">
          {nav.map(({ href, label, icon: Icon, end }) => {
            const active =
              end ? path === href : path === href || path?.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={clsx(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition",
                    active
                      ? "bg-accent-blue/10 text-accent-blue"
                      : "text-secondary hover:bg-bg-soft hover:text-primary",
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4",
                      active ? "text-accent-blue" : "text-muted group-hover:text-primary",
                    )}
                  />
                  <span className="font-medium">{label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-blue" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mb-1 mt-6 px-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
            Resources
          </span>
        </div>
        <ul className="space-y-0.5 px-2">
          {external.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-secondary transition hover:bg-bg-soft hover:text-primary"
              >
                {Icon ? (
                  <Icon className="h-4 w-4 text-muted group-hover:text-primary" />
                ) : (
                  <BookOpen className="h-4 w-4 text-muted group-hover:text-primary" />
                )}
                <span className="font-medium">{label}</span>
                <ExternalLink className="ml-auto h-3 w-3 text-subtle opacity-0 transition group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — network badge + pip install */}
      <div className="space-y-3 border-t border-line p-4">
        <div className="rounded-lg border border-line bg-bg-soft p-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="live-dot" /> Arc Testnet
          </div>
          <div className="mt-1 font-mono text-[11px] text-secondary">
            Chain ID <span className="text-primary">5042002</span>
          </div>
          <div className="font-mono text-[11px] text-secondary">
            USDC <span className="text-primary">0x3600…0000</span>
          </div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent-blue">
            $ install
          </div>
          <code className="mt-1 block truncate font-mono text-[11px] text-primary">
            pip install agentguard-protocol
          </code>
        </div>
      </div>
    </aside>
  );
}
