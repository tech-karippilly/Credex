import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, Lightbulb, Users, BadgeCheck, ScanEye, RefreshCw, Handshake } from "lucide-react";
import team from "@/assets/team.jpg";
import { useContent } from "@/lib/content";
import { seo } from "@/lib/seo";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/blocks";

export const Route = createFileRoute("/about")({
  head: () =>
    seo({
      title: "About Credex | Software Development Company in Kerala",
      description: "Credex.in Tech Solutions is a technology company in Irinjalakuda, Kerala, building practical software, SaaS and business automation solutions.",
      path: "/about",
    }),
  component: About,
});

const values = [
  { icon: Lightbulb, title: "Practical Innovation", text: "New ideas, applied where they genuinely help." },
  { icon: Users, title: "Customer Focus", text: "Your goals shape every decision we make." },
  { icon: BadgeCheck, title: "Quality", text: "Reliable, well-built solutions that last." },
  { icon: ScanEye, title: "Transparency", text: "Clear communication at every stage." },
  { icon: RefreshCw, title: "Continuous Improvement", text: "Always refining how we work and what we deliver." },
  { icon: Handshake, title: "Long-Term Partnership", text: "Support that continues well beyond launch." },
];

const focus = ["Custom software development", "SaaS platforms", "Web & digital applications", "Business automation", "Data & technology solutions", "Digital transformation", "IT consulting"];

const choose = [
  { t: "Business-first thinking", d: "We begin with your problem, not with a technology." },
  { t: "Practical solutions", d: "We build what is useful, reliable and maintainable." },
  { t: "Clear communication", d: "You always know where your project stands." },
  { t: "Built to grow", d: "Solutions designed to scale with your business." },
];

function About() {
  const { settings } = useContent();
  return (
    <>
      <PageHero eyebrow="About Credex" title="Building technology with purpose." text="We are a technology company focused on practical software and digital solutions that help businesses simplify operations and grow with confidence." />

      <section className="container-site grid items-center gap-14 py-24 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Who We Are" title="A technology partner for growing businesses" />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Credex.in Tech Solutions Pvt. Ltd. is a technology company based in Irinjalakuda, Kerala, focused on building modern software, digital solutions, SaaS platforms, and technology services.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            We work closely with businesses to understand how they operate, then design and build technology that removes friction, saves time and creates measurable value.
          </p>
        </div>
        <img src={settings.about_image || team} alt="Credex team in a planning session" width={1408} height={1008} loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover" />
      </section>

      <section className="bg-ink text-ink-foreground">
        <div className="container-site grid gap-6 py-20 md:grid-cols-2">
          {[
            { icon: Target, label: "Mission", text: "To build practical technology solutions that solve real business problems and create measurable value." },
            { icon: Eye, label: "Vision", text: "To become a trusted technology partner for businesses looking to simplify, transform and grow through technology." },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-ink-border p-10">
              <m.icon className="h-7 w-7 text-cyan" strokeWidth={1.6} />
              <h2 className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">{m.label}</h2>
              <p className="mt-3 font-display text-2xl leading-snug">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-site py-24">
        <SectionHeading eyebrow="What We Believe" title="Technology should do more than just work." text="It should solve real business problems, simplify complex processes, and create meaningful value. These values guide how we work." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="card-site p-7">
              <v.icon className="h-6 w-6 text-primary" strokeWidth={1.6} />
              <h3 className="mt-5 text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="container-site grid gap-14 py-24 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our Approach" title="Understand. Plan. Build. Launch. Improve." text="We take time to understand your business before writing a line of code — then deliver in clear stages, with continuous improvement after launch." />
          </div>
          <div>
            <h2 className="eyebrow">Our Focus</h2>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {focus.map((f) => <li key={f} className="py-4 font-display text-lg font-medium">{f}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-site py-24">
        <SectionHeading eyebrow="Why Businesses Choose Us" title="A serious, modern technology partner" />
        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {choose.map((c, i) => (
            <div key={c.t} className="border-t-2 border-primary pt-6">
              <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{c.t}</h3>
              <p className="mt-2 text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand title="Let's talk about your business." text="Share your challenge and we'll explore how technology can help." cta="Get in Touch" />
    </>
  );
}
