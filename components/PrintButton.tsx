"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "طباعة" }: { label?: string }) {
  return (
    <Button type="button" variant="secondary" className="no-print" onClick={() => window.print()}>
      <Printer size={16} />
      {label}
    </Button>
  );
}
