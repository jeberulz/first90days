// Public robots.txt. Allow crawling everywhere except the in-app routes
// (which are auth-gated anyway) and the user-public /p/* shared plans
// (private content the user opted to share with specific people, not
// with search engines).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usearcora.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sample/", "/signup", "/login", "/terms", "/privacy"],
        disallow: ["/dashboard", "/today", "/plan", "/tasks", "/progress", "/stakeholders", "/knowledge", "/settings", "/log", "/reflect/", "/onboarding/", "/p/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
