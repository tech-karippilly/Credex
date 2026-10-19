import { Link } from "@tanstack/react-router";
import { Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { company, nav } from "@/lib/site";
import { telHref, useContent } from "@/lib/content";
import { Logo } from "./Logo";

export function Footer() {
  const { settings } = useContent();
  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Logo />
          <p className="mt-3 font-display text-lg text-primary">{company.tagline}</p>
          <div className="mt-6 flex gap-3">
            {settings.linkedin && <a href={settings.linkedin} target="_blank" rel="noopener noreferrer" aria-label="CREDEX on LinkedIn" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary">
              <Linkedin className="h-4 w-4" />
            </a>}
            {settings.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" aria-label="CREDEX on Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary">
              <Instagram className="h-4 w-4" />
            </a>}
          </div>
        </div>
        <div className="lg:col-span-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Navigation</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {nav.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:text-primary">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Contact</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-primary" /><a href={`mailto:${settings.email}`} className="hover:text-primary">{settings.email}</a></li>
            <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-primary" /><a href={telHref(settings.phone)} className="hover:text-primary">{settings.phone}</a></li>
            <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-primary" />{settings.location}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} {company.brand} All rights reserved.</p>
          <p>CIN: {company.cin} · {company.website}</p>
        </div>
      </div>
    </footer>
  );
}
