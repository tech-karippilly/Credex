/**
 * Hero visual: futuristic daylight command topology — Credex.In engineering studio + CREDEX NBFC OS.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent blur-2xl" />
      <div className="card-bento glow-dot relative overflow-hidden p-4 sm:p-6">
        {/* Top telemetry status bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="font-mono text-[11px] font-medium tracking-wider uppercase text-foreground">
              CREDEX.IN // ARCHITECTURE GRAPH
            </span>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            v4.2 · LIVE
          </span>
        </div>

        {/* Interactive SVG Canvas */}
        <div className="relative mt-3 aspect-[11/10] w-full overflow-hidden rounded-xl border border-border/70 bg-surface/60">
          <div className="dot-matrix absolute inset-0 opacity-75" />
          <svg viewBox="0 0 540 480" className="relative h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="core-aura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
                <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.04" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="beam-h" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.1" />
                <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.1" />
              </linearGradient>
              <filter id="card-drop" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.08" />
              </filter>
            </defs>

            {/* Ambient rings */}
            <circle cx="270" cy="240" r="195" fill="url(#core-aura)" />
            <circle cx="270" cy="240" r="115" stroke="var(--border)" strokeWidth="1.2" />
            <g className="origin-center animate-[spin_80s_linear_infinite]" style={{ transformOrigin: "270px 240px" }}>
              <circle cx="270" cy="240" r="162" stroke="var(--primary)" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="6 10" />
            </g>

            {/* Animated circuit traces */}
            <g stroke="url(#beam-h)" strokeWidth="1.75" strokeDasharray="6 8" className="animate-dash-flow">
              <path d="M270 240 L125 115" />
              <path d="M270 240 L415 115" />
              <path d="M270 240 L120 365" />
              <path d="M270 240 L410 360" />
            </g>

            {/* Satellite 1: Custom Web & Mobile */}
            <g className="animate-float" style={{ animationDelay: "0.2s" }} filter="url(#card-drop)">
              <rect x="28" y="56" width="168" height="96" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.2" />
              <circle cx="52" cy="82" r="10" fill="var(--secondary)" />
              <circle cx="52" cy="82" r="4" fill="var(--primary)" />
              <text x="70" y="86" fill="var(--foreground)" fontSize="11.5" fontWeight="700">Custom Engineering</text>
              <rect x="44" y="102" width="118" height="6" rx="3" fill="var(--muted)" />
              <rect x="44" y="102" width="84" height="6" rx="3" fill="var(--primary)" fillOpacity="0.7" />
              <text x="44" y="132" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="9.5">WEB · MOBILE · APIs</text>
            </g>

            {/* Satellite 2: Cloud & Multi-tenant SaaS */}
            <g className="animate-float" style={{ animationDelay: "0.9s" }} filter="url(#card-drop)">
              <rect x="344" y="56" width="168" height="96" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.2" />
              <rect x="360" y="74" width="52" height="16" rx="8" fill="var(--secondary)" />
              <text x="386" y="85" textAnchor="middle" fill="var(--primary)" fontFamily="ui-monospace, monospace" fontSize="8.5" fontWeight="700">99.98% SLA</text>
              <text x="360" y="110" fill="var(--foreground)" fontSize="11.5" fontWeight="700">SaaS &amp; Platforms</text>
              <text x="360" y="132" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="9.5">MULTI-TENANT · CLOUD</text>
            </g>

            {/* Satellite 3: Workflow Automation */}
            <g className="animate-float" style={{ animationDelay: "0.5s" }} filter="url(#card-drop)">
              <rect x="28" y="318" width="168" height="96" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.2" />
              <text x="46" y="348" fill="var(--foreground)" fontSize="11.5" fontWeight="700">Process Automation</text>
              <text x="46" y="366" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="9.5">ZERO MANUAL HANDOFFS</text>
              <g transform="translate(46, 380)">
                <rect width="34" height="16" rx="4" fill="var(--secondary)" />
                <text x="17" y="11" textAnchor="middle" fill="var(--foreground)" fontFamily="ui-monospace, monospace" fontSize="8">ERP</text>
                <path d="M38 8 H54" stroke="var(--primary)" strokeWidth="1.5" />
                <rect x="58" width="38" height="16" rx="4" fill="var(--secondary)" />
                <text x="77" y="11" textAnchor="middle" fill="var(--foreground)" fontFamily="ui-monospace, monospace" fontSize="8">SYNC</text>
                <path d="M100 8 H114" stroke="var(--primary)" strokeWidth="1.5" />
                <circle cx="122" cy="8" r="6" fill="var(--primary)" />
              </g>
            </g>

            {/* Satellite 4: Flagship CREDEX NBFC Core */}
            <g className="animate-float" style={{ animationDelay: "1.3s" }} filter="url(#card-drop)">
              <rect x="328" y="312" width="184" height="108" rx="14" fill="var(--ink)" stroke="var(--primary)" strokeWidth="1.5" />
              <text x="346" y="338" fill="var(--primary)" fontFamily="ui-monospace, monospace" fontSize="8.5" fontWeight="700" letterSpacing="0.14em">FLAGSHIP PRODUCT</text>
              <text x="346" y="358" fill="#ffffff" fontSize="13" fontWeight="700">CREDEX Lending OS</text>
              <text x="346" y="375" fill="#94a3b8" fontFamily="ui-monospace, monospace" fontSize="9">LOS · LMS · COLLECTIONS · GL</text>
              <rect x="346" y="388" width="148" height="6" rx="3" fill="#1e293b" />
              <rect x="346" y="388" width="112" height="6" rx="3" fill="var(--primary)" />
              <text x="346" y="409" fill="#e2e8f0" fontFamily="ui-monospace, monospace" fontSize="8.5">Gold · JLG · Vehicle · MSME</text>
            </g>

            {/* Center Hub: Credex.In Core */}
            <g filter="url(#card-drop)">
              <rect x="192" y="188" width="156" height="104" rx="20" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
              <rect x="206" y="202" width="128" height="22" rx="11" fill="var(--secondary)" />
              <circle cx="220" cy="213" r="4" fill="var(--primary)" className="animate-glow" />
              <text x="275" y="216" textAnchor="middle" fill="var(--primary)" fontFamily="ui-monospace, monospace" fontSize="8.5" fontWeight="700" letterSpacing="0.1em">CORE STUDIO</text>
              <text x="270" y="252" textAnchor="middle" fill="var(--foreground)" fontSize="18" fontWeight="700">Credex.In</text>
              <text x="270" y="272" textAnchor="middle" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="0.14em">BUILD · SHIP · SCALE</text>
            </g>
          </svg>
        </div>

        {/* Bottom mini telemetry strip */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-surface/70 px-2 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Architecture</p>
            <p className="mt-0.5 font-display text-xs font-semibold text-foreground">Modular &amp; API-First</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/70 px-2 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Flagship</p>
            <p className="mt-0.5 font-display text-xs font-semibold text-primary">CREDEX NBFC OS</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/70 px-2 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Security</p>
            <p className="mt-0.5 font-display text-xs font-semibold text-foreground">RBI Audit-Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}
