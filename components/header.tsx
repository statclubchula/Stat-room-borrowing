import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between py-1">
        {/* ---- Logo (left) ---- */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Stat Club logo"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-lg object-contain"
          />
        </Link>

        {/* ---- Actions (right) ---- */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
