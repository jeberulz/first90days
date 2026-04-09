"use client";

import { useEffect, useState, useRef } from "react";

export default function StepTransition({ stepKey, children }) {
  const [displayedKey, setDisplayedKey] = useState(stepKey);
  const [phase, setPhase] = useState("visible");
  const pendingKey = useRef(stepKey);

  useEffect(() => {
    if (stepKey === displayedKey) return;

    pendingKey.current = stepKey;
    setPhase("exiting");

    const timer = setTimeout(() => {
      setDisplayedKey(pendingKey.current);
      setPhase("entering");
      const enterTimer = setTimeout(() => setPhase("visible"), 400);
      return () => clearTimeout(enterTimer);
    }, 300);

    return () => clearTimeout(timer);
  }, [stepKey, displayedKey]);

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
