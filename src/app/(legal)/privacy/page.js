// Privacy Policy — Arcora
// Last reviewed: 2026-05-02
//
// Drafted to be UK GDPR + EEA GDPR friendly for a solo-built SaaS. Lists
// concrete sub-processors actually wired into the codebase (Convex,
// Stripe, Resend, Anthropic, OpenAI, Vercel, Beehiiv, Upstash). Plain
// English where possible.
//
// Not legal advice. Rulz reviewed and approved the scope.

import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Arcora",
  description:
    "How Arcora collects, uses, shares, and protects your information.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "controller", label: "Who is the data controller?" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "how-we-use", label: "How we use it" },
  { id: "lawful-basis", label: "Lawful basis (UK / EU)" },
  { id: "ai-data", label: "AI processing of your data" },
  { id: "subprocessors", label: "Sub-processors" },
  { id: "sharing", label: "Sharing your information" },
  { id: "retention", label: "Retention" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights" },
  { id: "international", label: "International transfers" },
  { id: "cookies", label: "Cookies and tracking" },
  { id: "children", label: "Children's privacy" },
  { id: "changes", label: "Changes to this policy" },
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

const SUBPROCESSORS = [
  {
    name: "Convex",
    purpose: "Application database and backend functions",
    location: "United States",
    link: "https://www.convex.dev/legal/privacy",
  },
  {
    name: "Vercel",
    purpose: "Web app hosting and edge networking",
    location: "United States",
    link: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Stripe",
    purpose: "Payment processing for the Pro subscription",
    location: "United States / United Kingdom",
    link: "https://stripe.com/privacy",
  },
  {
    name: "Resend",
    purpose: "Transactional email (verification codes, plan-ready, reminders, invitations)",
    location: "United States",
    link: "https://resend.com/legal/privacy-policy",
  },
  {
    name: "Anthropic (Claude)",
    purpose: "AI generation of plans, milestones, and analysis",
    location: "United States",
    link: "https://www.anthropic.com/legal/privacy",
  },
  {
    name: "OpenAI",
    purpose: "AI generation and embeddings for knowledge-base search",
    location: "United States",
    link: "https://openai.com/policies/privacy-policy/",
  },
  {
    name: "Upstash (optional)",
    purpose: "Distributed rate limiting",
    location: "United States",
    link: "https://upstash.com/trust/privacy.pdf",
  },
  {
    name: "Beehiiv (optional)",
    purpose: "Newsletter and waitlist email delivery",
    location: "United States",
    link: "https://www.beehiiv.com/privacy",
  },
];

export default function PrivacyPage() {
  return (
    <div className="font-space-grotesk text-[15px]">
      <h1 className="font-instrument-serif text-4xl sm:text-5xl mb-3">
        Privacy Policy
      </h1>
      <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mb-8">
        Last updated: 2 May 2026
      </p>

      <P>
        This Privacy Policy explains what information{" "}
        <strong>Arcora</strong> (the &ldquo;<strong>Service</strong>
        &rdquo;), provided by <strong>Rulz &amp; Co</strong> (&ldquo;
        <strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;)
        collects when you use it, how we use that information, who we
        share it with, and what rights you have.
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

      <H2 id="overview">1. Overview</H2>
      <P>
        Arcora is a workspace that helps people in their first 90 days at
        a new job. To do that we need to know things like your role,
        company name, manager, and goals. We try to collect the minimum
        we need to run the Service well, and to be transparent about
        what happens with that data.
      </P>
      <UL>
        <li>We do not sell your personal data.</li>
        <li>We do not train AI models on your data.</li>
        <li>You can export and delete your data at any time.</li>
      </UL>

      <H2 id="controller">2. Who is the data controller?</H2>
      <P>
        The data controller is <strong>Rulz &amp; Co</strong>, based in
        Manchester, United Kingdom. You can reach the controller at{" "}
        <a
          href="mailto:hello@switchtoux.com"
          className="text-accent underline"
        >
          hello@switchtoux.com
        </a>
        .
      </P>

      <H2 id="what-we-collect">3. What we collect</H2>
      <P>We collect three categories of information:</P>
      <UL>
        <li>
          <strong>Account info</strong>: name, email, password (stored
          hashed), profile photo if you upload one, and authentication
          metadata such as session timestamps and recent IP addresses
          (for security and account-lockout protection).
        </li>
        <li>
          <strong>Plan data</strong>: information you provide when
          building your 90-day plan — role title, company name, function,
          start date, work model, goals, success definition,
          stakeholders, knowledge-base notes, journal entries, and any
          documents (e.g. job description) you choose to upload.
        </li>
        <li>
          <strong>Usage data</strong>: how you interact with the Service
          (page views, feature usage, errors). We use this to improve the
          product. We may use a privacy-friendly analytics service (e.g.
          PostHog or Plausible) configured to avoid tracking
          cross-product identifiers.
        </li>
      </UL>
      <P>
        Billing payment details (card numbers) are handled directly by
        Stripe. We never see or store full card details — only the last
        four digits and brand for receipt display.
      </P>

      <H2 id="how-we-use">4. How we use it</H2>
      <UL>
        <li>To create your account and authenticate you.</li>
        <li>To generate your personalised 90-day plan and the related milestones, prompts, and insights.</li>
        <li>To deliver transactional emails (verification, password reset, plan-ready, daily reminders, weekly reflections, manager invites, and so on).</li>
        <li>To process and manage your Pro subscription if you choose to upgrade.</li>
        <li>To respond to support requests.</li>
        <li>To detect, investigate, and prevent abuse, fraud, and security incidents.</li>
        <li>To comply with legal obligations.</li>
      </UL>

      <H2 id="lawful-basis">5. Lawful basis (UK / EU)</H2>
      <P>If UK GDPR or EU GDPR applies to you, we rely on:</P>
      <UL>
        <li>
          <strong>Performance of a contract</strong> — to provide the
          Service you signed up for.
        </li>
        <li>
          <strong>Legitimate interests</strong> — to keep the Service
          secure, to prevent abuse, and to improve the product. These
          interests are balanced against your rights and freedoms.
        </li>
        <li>
          <strong>Consent</strong> — for optional features like the
          newsletter signup. You can withdraw consent at any time.
        </li>
        <li>
          <strong>Legal obligation</strong> — where law requires us to
          retain or disclose data (for example, tax records).
        </li>
      </UL>

      <H2 id="ai-data">6. AI processing of your data</H2>
      <P>
        Arcora generates plans and other personalised content using
        third-party AI providers — currently <strong>Anthropic</strong>{" "}
        (Claude) and <strong>OpenAI</strong>. To produce useful output,
        we send relevant parts of your plan data and uploaded documents
        to these providers as part of API requests.
      </P>
      <UL>
        <li>Both providers are bound by their data processing agreements with us.</li>
        <li>Neither provider trains their general-purpose models on data we send through their APIs.</li>
        <li>Your data is sent over encrypted HTTPS connections.</li>
        <li>You can review and delete the inputs at any time by editing or removing your plan content.</li>
      </UL>

      <H2 id="subprocessors">7. Sub-processors</H2>
      <P>
        We use the following third-party services to run Arcora. Each one
        only receives the data necessary for its function.
      </P>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left">
              <th className="border-b border-[#D1CDC7] dark:border-[#2C2825] py-2 pr-4 font-medium text-[#57534E] dark:text-[#A8A29E]">Provider</th>
              <th className="border-b border-[#D1CDC7] dark:border-[#2C2825] py-2 pr-4 font-medium text-[#57534E] dark:text-[#A8A29E]">Purpose</th>
              <th className="border-b border-[#D1CDC7] dark:border-[#2C2825] py-2 pr-4 font-medium text-[#57534E] dark:text-[#A8A29E]">Location</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((sp) => (
              <tr key={sp.name}>
                <td className="border-b border-[#E7E5E4] dark:border-[#2C2825]/60 py-2.5 pr-4 align-top">
                  <a
                    href={sp.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline"
                  >
                    {sp.name}
                  </a>
                </td>
                <td className="border-b border-[#E7E5E4] dark:border-[#2C2825]/60 py-2.5 pr-4 align-top">
                  {sp.purpose}
                </td>
                <td className="border-b border-[#E7E5E4] dark:border-[#2C2825]/60 py-2.5 pr-4 align-top">
                  {sp.location}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        We&apos;ll update this list when we add or remove sub-processors
        and notify users of material changes via email.
      </P>

      <H2 id="sharing">8. Sharing your information</H2>
      <P>We share information only:</P>
      <UL>
        <li>With sub-processors as described above.</li>
        <li>With managers and collaborators you explicitly invite (and only the parts of your plan you choose to share).</li>
        <li>To comply with valid legal requests (court orders, lawful subpoenas).</li>
        <li>To protect rights, property, or safety where necessary.</li>
        <li>If we ever go through a sale, merger, or asset transfer, with notice to you.</li>
      </UL>
      <P>We don&apos;t sell your personal data, and we don&apos;t share it with advertisers.</P>

      <H2 id="retention">9. Retention</H2>
      <UL>
        <li>Active accounts: data retained while your account is active.</li>
        <li>Account deletion: data deleted or anonymised within 90 days.</li>
        <li>Billing records: kept for at least 6 years where required by tax law.</li>
        <li>Inactive accounts (12+ months no login): we may delete or anonymise data after notifying you by email.</li>
      </UL>

      <H2 id="security">10. Security</H2>
      <P>
        We use TLS in transit, encrypted databases at rest (managed by
        Convex), bcrypt-hashed passwords, account-lockout protection, and
        single-use email codes for sensitive actions. No system is 100%
        secure, but we follow industry-standard practices and review them
        regularly.
      </P>

      <H2 id="your-rights">11. Your rights</H2>
      <P>If UK GDPR or EU GDPR applies, you have the right to:</P>
      <UL>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>Delete your data (subject to legal-retention exceptions).</li>
        <li>Restrict or object to processing in certain circumstances.</li>
        <li>Receive a copy of your data in a portable format.</li>
        <li>Withdraw consent where processing is based on consent.</li>
        <li>Lodge a complaint with the UK Information Commissioner&apos;s Office (<a href="https://ico.org.uk/" className="text-accent underline" target="_blank" rel="noreferrer">ico.org.uk</a>) or your local data protection authority.</li>
      </UL>
      <P>
        To exercise any of these rights, email{" "}
        <a
          href="mailto:hello@switchtoux.com"
          className="text-accent underline"
        >
          hello@switchtoux.com
        </a>
        . We&apos;ll respond within 30 days.
      </P>

      <H2 id="international">12. International transfers</H2>
      <P>
        Some of our sub-processors are located outside the UK / EEA
        (mostly in the United States). Where we transfer personal data
        internationally, we rely on Standard Contractual Clauses or
        equivalent safeguards, as offered by those providers&apos; data
        processing agreements.
      </P>

      <H2 id="cookies">13. Cookies and tracking</H2>
      <P>
        We use a small number of strictly necessary cookies to keep you
        signed in and to remember your settings (e.g. dark-mode
        preference). We do not use advertising cookies and we do not
        track you across other websites.
      </P>
      <P>
        If we add product analytics, we will use a privacy-friendly
        provider configured to avoid persistent cross-site tracking, and
        we&apos;ll update this section before turning it on.
      </P>

      <H2 id="children">14. Children&apos;s privacy</H2>
      <P>
        Arcora is not intended for children under 18. We do not knowingly
        collect personal data from children. If you believe a child has
        provided us with personal data, contact us and we&apos;ll delete
        it.
      </P>

      <H2 id="changes">15. Changes to this policy</H2>
      <P>
        We may update this policy. If we make material changes,
        we&apos;ll notify you by email or in-app at least 14 days before
        the change takes effect. The &ldquo;Last updated&rdquo; date at
        the top will always reflect the most recent revision.
      </P>

      <H2 id="contact">16. Contact</H2>
      <P>
        Questions about this policy or your data?{" "}
        <a
          href="mailto:hello@switchtoux.com"
          className="text-accent underline"
        >
          hello@switchtoux.com
        </a>
      </P>

      <p className="mt-12 mb-4 text-sm text-[#78716C]">
        See also: <Link href="/terms" className="text-accent underline">Terms of Service</Link>
      </p>
    </div>
  );
}
