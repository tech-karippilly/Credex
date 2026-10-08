import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { nav } from "@/lib/site";
import { Logo } from "./Logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled || open ? "border-border bg-background/95 backdrop-blur" : "border-transparent bg-background/80 backdrop-blur"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="container-site flex h-[72px] items-center justify-between gap-6">
        <Link to="/" aria-label="Credex.in Tech Solutions — Home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  activeProps={{ className: "text-primary" }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/contact" className="btn btn-primary hidden h-10 px-5 text-sm sm:inline-flex">Let's Talk</Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-border bg-background lg:hidden">
          <ul className="container-site flex flex-col py-4">
            {nav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 font-medium text-foreground hover:bg-muted"
                  activeProps={{ className: "text-primary" }}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="mt-3">
              <Link to="/contact" onClick={() => setOpen(false)} className="btn btn-primary w-full">Let's Talk</Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
