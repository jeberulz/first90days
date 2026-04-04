import { Twitter, Github, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#131313] py-24 text-cream-100">
      <div className="max-w-7xl mx-auto px-6">
        {/* Logo */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6 text-terracotta">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span className="font-serif text-2xl">First90</span>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-sm border-t pt-12 border-white/10">
          <div>
            <h4 className="font-medium mb-4 text-white">Product</h4>
            <ul className="space-y-3 text-white/50">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Integrations
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4 text-white">Resources</h4>
            <ul className="space-y-3 text-white/50">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  API Reference
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4 text-white">Company</h4>
            <ul className="space-y-3 text-white/50">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Careers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4 text-white">Legal</h4>
            <ul className="space-y-3 text-white/50">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-center mt-20 text-xs text-white/30">
          <div>&copy; 2024 First90 Inc.</div>
          <div className="flex gap-4">
            <Twitter className="w-4 h-4 cursor-pointer transition hover:text-white" />
            <Github className="w-4 h-4 cursor-pointer transition hover:text-white" />
            <Linkedin className="w-4 h-4 cursor-pointer transition hover:text-white" />
          </div>
        </div>
      </div>
    </footer>
  );
}
