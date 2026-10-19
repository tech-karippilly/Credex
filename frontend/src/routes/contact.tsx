import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Globe, Building2, ArrowUpRight } from "lucide-react";
import { company } from "@/lib/site";
import { telHref, useContent } from "@/lib/content";
import { seo } from "@/lib/seo";
import { PageHero } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/forms";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      title: "Contact CREDEX | Book a Lending Platform Demo in Kerala",
      description: "Want a demo of the CREDEX lending platform or have a question? Contact the CREDEX team in Irinjalakuda, Thrissur, Kerala.",
      path: "/contact",
    }),
  component: Contact,
});

function Contact() {
  const { settings } = useContent();
  const info: { icon: typeof Mail; label: string; value: string; href?: string; external?: boolean }[] = [
    { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}` },
    { icon: Phone, label: "Phone", value: settings.phone, href: telHref(settings.phone) },
    { icon: MapPin, label: "Location", value: settings.location },
    { icon: Globe, label: "Website", value: company.website, href: `https://${company.website}` },
    { icon: Building2, label: "Parent company", value: "NEURAFORGE AI", href: "https://www.neuraforgeai.org/", external: true },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's Build Something That Matters." text="Want to see CREDEX in action or discuss your lending book? Talk to the CREDEX team." />
      <section className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h2 className="text-2xl font-semibold">Get in touch</h2>
          <p className="mt-3 text-muted-foreground">Reach us directly or send an enquiry using the form.</p>
          <ul className="mt-8 space-y-4">
            {info.map((i) => (
              <li key={i.label} className="card-site flex items-center gap-4 p-5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><i.icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{i.label}</p>
                  {i.href ? (
                    <a
                      href={i.href}
                      {...(i.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="inline-flex items-center gap-1 font-semibold hover:text-primary"
                    >
                      {i.value}
                      {i.external && <ArrowUpRight className="h-3.5 w-3.5" />}
                    </a>
                  ) : (
                    <p className="font-semibold">{i.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Developed by NEURAFORGE */}
          <div className="card-bento relative mt-6 overflow-hidden p-6">
            <div className="dot-matrix pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Building2 className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Built by NEURAFORGE AI</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  CREDEX is designed and developed by <strong className="font-semibold text-foreground">NEURAFORGE AI</strong>, a technology
                  company building modern software for India&apos;s lenders. Learn more about the team and our wider work.
                </p>
                <a
                  href="https://www.neuraforgeai.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  Visit neuraforgeai.org
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="card-site p-6 md:p-10">
          <h2 className="text-2xl font-semibold">Send an enquiry</h2>
          <p className="mt-2 mb-8 text-muted-foreground">Fields marked * are required.</p>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
