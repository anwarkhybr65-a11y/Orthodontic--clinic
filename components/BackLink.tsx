import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="no-print mb-4 inline-flex items-center gap-2 text-sm font-bold text-sage-700 transition hover:text-sage-900">
      <ArrowRight size={16} />
      {children}
    </Link>
  );
}
