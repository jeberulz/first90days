import Link from "next/link";
import { BLOG_POSTS, formatDate } from "@/lib/blog";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usearcora.com";

export const metadata = {
  title: "Blog · Arcora",
  description:
    "Career planning guides for new hires — 30-60-90 day plans, manager alignment, and how to make an impact from day one.",
  alternates: { canonical: `${APP_URL}/blog` },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );

  return (
    <main className="pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <p className="font-space-grotesk text-xs uppercase tracking-wide text-[#A8A29E] mb-2">
            Blog
          </p>
          <h1 className="font-instrument-serif text-4xl sm:text-5xl text-[#1C1917] dark:text-[#E7E5E4] tracking-[-0.5px] leading-tight mb-3">
            Career planning guides
          </h1>
          <p className="font-space-grotesk text-sm text-[#57534E] dark:text-[#A8A29E]">
            How to start strong, align with your manager, and make an impact in your first 90 days.
          </p>
        </header>

        <ul className="divide-y divide-[#D1CDC7] dark:divide-[#2C2825]">
          {posts.map((post) => (
            <li key={post.slug} className="py-8 first:pt-0">
              <Link
                href={`/blog/${post.slug}`}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
              >
                <time
                  dateTime={post.publishedAt}
                  className="font-space-grotesk text-xs text-[#A8A29E] mb-2 block"
                >
                  {formatDate(post.publishedAt)}
                </time>
                <h2 className="font-instrument-serif text-2xl sm:text-3xl text-[#1C1917] dark:text-[#E7E5E4] mb-2 group-hover:text-accent transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="font-space-grotesk text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-3">
                  {post.excerpt}
                </p>
                <span className="font-space-grotesk text-xs font-medium text-accent">
                  Read article →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
