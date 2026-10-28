"use client";

import { useRouter } from "next/navigation";
import { mutate } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { FollowupNotice } from "@/lib/types";

export function FollowupNoticeCard({ item }: { item: FollowupNotice }) {
  const router = useRouter();

  async function open() {
    if (!item.read) {
      await mutate("/api/followups", "PATCH", { id: item.id }).catch(() => undefined);
    }
    router.push(`/patients/${item.patientId}`);
    router.refresh();
  }

  return (
    <button type="button" onClick={open} className="block w-full rounded-[1.5rem] border border-white bg-white p-4 text-right shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold">{item.patientName}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.read ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-900"}`}>
          {item.read ? "مقروء" : "جديد"}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-sage-800">{item.message}</p>
      <p className="mt-1 text-sm text-slate-500">{item.fileNumber} · {formatDate(item.createdAt.slice(0, 10))}</p>
    </button>
  );
}
