"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reloads the page every few seconds while the report is being prepared. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
