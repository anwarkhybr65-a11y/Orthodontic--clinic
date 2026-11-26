"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function AlertWatcher({ newCases, followups }: { newCases: number; followups: number }) {
  const router = useRouter();
  const shown = useRef({ newCases, followups });

  useEffect(() => {
    shown.current = { newCases, followups };
  }, [newCases, followups]);

  useEffect(() => {
    let stopped = false;

    async function look() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/alerts/live", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { newCases?: number; followups?: number };
        if (stopped) return;
        const next = { newCases: Number(data.newCases) || 0, followups: Number(data.followups) || 0 };
        if (next.newCases === shown.current.newCases && next.followups === shown.current.followups) return;
        shown.current = next;
        router.refresh();
      } catch {
        // The open page stays as it is until the next check.
      }
    }

    const timer = window.setInterval(look, 4000);
    document.addEventListener("visibilitychange", look);
    window.addEventListener("focus", look);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", look);
      window.removeEventListener("focus", look);
    };
  }, [router]);

  return null;
}
