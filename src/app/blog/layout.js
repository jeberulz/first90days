import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";

export default function BlogLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F2E8] dark:bg-[#0F0E0D] text-[#1C1917] dark:text-[#E7E5E4]">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
