"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconBarbell,
  IconChartBar,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

const tabs: { href: string; label: string; Icon: ComponentType<IconProps> }[] =
  [
    { href: "/today", label: "Today", Icon: IconHome },
    { href: "/log", label: "Log", Icon: IconBarbell },
    { href: "/trends", label: "Trends", Icon: IconChartBar },
  ];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex px-8 pb-0.5 pt-1">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-1.5 text-[11px] ${
                  active ? "text-accent" : "text-text-faint"
                }`}
              >
                {active && (
                  <span className="absolute -top-1 h-0.5 w-4 rounded-full bg-accent" />
                )}
                <Icon size={22} stroke={1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
