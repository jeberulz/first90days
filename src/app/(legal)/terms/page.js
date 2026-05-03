// Terms of Service — Arcora
// Last reviewed: 2026-05-02
//
// Plain-English ToS for a solo-built SaaS. Covers the unusual primitives
// for this product:
//   - AI-generated 90-day onboarding plans (output is informational, not
//     career advice)
//   - Stripe-hosted billing for the Pro tier
//   - Manager / collaborator share links
//   - Resend transactional email
//   - Anthropic + OpenAI as sub-processors
//
// Not legal advice. Rulz reviewed and signed off on the content scope.

import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Arcora",
  description:
    "Terms governing access to and use of Arcora — the AI-powered 90-day onboarding workspace.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  { id: "agreement", label: "Your agreement with Arcora" },
  { id: "eligibility", label: "Eligibility" },
  { id: "account", label: "Your account" },
  { id: "service", label: "What Arcora is — and isn't" },
  { id: "ai-output", label: "AI-generated content" },
  { id: "your-content", label: "Your content" },
  { id: "sharing", label: "Sharing with managers" },
  { id: "billing", label: "Subscriptions, trials, and refunds" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "ip", label: "Intellectual property" },
  { id: "termination", label: "Termination" },
  { id: "warranty", label: "No warranties" },
  { id: "liability", label: "Limitation of liability" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

const containerCls = "mb-6 leading-relaxed";
const headingCls = "scroll-mt-20 mt-10 mb-3 font-instrument-serif text-2xl";
const bodyCls = "text-[#1C1917] dark:text-[#E7E5E4]";

function H2({ id, children }) {
  return (
    <h2 id={id} className={headingCls}>
      {children}
    </h2>
  );
}
function P({ children }) {
  return <p className={`${containerCls} ${bodyCls}`}>{children}</p>;
}
function UL({ children }) {
  return <ul className="list-disc pl-6 mb-6 space-y-1.5">{children}</ul>;
}

export default function TermsPage() {
  return (
    <div className="font-space-grotesk text-[15px]">
      <h1 className="font-instrument-serif text-4xl sm:text-5xl mb-3">
        Terms of Service
      </h1>
      <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mb-8">
        Last updated: 2 May 2026
      </p>

      <P>
        These terms (the &ldquo;<strong>Terms</strong>&rdquo;) govern your
        access to and use of <strong>Arcora</strong> (the &ldquo;
        <strong>Service</strong>&rdquo;), provided by{" "}
        <strong>Rulz &amp; Co</strong> (&ldquo;<strong>we</strong>&rdquo;,
        &ldquo;<strong>us</strong>&rdquo;), based in Manchester, United
        Kingdom. By creating an account, you agree to these Terms. If you
        don&apos;t agree, please don&apos;t use the Service.
      </P>

      <nav
        aria-label="On this page"
        className="border border-[#D1CDC7] dark:border-[#2C2825] rounded-xl p-4 mb-10 bg-white/60 dark:bg-[#1C1917]/60"
      >
        <p className="text-xs uppercase tracking-wider text-[#78716C] mb-2">
          On this page
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-[#57534E] dark:text-[#A8A29E] hover:text-accent transition-colors"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <H2 id="agreement">1. Your agreement with Arcora</H2>
      <P>
        These Terms form a legal agreement between you and Rulz &amp; Co.
        We may also publish supplemental terms for specific features (for
        example, beta features). Where supplemental terms apply, they are
        in addition to these Terms and will say so.
      </P>

      <H2 id="eligibility">2. Eligibility</H2>
      <P>You must be at least 18 years old to use Arcora. By using the Service you confirm you meet this requirement and have the legal capacity to enter these Terms.</P>

      <H2 id="account">3. Your account</H2>
      <P>To use most of Arcora, you create an account with an email and password.</P>
      <UL>
        <li>You are responsible for keeping your password secure.</li>
        <li>You are responsible for activity under your account.</li>
        <li>Tell us promptly at <a href="mailto:hello@switchtoux.com" className="text-accent underline">hello@switchtoux.com</a> if you believe your account has been compromised.</li>
        <li>One person per account. Don&apos;t share login credentials.</li>
      </UL>

      <H2 id="service">4. What Arcora is — and isn&apos;t</H2>
      <P>
        Arcora is a workspace that helps people who are starting a new job
        plan and track their first 90 days. We provide AI-generated 30/60/90 plans, a stakeholder map, knowledge tools, and shared review with managers.
      </P>
      <P>
        <strong>Arcora is not</strong>: legal advice, HR advice, recruitment
        services, employment counselling, or a substitute for your
        manager. We don&apos;t guarantee any career outcome, role
        progression, or job retention.
      </P>

      <H2 id="ai-output">5. AI-generated content</H2>
      <P>
        Plans, milestones, suggested questions, and other AI-generated
        content (&ldquo;<strong>AI Output</strong>&rdquo;) are produced by
        third-party large language models (currently Anthropic Claude and
        OpenAI). We tune the prompts; we don&apos;t control every word
        generated.
      </P>
      <UL>
        <li>AI Output may contain inaccuracies, omissions, or biased framing. Treat it as a starting point, not a source of truth.</li>
        <li>You are responsible for reviewing AI Output before relying on it, sharing it with your manager, or acting on it at work.</li>
        <li>We may change the underlying models, prompts, or generation behaviour at any time.</li>
      </UL>

      <H2 id="your-content">6. Your content</H2>
      <P>
        You retain ownership of the information you put into Arcora —
        your role context, stakeholder notes, journal entries, uploaded
        documents, and any plan content you customise (&ldquo;
        <strong>Your Content</strong>&rdquo;).
      </P>
      <P>
        You grant us a limited, worldwide, royalty-free licence to host,
        process, transmit, and display Your Content as needed to operate
        the Service for you. We do not sell Your Content. We do not train
        AI models on Your Content.
      </P>
      <P>
        Some Your Content may be sent to our AI sub-processors (Anthropic
        Claude, OpenAI) to generate AI Output for you. Anthropic and
        OpenAI process this data under their respective enterprise data
        terms and do not train their general-purpose models on it.
      </P>

      <H2 id="sharing">7. Sharing with managers and collaborators</H2>
      <P>
        Arcora lets you generate share links and invite a manager or
        teammate to view and comment on your plan. When you share, you
        choose what to share and with whom.
      </P>
      <UL>
        <li>Anyone you invite or who has a valid share link can view and comment as configured by you.</li>
        <li>You can revoke share links and remove collaborators at any time in your settings.</li>
        <li>You are responsible for choosing who you share Your Content with.</li>
      </UL>

      <H2 id="billing">8. Subscriptions, trials, and refunds</H2>
      <P>
        Arcora has a free tier and a paid <strong>Pro</strong>{" "}
        subscription. The free tier requires no card. Pro is{" "}
        <strong>$29 per month</strong> billed monthly, or{" "}
        <strong>$23 per month</strong> billed annually (as displayed at
        signup or on our pricing page).
      </P>
      <UL>
        <li>Pro includes a <strong>14-day free trial</strong>. Your card is charged at the end of the trial unless you cancel.</li>
        <li>Billing is processed by <strong>Stripe</strong>. We don&apos;t store your card details on our servers.</li>
        <li>You can cancel at any time in your account settings. Your Pro access remains active until the end of the current billing period.</li>
        <li>We do not provide pro-rata refunds for partial months. We may, at our discretion, offer a refund where required by law (for example, certain UK consumer rights).</li>
        <li>Prices and feature limits may change with notice via email or in-app at least 14 days before the change takes effect.</li>
      </UL>

      <H2 id="acceptable-use">9. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL>
        <li>Reverse-engineer, scrape, or attempt to derive the source of the Service.</li>
        <li>Use the Service to harass, harm, or impersonate others.</li>
        <li>Upload content that infringes someone else&apos;s rights, including confidential information you don&apos;t have permission to share.</li>
        <li>Send spam, bulk unsolicited messages, or fake invitations through the Service.</li>
        <li>Probe, scan, or test the Service for vulnerabilities without our written permission.</li>
        <li>Use the Service to build a competing product or to train AI models.</li>
      </UL>
      <P>We may suspend or terminate accounts that violate these rules.</P>

      <H2 id="ip">10. Intellectual property</H2>
      <P>
        The Arcora name, logo, design, code, and content (excluding Your
        Content and AI Output) are owned by Rulz &amp; Co or our licensors.
        These Terms don&apos;t grant you a licence to those except as
        needed to use the Service.
      </P>

      <H2 id="termination">11. Termination</H2>
      <P>
        You can stop using Arcora at any time and delete your account from
        settings. We can suspend or terminate accounts for violation of
        these Terms, prolonged inactivity (12+ months), or where required
        by law.
      </P>
      <P>
        On termination, your access ends and we delete or anonymise Your
        Content within 90 days, except where retention is required for
        legal, tax, or fraud-prevention reasons.
      </P>

      <H2 id="warranty">12. No warranties</H2>
      <P>
        Arcora is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;. We don&apos;t warrant that it will be
        error-free, uninterrupted, secure, or that AI Output will be
        accurate or fit for any particular purpose. To the fullest extent
        permitted by law, we disclaim all implied warranties.
      </P>

      <H2 id="liability">13. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, Rulz &amp; Co will not be
        liable for indirect, incidental, special, consequential, or
        exemplary damages, or for any loss of profits, revenue, data, use,
        goodwill, or other intangible losses, arising out of or related to
        your use of (or inability to use) the Service.
      </P>
      <P>
        Our total liability for any claim under or relating to these Terms
        is limited to the greater of (a) the amounts you paid us in the
        12 months before the claim, or (b) £50.
      </P>
      <P>
        Nothing in these Terms limits liability for fraud, fraudulent
        misrepresentation, death or personal injury caused by negligence,
        or any other liability that cannot be lawfully limited.
      </P>

      <H2 id="law">14. Governing law</H2>
      <P>
        These Terms are governed by the laws of England and Wales. The
        courts of England and Wales have exclusive jurisdiction over
        disputes, except where you have non-waivable consumer rights to
        bring a claim in your local courts.
      </P>

      <H2 id="changes">15. Changes to these Terms</H2>
      <P>
        We may update these Terms. If we make material changes, we&apos;ll
        notify you by email (to the address on your account) or in-app at
        least 14 days before the changes take effect. Continued use after
        changes take effect means you accept the updated Terms.
      </P>

      <H2 id="contact">16. Contact</H2>
      <P>
        Questions about these Terms? Email{" "}
        <a
          href="mailto:hello@switchtoux.com"
          className="text-accent underline"
        >
          hello@switchtoux.com
        </a>
        .
      </P>

      <p className="mt-12 mb-4 text-sm text-[#78716C]">
        See also: <Link href="/privacy" className="text-accent underline">Privacy Policy</Link>
      </p>
    </div>
  );
}
