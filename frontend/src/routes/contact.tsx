import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { company } from "@/lib/site";
import { telHref, useContent } from "@/lib/content";
import { seo } from "@/lib/seo";
import { PageHero } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/forms";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      title: "Contact Credex | Talk to a Technology Partner in Kerala",
      description: "Have a business challenge, software requirement or technology idea? Contact Credex.in Tech Solutions in Irinjalakuda, Kerala.",
      path: "/contact",
    }),
  component: Contact,
});

function Contact() {
  const { settings } = useContent();
  const info: { icon: typeof Mail; label: string; value: string; href?: string }[] = [
    { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}` },
    { icon: Phone, label: "Phone", value: settings.phone, href: telHref(settings.phone) },
    { icon: MapPin, label: "Location", value: settings.location },
    { icon: Globe, label: "Website", value: company.website, href: `https://${company.website}` },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's Build Something That Matters." text="Have a business challenge, software requirement or technology idea? Talk to the Credex team." />
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
                  {i.href ? <a href={i.href} className="font-semibold hover:text-primary">{i.value}</a> : <p className="font-semibold">{i.value}</p>}
                </div>
              </li>
            ))}
          </ul>
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
