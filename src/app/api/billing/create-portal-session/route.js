import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { getStripe } from "@/lib/stripe";

export async function POST(req) {
  const token = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let viewer;
  try {
    viewer = await fetchQuery(api.users.viewer, {}, { token });
  } catch (err) {
    console.error("[create-portal-session] viewer fetch failed:", err);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!viewer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!viewer.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on record. Subscribe before opening the portal." },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: viewer.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(
      "[create-portal-session] stripe.billingPortal.sessions.create failed:",
      err
    );
    return NextResponse.json(
      { error: "Could not open billing portal" },
      { status: 500 }
    );
  }
}
