import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ClayButton } from "./ui/ClayButton";

const links = [
  { href: "#product", label: "product" },
  { href: "#how-it-works", label: "how it works" },
  { href: "#intelligence", label: "intelligence" },
  { href: "#reports", label: "reports" },
  { href: "#about", label: "about" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger expansion when scrolled past 20px
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex w-full justify-center px-3 pt-3.5 pb-1 sm:px-6 pointer-events-none">
      <div
        className={`pointer-events-auto pill-nav-bubble clay relative w-full border border-white/80 backdrop-blur-[14px] ${
          isScrolled
            ? "max-w-6xl rounded-[22px] bg-white/95 px-5 py-2.5 shadow-[0_14px_30px_-4px_rgba(71,71,184,0.14)] sm:px-7"
            : "max-w-[560px] md:max-w-[660px] lg:max-w-[760px] rounded-full bg-white/90 px-4 py-2 shadow-[0_10px_24px_-2px_rgba(71,71,184,0.12)] sm:px-5"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#top"
            className="group flex items-center gap-2 font-display text-[20px] font-medium tracking-tight text-ink no-underline pill-bubble-item"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span>lociva</span>
          </a>

          {/* Desktop Navigation Links */}
          <nav
            className={`hidden items-center transition-all duration-300 lg:flex ${
              isScrolled ? "gap-2.5" : "gap-1"
            }`}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="pill-bubble-item rounded-full px-3 py-1 text-[13px] font-medium text-muted no-underline transition-colors hover:bg-white hover:text-ink hover:shadow-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action Button & Mobile Toggle */}
          <div className="flex items-center gap-2">
            <ClayButton
              href="#product"
              className="pill-bubble-item hidden !rounded-full !px-4 !py-1.5 text-[12.5px] sm:inline-flex"
            >
              explore lociva
            </ClayButton>

            <button
              type="button"
              className="clay clay-press pill-bubble-item inline-flex h-8 w-8 items-center justify-center rounded-full text-ink lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu (Bubble Transition) */}
        {open && (
          <div className="mt-3 border-t border-[#ececf6] pt-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-2 text-[13.5px] font-medium text-ink no-underline transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 border-t border-[#ececf6] pt-2 sm:hidden">
                <ClayButton
                  href="#product"
                  className="w-full !rounded-full !py-2 text-[13px]"
                >
                  explore lociva
                </ClayButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
