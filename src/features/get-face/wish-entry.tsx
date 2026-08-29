"use client";

import { useRouter } from "next/navigation";
import { GetFaceRitual } from "./get-face-ritual";

export function WishEntry() {
  const router = useRouter();
  return <GetFaceRitual entryMode="wish" onReturn={() => router.push("/codex")} />;
}
