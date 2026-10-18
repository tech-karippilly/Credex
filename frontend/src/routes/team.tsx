import { createFileRoute } from "@tanstack/react-router";
import { platformTeam } from "@/components/site/platform-team";
import { PageHero, Reveal } from "@/components/site/blocks";
import { useContent } from "@/lib/content";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/team")({
  head: () =>
    seo({
      title: "Meet Our Team | Credex",
      description:
        "Meet the Credex team — the people building practical technology solutions that help businesses grow.",
      path: "/team",
    }),
  component: TeamPage,
});

function TeamPage() {
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
    <>
      <PageHero
        eyebrow="Team"
        title="Meet Our Team"
        text="The people behind Credex, working together to build technology solutions that help businesses grow."
      />

      <section className="container-site py-20">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((member, i) => (
            <Reveal key={member.key} delay={i * 50}>
              <article className="card-site group h-full overflow-hidden text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  width={320}
                  height={320}
                  loading="lazy"
                  className="aspect-square w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="p-6">
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
