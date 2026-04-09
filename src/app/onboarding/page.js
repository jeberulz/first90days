"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function OnboardingIndex() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const plan = useQuery(api.plans.get);
  const seedPlan = useMutation(api.seed.seedJohnsPlan);
  const ranRef = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (viewer === undefined || plan === undefined) return;

    if (!viewer.isPilotUser) {
      router.replace("/onboarding/1");
      return;
    }

    if (plan !== null) {
      router.replace("/dashboard");
      return;
    }

    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        setError(null);
        await seedPlan();
        router.replace("/dashboard");
      } catch (e) {
        ranRef.current = false;
        setError(
          e instanceof Error ? e.message : "Could not load your workspace. Try again."
        );
      }
    })();
  }, [viewer, plan, router, seedPlan]);

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="font-space-grotesk text-sm text-red-700 max-w-md mb-4">
          {error}
        </p>
        <button
          type="button"
          onClick={async () => {
            setError(null);
            ranRef.current = true;
            try {
              await seedPlan();
              router.replace("/dashboard");
            } catch (err) {
              ranRef.current = false;
              setError(
                err instanceof Error ? err.message : "Something went wrong."
              );
            }
          }}
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-5 py-2.5 font-space-grotesk text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 font-space-grotesk text-sm text-[#57534E]">
        Setting up your workspace…
      </p>
    </div>
  );
}
