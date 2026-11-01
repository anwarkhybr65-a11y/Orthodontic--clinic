import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { getFacilityName } from "@/lib/cached";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  return <LoginForm facilityName={await getFacilityName()} />;
}
