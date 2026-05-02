import { ImageResponse } from "next/og";

// Open Graph share image. Rendered at build / on demand by Next's
// ImageResponse runtime. 1200×630 is the canonical OG dimension that
// Twitter/X, LinkedIn, Slack, Discord, iMessage, and Mastodon all use
// for "summary_large_image" cards.
//
// Pure JSX-in-JS so we don't have to host a static asset. Updates
// automatically when we tweak the headline.

export const runtime = "edge";
export const alt = "Arcora — Your first 90 days, engineered for impact.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #F5F2E8 0%, #FBE9DF 60%, #F5F2E8 100%)",
          color: "#1C1917",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "#D97757",
            fontSize: "30px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#D97757",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
            }}
          >
            A
          </div>
          Arcora
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
              color: "#1C1917",
              maxWidth: "950px",
            }}
          >
            Your first 90 days, engineered for impact.
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#57534E",
              maxWidth: "900px",
              lineHeight: 1.35,
            }}
          >
            Generate a role-specific 30/60/90-day plan with AI. Align with
            your manager. Hit the ground running.
          </div>
        </div>

        {/* Phase chips at the bottom */}
        <div
          style={{
            display: "flex",
            gap: "12px",
          }}
        >
          {[
            { label: "Days 1–30", phase: "Learn" },
            { label: "Days 31–60", phase: "Contribute" },
            { label: "Days 61–90", phase: "Lead" },
          ].map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "16px 22px",
                borderRadius: "12px",
                background: "#FFFFFF",
                border: "1px solid #E7E5E4",
              }}
            >
              <div style={{ fontSize: "16px", color: "#A8A29E" }}>{p.label}</div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 600,
                  color: "#1C1917",
                }}
              >
                {p.phase}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
