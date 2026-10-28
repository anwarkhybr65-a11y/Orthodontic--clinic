"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui";
import { mutate } from "@/lib/api-client";

export function FollowupSender({ patientId }: { patientId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    try {
      await mutate("/api/followups", "POST", { patientId });
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال الإشعار");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={send} disabled={busy || done}>
        <Bell size={16} />
        {done ? "تم إرسال إشعار المتابعة" : busy ? "جارٍ الإرسال..." : "إرسال إشعار متابعة للطبيبة"}
      </Button>
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
