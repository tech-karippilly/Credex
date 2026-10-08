import { Link } from "@tanstack/react-router";
import { Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { company, nav } from "@/lib/site";
import { telHref, useContent } from "@/lib/content";
import { Logo } from "./Logo";

export function Footer() {
  const { settings } = useContent();
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Logo inverted />
          <p className="mt-6 text-sm font-semibold tracking-wide">{company.legalName}</p>
          <p className="mt-2 font-display text-xl text-cyan">{company.tagline}</p>
          <div className="mt-6 flex gap-3">
            {settings.linkedin && <a href={settings.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Credex on LinkedIn" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-border hover:border-cyan hover:text-cyan">
              <Linkedin className="h-4 w-4" />
            </a>}
            {settings.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" aria-label="Credex on Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-border hover:border-cyan hover:text-cyan">
              <Instagram className="h-4 w-4" />
            </a>}
          </div>
        </div>
        <div className="lg:col-span-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Navigation</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {nav.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:text-cyan">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Contact</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-cyan" /><a href={`mailto:${settings.email}`} className="hover:text-cyan">{settings.email}</a></li>
            <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-cyan" /><a href={telHref(settings.phone)} className="hover:text-cyan">{settings.phone}</a></li>
            <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-cyan" />{settings.location}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-border">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-ink-muted md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} {company.brand} All rights reserved.</p>
          <p>CIN: {company.cin} · {company.website}</p>
        </div>
      </div>
    </footer>
  );
}
