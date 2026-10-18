import { Reveal, SectionHeading } from "./blocks";
import vishnu from "@/assets/team/vishnu.jpg";
import gayathri from "@/assets/team/gayathri.jpg";
import vivek from "@/assets/team/vivek.jpg";
import sinoy from "@/assets/team/sinoy.jpg";
import sreejith from "@/assets/team/sreejith.jpg";
import prasad from "@/assets/team/prasad.jpg";
import yadhu from "@/assets/team/yadhu.jpg";
import sreerag from "@/assets/team/sreerag.png";
import shawn from "@/assets/team/shawn.jpg";
import aadithyan from "@/assets/team/aadithyan.jpg";

type Member = { name: string; role: string; image: string };

const members: Member[] = [
  { name: "Sreerag", role: "Fullstack Developer", image: sreerag },
  { name: "Vishnu", role: "Fullstack Developer · Sales", image: vishnu },
  { name: "Prasad", role: "Senior QA Developer", image: prasad },
  { name: "Vivek", role: "Fullstack Developer", image: vivek },
  { name: "Gayathri", role: "QA Engineer", image: gayathri },
  { name: "Sreejith", role: "Senior Developer · Fullstack", image: sreejith },
  { name: "Sinoy Devassy", role: "Senior Developer · .NET", image: sinoy },
  { name: "Yadhu", role: "UI/UX Designer", image: yadhu },
  { name: "Aadithyan", role: "Frontend Developer", image: aadithyan },
  { name: "Shawn", role: "Marketing", image: shawn },
];

export function Team() {
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
        {members.map((m, i) => (
          <Reveal key={m.name} delay={i * 50}>
            <article className="card-bento group flex h-full flex-col overflow-hidden p-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface">
                <img
                  src={m.image}
                  alt={`${m.name} — ${m.role}`}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-display text-lg font-semibold leading-tight">{m.name}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-amber-300">
                    {m.role}
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
