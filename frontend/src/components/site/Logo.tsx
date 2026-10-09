import { company, LOGO_URL } from "@/lib/site";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={LOGO_URL}
        alt={`${company.brand} logo`}
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
      <span className="leading-none">
        <span className={`block font-display text-lg font-bold tracking-tight ${inverted ? "text-ink-foreground" : "text-foreground"}`}>
          Credex<span className="text-cyan">.</span>in
        </span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${inverted ? "text-ink-muted" : "text-muted-foreground"}`}>
          Tech Solutions
        </span>
      </span>
    </span>
  );
}
