"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview", matches: (path: string) => path === "/" },
  { href: "/failures", label: "Failures", matches: (path: string) => path.startsWith("/failures") },
  { href: "/methodology", label: "Method", matches: (path: string) => path.startsWith("/methodology") },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="primaryNav" aria-label="Primary navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="navLink"
          aria-current={item.matches(pathname) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

