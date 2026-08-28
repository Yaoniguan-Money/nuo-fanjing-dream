"use client";

import { useCallback, useState } from "react";
import { ThresholdExperience } from "./threshold-experience";
import { GetFaceRitual } from "@/features/get-face/get-face-ritual";

export function ThresholdShell() {
  const [crossed, setCrossed] = useState(false);
  const cross = useCallback(() => setCrossed(true), []);
  if (crossed) return <GetFaceRitual onReturn={() => setCrossed(false)} />;
  return <ThresholdExperience onCrossThreshold={cross} />;
}
