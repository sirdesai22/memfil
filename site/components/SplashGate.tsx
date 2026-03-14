"use client";

import { useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <LoadingScreen onEnter={() => setEntered(true)} />;
  }

  return <>{children}</>;
}
