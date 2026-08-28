"use client";

import { useCallback, useState } from "react";
import { ThresholdExperience } from "./threshold-experience";
import { WishInput } from "@/features/wish-input/wish-input";

export function ThresholdShell() {
  const [crossed, setCrossed] = useState(false);
  const cross = useCallback(() => setCrossed(true), []);
  if (crossed) return <WishInput onReturn={() => setCrossed(false)} />;
  return <ThresholdExperience onCrossThreshold={cross} />;
}
