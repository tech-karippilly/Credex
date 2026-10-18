import type { TeamMemberRow } from "@/lib/content.functions";

export function TeamMemberPublicCard({ member }: { member: TeamMemberRow }) {
  return (
    <article className="card-site group h-full overflow-hidden text-center">
      <img
        src={member.photoUrl}
        alt={member.fullName}
        width={320}
        height={320}
        loading="lazy"
        className="aspect-square w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="p-6">
        <h3 className="text-lg font-semibold">{member.fullName}</h3>
        <p className="mt-1 text-sm font-medium text-primary">{member.designation}</p>
        {member.bio && <p className="mt-3 text-sm text-muted-foreground">{member.bio}</p>}
      </div>
    </article>
  );
}
