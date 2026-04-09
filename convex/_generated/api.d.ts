/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as knowledge from "../knowledge.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_pilotUser from "../lib/pilotUser.js";
import type * as logEntries from "../logEntries.js";
import type * as onboarding from "../onboarding.js";
import type * as planMutations from "../planMutations.js";
import type * as plans from "../plans.js";
import type * as reflections from "../reflections.js";
import type * as seed from "../seed.js";
import type * as stakeholders from "../stakeholders.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  ai: typeof ai;
  auth: typeof auth;
  goals: typeof goals;
  http: typeof http;
  knowledge: typeof knowledge;
  "lib/ai": typeof lib_ai;
  "lib/pilotUser": typeof lib_pilotUser;
  logEntries: typeof logEntries;
  onboarding: typeof onboarding;
  planMutations: typeof planMutations;
  plans: typeof plans;
  reflections: typeof reflections;
  seed: typeof seed;
  stakeholders: typeof stakeholders;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
