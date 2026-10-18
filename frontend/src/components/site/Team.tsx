import { useContent } from "@/lib/content";
import { platformTeam } from "./platform-team";
import { Reveal, SectionHeading } from "./blocks";

export function Team() {
  const { team } = useContent();
  const people =
    team.length > 0
      ? team.map((member) => ({
          key: member.id,
          name: member.fullName,
          role: member.designation,
          image: member.photoUrl,
        }))
      : platformTeam.map((member) => ({
          key: member.name,
          name: member.name,
          role: member.role,
          image: member.image,
        }));

  return (
    <section className="container-site py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Our Team"
          title="The people behind the platform."
          text="Engineers, designers and QA specialists at Credex.In — building client software and our CREDEX lending platform."
        />
      </Reveal>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {people.map((member, i) => (
          <Reveal key={member.key} delay={i * 50}>
            <article className="card-bento group flex h-full flex-col overflow-hidden p-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface">
                <img
                  src={member.image}
                  alt={`${member.name} — ${member.role}`}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-display text-lg font-semibold leading-tight">{member.name}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-amber-300">
                    {member.role}
                  </p>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
