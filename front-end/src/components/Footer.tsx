const links = [
  { href: "#product", label: "product" },
  { href: "#how-it-works", label: "how it works" },
  { href: "#reports", label: "reports" },
  { href: "#about", label: "about" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#ececf6] bg-white/40 px-5 py-12 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <a href="#top" className="font-display text-[22px] font-medium text-ink no-underline">
            lociva
          </a>
          <p className="mt-1 text-[13px] text-muted">
            Location intelligence & civic analytics
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-muted no-underline transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col justify-between gap-2 border-t border-[#f0f0f8] pt-6 text-[12px] text-muted sm:flex-row">
        <p>Built for better decisions, one area at a time.</p>
        <p>Prototype & demonstration model · All simulation data for concept demonstration.</p>
      </div>
    </footer>
  );
}
