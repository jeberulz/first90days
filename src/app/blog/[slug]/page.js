import { notFound } from "next/navigation";
import Link from "next/link";
import { BLOG_POSTS, getPostBySlug, formatDate } from "@/lib/blog";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usearcora.com";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.meta.title} · Arcora`,
    description: post.meta.description,
    alternates: { canonical: `${APP_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      type: "article",
      publishedTime: post.publishedAt,
      url: `${APP_URL}/blog/${post.slug}`,
    },
  };
}

export default function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <main className="pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <nav className="mb-8">
          <Link
            href="/blog"
            className="font-space-grotesk text-xs text-[#78716C] dark:text-[#A8A29E] hover:text-accent transition-colors"
          >
            ← All articles
          </Link>
        </nav>

        <header className="mb-10">
          <time
            dateTime={post.publishedAt}
            className="font-space-grotesk text-xs text-[#A8A29E] mb-3 block"
          >
            {formatDate(post.publishedAt)}
          </time>
        </header>

        <article>
          <MarkdownRenderer content={post.content} />
        </article>

        <footer className="mt-12 pt-8 border-t border-[#D1CDC7] dark:border-[#2C2825]">
          <Link
            href="/blog"
            className="font-space-grotesk text-sm text-[#78716C] dark:text-[#A8A29E] hover:text-accent transition-colors"
          >
            ← Back to all articles
          </Link>
        </footer>
      </div>
    </main>
  );
}
