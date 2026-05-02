import Script from "next/script";
import { Inter, Instrument_Serif, Space_Grotesk } from "next/font/google";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import IconifyProvider from "@/components/providers/IconifyProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const themeInit = `
try {
  if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {}
`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usearcora.com";

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Arcora — Your first 90 days, engineered for impact.",
    template: "%s · Arcora",
  },
  description:
    "Generate a comprehensive, role-specific 30/60/90-day plan instantly with AI. Align with your manager and hit the ground running.",
  applicationName: "Arcora",
  authors: [{ name: "Rulz & Co" }],
  creator: "Rulz & Co",
  publisher: "Rulz & Co",
  keywords: [
    "90-day plan",
    "new job",
    "onboarding",
    "30 60 90",
    "manager alignment",
    "AI career planner",
  ],
  openGraph: {
    type: "website",
    siteName: "Arcora",
    title: "Arcora — Your first 90 days, engineered for impact.",
    description:
      "Generate a comprehensive, role-specific 30/60/90-day plan instantly with AI. Align with your manager and hit the ground running.",
    url: APP_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Arcora — Your first 90 days, engineered for impact.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcora — Your first 90 days, engineered for impact.",
    description:
      "Generate a comprehensive, role-specific 30/60/90-day plan instantly with AI.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F2E8" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0E0D" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} font-sans antialiased selection:bg-[#D97757]/20 selection:text-[#D97757] text-[#1C1917] dark:text-[#E7E5E4]`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <IconifyProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </IconifyProvider>
      </body>
    </html>
  );
}
