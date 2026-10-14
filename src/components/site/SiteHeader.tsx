import Link from "next/link";
import { brand } from "@/config/brand";

const links = [
  ["/play", "Play"],
  ["/learn", "Learn"],
  ["/dashboard", "Games"],
  ["/settings", "Settings"],
] as const;

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Link href="/" className="display text-xl text-paper">
        {brand.name}
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm text-paper/80">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-paper">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
