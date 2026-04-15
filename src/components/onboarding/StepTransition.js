"use client";

import { useEffect, useState } from "react";

export default function StepTransition({ stepKey, children }) {
  const [displayedKey, setDisplayedKey] = useState(stepKey);
  const [phase, setPhase] = useState("visible");
  const [prevStepKey, setPrevStepKey] = useState(stepKey);

  if (stepKey !== prevStepKey) {
    setPrevStepKey(stepKey);
    setPhase("exiting");
  }

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(() => {
      setDisplayedKey(stepKey);
      setPhase("entering");
    }, 300);
    return () => clearTimeout(timer);
  }, [phase, stepKey]);

  useEffect(() => {
    if (phase !== "entering") return;
    const timer = setTimeout(() => setPhase("visible"), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  const animClass =
    phase === "exiting"
      ? "step-slide-out"
      : phase === "entering"
        ? "step-slide-in"
        : "";

  return (
    <div key={displayedKey} className={animClass}>
      {children}
    </div>
  );
}
