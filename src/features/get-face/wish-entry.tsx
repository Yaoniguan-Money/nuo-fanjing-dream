"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearDreamSession } from "@/domain/dream-session/storage";
import { GetFaceRitual } from "./get-face-ritual";

export function WishEntry() {
  const router = useRouter();

  useEffect(() => { clearDreamSession(); }, []);

  return <GetFaceRitual entryMode="wish" onReturn={() => router.push("/codex")} />;
}
