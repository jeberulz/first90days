"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useHasPlan() {
  const plan = useQuery(api.plans.get);
  return {
    plan,
    hasPlan: plan !== undefined && plan !== null,
    isLoading: plan === undefined,
  };
}
