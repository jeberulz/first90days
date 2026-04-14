import { Suspense } from "react";
import CompanyReviewClient from "@/components/knowledge/CompanyReviewClient";

function CompanyReviewFallback() {
  return (
    <div className="space-y-4">
      <div className="h-6 bg-[#1C1917] rounded-lg animate-pulse w-40" />
      <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-2/3 max-w-md" />
      <div className="h-[min(560px,70vh)] bg-[#1C1917] border border-[#44403C]/90 rounded-xl animate-pulse" />
    </div>
  );
}

export default function CompanyReviewPage() {
  return (
    <Suspense fallback={<CompanyReviewFallback />}>
      <CompanyReviewClient />
    </Suspense>
  );
}
