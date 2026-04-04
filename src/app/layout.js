import "./globals.css";

export const metadata = {
  title: "First90 - Intelligent Onboarding",
  description:
    "Tackle the ambiguity of a new role with a structured plan. First90 simplifies complexity into a day-by-day roadmap.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            `,
          }}
        />
      </head>
      <body className="font-sans bg-cream-100 dark:bg-[#1a1915] text-charcoal dark:text-cream-100 antialiased selection:bg-terracotta/20 selection:text-terracotta">
        {children}
      </body>
    </html>
  );
}
