/**
 * Shared email layout + brand primitives for all transactional + lifecycle
 * emails sent through Resend.
 *
 * Why this file exists:
 *  - Until we built this, every email re-implemented its own HTML wrapper
 *    with hard-coded colours and an inconsistent footer. Auth emails were
 *    plain text only. CTA buttons used #2563eb (a generic blue) instead of
 *    the app's #D97757 accent.
 *  - One place to update the brand → all emails inherit consistently.
 *  - Product-name-agnostic strings ("Your verification code") so the
 *    wordmark can be swapped via the PRODUCT_NAME env var without
 *    touching layout.
 *
 * All helpers are pure string builders. No imports, no side effects, so
 * this is safe to load from any Convex Node action or query.
 */

// Brand tokens — match the in-app dashboard.
export const BRAND = Object.freeze({
  // Surfaces (kept on a light/cream background so emails render well in
  // every client, even those without dark-mode CSS support).
  bg: "#F5F1EA",
  card: "#FFFFFF",
  cardBorder: "#E7E5E4",
  ink: "#1C1917",
  inkSoft: "#57534E",
  muted: "#A8A29E",
  // Accent + actions.
  accent: "#D97757",
  accentHover: "#C26242",
  accentSurface: "#FBE9DF",
  // Hairline divider colour for the footer.
  rule: "#E7E5E4",
  // Email-safe font stack. Inter is preferred when available; we fall back
  // through the standard system stack so plain Outlook still looks clean.
  font:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
});

/**
 * Tiny helper to escape user-supplied strings before injecting them into
 * an email template. Defends against an attacker putting `<script>` tags
 * into their first name and us blasting that to a manager's inbox.
 *
 * Resend's HTML is rendered, so the same XSS rules apply as the web.
 */
export function escapeHtml(input) {
  if (input === undefined || input === null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render a primary call-to-action button. Inline styles only — Gmail,
 * Outlook, etc. routinely strip <style> blocks.
 */
export function renderButton(href, label) {
  const safeLabel = escapeHtml(label);
  return `<a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#FFFFFF;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;line-height:1;margin:18px 0;font-family:${BRAND.font};">${safeLabel}</a>`;
}

/**
 * Centred, big numeric code block — used for verification + password
 * reset emails. Many clients (Apple Mail, Gmail mobile) auto-detect
 * monospace OTP-style numbers and surface them as quick-fill chips.
 */
export function renderCodeBlock(code) {
  const safeCode = escapeHtml(code);
  return `
<div style="margin:24px 0;padding:18px 16px;background:${BRAND.accentSurface};border:1px solid ${BRAND.accent}33;border-radius:12px;text-align:center;">
  <div style="font-family:'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;font-size:32px;font-weight:600;letter-spacing:6px;color:${BRAND.ink};">${safeCode}</div>
</div>`;
}

/**
 * Block-quote treatment — used to surface user-generated content
 * (goal titles, comment previews, invitation messages) inline.
 */
export function renderQuote(content) {
  // content is HTML — caller is responsible for escaping any
  // user-supplied text BEFORE passing it in.
  return `<blockquote style="border-left:3px solid ${BRAND.accent};margin:14px 0;padding:10px 16px;background:${BRAND.accentSurface};border-radius:6px;font-size:15px;line-height:1.5;color:${BRAND.ink};font-family:${BRAND.font};">${content}</blockquote>`;
}

/**
 * Soft note treatment — secondary blockquote for things like
 * "Note from your manager:" decisions or user messages that should look
 * less prominent than the primary content.
 */
export function renderNote(content) {
  return `<blockquote style="border-left:3px solid ${BRAND.cardBorder};margin:14px 0;padding:10px 16px;background:${BRAND.bg};border-radius:6px;font-size:14px;line-height:1.5;color:${BRAND.inkSoft};font-family:${BRAND.font};">${content}</blockquote>`;
}

/**
 * Wrap any inner HTML in the canonical email shell:
 *   - hidden preheader (~80 chars in inbox preview)
 *   - branded header
 *   - card with the content
 *   - footer
 *
 * `appUrl` is required so the footer's "manage notifications" link works
 * even when consumers are loaded from environments where
 * NEXT_PUBLIC_APP_URL might not be set.
 */
export function renderEmailShell({
  preheader = "",
  appUrl,
  productName = "Arcora",
  logoUrl = "",
  innerHtml,
  showManageNotifications = true,
  footerNote = "",
}) {
  const safePreheader = escapeHtml(preheader);
  const safeProduct = escapeHtml(productName);
  const settingsUrl = `${appUrl}/settings`;

  // Logo: use an <img> when a URL is provided (the marketing site or a
  // public CDN). Otherwise we fall back to a textual wordmark in the
  // brand accent. Keeping this logoUrl-toggleable means we can flip on a
  // hosted logo later without redeploying the email layout.
  const headerMark = logoUrl
    ? `<img src="${logoUrl}" alt="${safeProduct}" width="120" style="display:block;max-width:160px;height:auto;border:0;outline:none;" />`
    : `<span style="font-family:${BRAND.font};font-weight:700;font-size:20px;color:${BRAND.accent};letter-spacing:-0.2px;">${safeProduct}</span>`;

  const manageBlock = showManageNotifications
    ? `<a href="${settingsUrl}" style="color:${BRAND.muted};text-decoration:underline;">Manage notifications</a>`
    : "";

  const footerExtraBlock = footerNote
    ? `<p style="margin:0 0 8px;color:${BRAND.muted};font-size:12px;line-height:1.5;font-family:${BRAND.font};">${footerNote}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeProduct}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.font};color:${BRAND.ink};">
  <!-- Hidden preheader: shows in inbox preview, never in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.bg};opacity:0;">${safePreheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:0 4px 18px;">
              ${headerMark}
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.cardBorder};border-radius:14px;padding:32px 28px;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 4px 0;">
              <hr style="border:0;border-top:1px solid ${BRAND.rule};margin:0 0 14px;" />
              ${footerExtraBlock}
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.5;font-family:${BRAND.font};">
                Sent by ${safeProduct} &middot; your AI onboarding companion${manageBlock ? ` &middot; ${manageBlock}` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Convenience wrapper: builds a full HTML email from a heading + body
 * markup, plus a primary CTA. Most lifecycle emails fit this shape.
 */
export function renderTemplate({
  preheader,
  appUrl,
  productName,
  logoUrl,
  heading,
  bodyHtml,
  ctaHref,
  ctaLabel,
  showManageNotifications = true,
  footerNote = "",
}) {
  const safeHeading = escapeHtml(heading);
  const ctaBlock = ctaHref && ctaLabel ? renderButton(ctaHref, ctaLabel) : "";
  const inner = `
<h1 style="margin:0 0 12px;font-family:${BRAND.font};font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${safeHeading}</h1>
${bodyHtml}
${ctaBlock}`;

  return renderEmailShell({
    preheader,
    appUrl,
    productName,
    logoUrl,
    innerHtml: inner,
    showManageNotifications,
    footerNote,
  });
}
