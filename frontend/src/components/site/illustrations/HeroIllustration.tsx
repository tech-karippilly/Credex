/**
 * Hero visual: futuristic command topology — NEURAFORGE engineering studio + CREDEX NBFC OS.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent blur-2xl" />
      <div className="card-bento glow-dot relative overflow-hidden p-4 sm:p-6">
        {/* Top telemetry status bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold tracking-wide uppercase text-foreground sm:text-lg">
              NEURAFORGE // ARCHITECTURE GRAPH
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
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.26" />
                <stop offset="65%" stopColor="var(--primary)" stopOpacity="0.05" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="beam-h" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.08" />
                <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="scan-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
              </linearGradient>
              <filter id="card-drop" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.35" />
              </filter>
              <filter id="packet-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ambient rings */}
            <circle cx="270" cy="240" r="200" fill="url(#core-aura)" />
            <circle cx="270" cy="240" r="150" stroke="var(--border)" strokeWidth="1" />
            <circle cx="270" cy="240" r="110" stroke="var(--border)" strokeWidth="1" strokeOpacity="0.6" />
            <g style={{ transformOrigin: "270px 240px" }} className="animate-[spin_80s_linear_infinite]">
              <circle cx="270" cy="240" r="172" stroke="var(--primary)" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="4 12" />
            </g>

            {/* Radar scan sweep */}
            <g style={{ transformOrigin: "270px 240px" }} className="animate-[spin_6s_linear_infinite]">
              <path d="M270 240 L270 68 A172 172 0 0 1 418 150 Z" fill="url(#scan-sweep)" opacity="0.5" />
            </g>

            {/* Orbit waypoint ticks */}
            {[0, 60, 120, 180, 240, 300].map((a) => {
              const rad = (a * Math.PI) / 180;
              return (
                <circle
                  key={a}
                  cx={270 + 150 * Math.cos(rad)}
                  cy={240 + 150 * Math.sin(rad)}
                  r="2"
                  fill="var(--primary)"
                  fillOpacity="0.5"
                />
              );
            })}

            {/* Animated circuit traces */}
            <g stroke="url(#beam-h)" strokeWidth="1.75" strokeDasharray="5 9" className="animate-dash-flow">
              <path d="M270 240 L120 112" />
              <path d="M270 240 L420 112" />
              <path d="M270 240 L120 368" />
              <path d="M270 240 L420 362" />
            </g>

            {/* Travelling glowing data packets along each trace */}
            {[
              { d: "M270 240 L120 112", dur: "2.6s", delay: "0s" },
              { d: "M270 240 L420 112", dur: "3.1s", delay: "0.5s" },
              { d: "M270 240 L120 368", dur: "2.9s", delay: "1s" },
              { d: "M270 240 L420 362", dur: "3.3s", delay: "1.5s" },
            ].map((p) => (
              <circle key={p.d} r="3.2" fill="var(--accent)" filter="url(#packet-glow)">
                <animateMotion dur={p.dur} begin={p.delay} repeatCount="indefinite" path={p.d} />
                <animate attributeName="opacity" values="0;1;1;0" dur={p.dur} begin={p.delay} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Satellite 1: Custom Engineering */}
            <g className="animate-float" style={{ animationDelay: "0.2s" }} filter="url(#card-drop)">
              <rect x="24" y="52" width="168" height="86" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.2" />
              <circle cx="48" cy="78" r="11" fill="var(--secondary)" />
              <circle cx="48" cy="78" r="4" fill="var(--primary)" className="animate-glow" />
              <text x="68" y="76" fill="var(--foreground)" fontSize="12" fontWeight="700">Custom Engineering</text>
              <text x="68" y="90" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="8.5">WEB · MOBILE · APIs</text>
              <rect x="40" y="110" width="136" height="5" rx="2.5" fill="var(--muted)" />
              <rect x="40" y="110" width="98" height="5" rx="2.5" fill="var(--primary)" fillOpacity="0.75" />
              <text x="40" y="130" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="8">BUILD 97%</text>
            </g>

            {/* Satellite 2: SaaS & Platforms */}
            <g className="animate-float" style={{ animationDelay: "0.9s" }} filter="url(#card-drop)">
              <rect x="348" y="52" width="168" height="86" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.2" />
              <circle cx="372" cy="78" r="11" fill="var(--secondary)" />
              <circle cx="372" cy="78" r="4" fill="var(--primary)" />
              <text x="392" y="76" fill="var(--foreground)" fontSize="12" fontWeight="700">SaaS &amp; Platforms</text>
              <text x="392" y="90" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="8.5">MULTI-TENANT · CLOUD</text>
              <rect x="364" y="108" width="54" height="16" rx="8" fill="var(--secondary)" />
              <text x="391" y="119" textAnchor="middle" fill="var(--primary)" fontFamily="ui-monospace, monospace" fontSize="8.5" fontWeight="700">99.98% SLA</text>
            </g>

            {/* Satellite 3: Process Automation */}
            <g className="animate-float" style={{ animationDelay: "0.5s" }} filter="url(#card-drop)">
              <rect x="24" y="334" width="168" height="86" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="1.2" />
              <circle cx="48" cy="360" r="11" fill="var(--secondary)" />
              <circle cx="48" cy="360" r="4" fill="var(--primary)" />
              <text x="68" y="358" fill="var(--foreground)" fontSize="12" fontWeight="700">Process Automation</text>
              <text x="68" y="372" fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace" fontSize="8.5">ZERO HANDOFFS</text>
              <g transform="translate(40, 392)">
                <rect width="32" height="16" rx="4" fill="var(--secondary)" />
                <text x="16" y="11" textAnchor="middle" fill="var(--foreground)" fontFamily="ui-monospace, monospace" fontSize="8">ERP</text>
                <path d="M36 8 H52" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-dash-flow" />
                <rect x="56" width="38" height="16" rx="4" fill="var(--secondary)" />
                <text x="75" y="11" textAnchor="middle" fill="var(--foreground)" fontFamily="ui-monospace, monospace" fontSize="8">SYNC</text>
                <path d="M98 8 H114" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" className="animate-dash-flow" />
                <circle cx="122" cy="8" r="6" fill="var(--primary)" className="animate-glow" />
              </g>
            </g>

            {/* Satellite 4: Flagship CREDEX NBFC Core */}
            <g className="animate-float" style={{ animationDelay: "1.3s" }} filter="url(#card-drop)">
              <rect x="336" y="330" width="180" height="94" rx="14" fill="var(--ink)" stroke="var(--primary)" strokeWidth="1.5" />
              <circle cx="352" cy="350" r="3" fill="var(--primary)" className="animate-glow" />
              <text x="362" y="353" fill="var(--primary)" fontFamily="ui-monospace, monospace" fontSize="8" fontWeight="700" letterSpacing="0.14em">FLAGSHIP PRODUCT</text>
              <text x="352" y="373" fill="#ffffff" fontSize="13" fontWeight="700">CREDEX Lending OS</text>
              <text x="352" y="388" fill="#94a3b8" fontFamily="ui-monospace, monospace" fontSize="8.5">LOS · LMS · COLLECTIONS · GL</text>
              <rect x="352" y="398" width="148" height="5" rx="2.5" fill="#1e293b" />
              <rect x="352" y="398" width="112" height="5" rx="2.5" fill="var(--primary)" />
              <text x="352" y="416" fill="#e2e8f0" fontFamily="ui-monospace, monospace" fontSize="8">Gold · JLG · Vehicle · MSME</text>
            </g>

            {/* Center Hub: NEURAFORGE Core */}
            <g filter="url(#card-drop)">
              <circle cx="270" cy="240" r="68" fill="var(--primary)" fillOpacity="0.06" className="animate-glow" />
              <rect x="190" y="190" width="160" height="100" rx="22" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
              <rect x="206" y="204" width="128" height="20" rx="10" fill="var(--secondary)" />
              <circle cx="220" cy="214" r="3.5" fill="var(--primary)" className="animate-glow" />
              <text x="276" y="217" textAnchor="middle" fill="var(--primary)" fontFamily="ui-monospace, monospace" fontSize="8" fontWeight="700" letterSpacing="0.12em">CORE STUDIO</text>
              <text x="270" y="248" textAnchor="middle" fill="var(--foreground)" fontSize="15" fontWeight="700" letterSpacing="0.03em">NEURAFORGE</text>
              {/* Live build-activity equalizer */}
              <g transform="translate(240, 262)">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <rect key={i} x={i * 11} y="0" width="6" height="12" rx="2" fill="var(--primary)" fillOpacity="0.85">
                    <animate
                      attributeName="height"
                      values={`${4 + (i % 3) * 3};14;${6 + (i % 2) * 4};4`}
                      dur={`${1 + (i % 4) * 0.25}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="y"
                      values={`${8 - (i % 3) * 1.5};-1;${5 - (i % 2) * 2};8`}
                      dur={`${1 + (i % 4) * 0.25}s`}
                      repeatCount="indefinite"
                    />
                  </rect>
                ))}
              </g>
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
