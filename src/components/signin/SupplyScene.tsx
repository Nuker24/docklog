export function SupplyScene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="light-wash" />
      <svg
        className="supply-art"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b8ced6" />
            <stop offset="55%" stopColor="#d0dee4" />
            <stop offset="100%" stopColor="#c8d5d2" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c5d0d4" />
            <stop offset="100%" stopColor="#aebbc0" />
          </linearGradient>
          <linearGradient id="coldDoor" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9eb8c2" />
            <stop offset="50%" stopColor="#c5d8e0" />
            <stop offset="100%" stopColor="#8fadb8" />
          </linearGradient>
          <pattern id="floorGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M48 0H0V48"
              fill="none"
              stroke="#9aadb4"
              strokeWidth="1"
              opacity="0.25"
            />
          </pattern>
        </defs>

        <rect width="1440" height="900" fill="url(#wall)" />

        <rect x="0" y="0" width="1440" height="48" fill="#dfe9ec" opacity="0.7" />
        <g fill="#f2f7f8" opacity="0.55">
          <rect x="520" y="12" width="140" height="10" rx="1" />
          <rect x="700" y="12" width="140" height="10" rx="1" />
          <rect x="880" y="12" width="140" height="10" rx="1" />
          <rect x="1060" y="12" width="140" height="10" rx="1" />
        </g>

        <rect x="480" y="80" width="860" height="460" fill="#a8c0c8" opacity="0.35" />

        <g transform="translate(980,140)">
          <rect x="0" y="0" width="320" height="380" fill="#7a969f" rx="2" />
          <rect x="12" y="16" width="296" height="348" fill="url(#coldDoor)" />
          <line
            x1="160"
            y1="16"
            x2="160"
            y2="364"
            stroke="#6a8894"
            strokeWidth="2"
            opacity="0.5"
          />
          <rect x="12" y="16" width="296" height="8" fill="#5a7a86" opacity="0.4" />
          <rect x="24" y="36" width="100" height="36" fill="#14303a" opacity="0.85" rx="2" />
          <text
            x="34"
            y="52"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="11"
            fill="#8fd4c8"
          >
            2–8°C
          </text>
          <text
            x="34"
            y="66"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="9"
            fill="#6ab8c8"
          >
            COLD CHAIN
          </text>
          <circle className="cold-pulse" cx="112" cy="54" r="5" fill="#3ecfb0" />
          <rect x="280" y="170" width="10" height="70" fill="#4a6874" rx="1" />
          <rect x="28" y="90" width="250" height="250" fill="#d0e4ea" opacity="0.35" />
          <g opacity="0.4">
            <rect x="50" y="280" width="60" height="40" fill="#3a8fa8" />
            <rect x="120" y="270" width="60" height="50" fill="#2f7a92" />
            <rect x="190" y="285" width="60" height="35" fill="#3a8fa8" />
          </g>
        </g>

        <g transform="translate(560,160)">
          <rect x="0" y="0" width="12" height="400" fill="#6a828c" />
          <rect x="380" y="0" width="12" height="400" fill="#6a828c" />
          <g fill="#8a9ea6">
            <rect x="0" y="40" width="392" height="10" />
            <rect x="0" y="150" width="392" height="10" />
            <rect x="0" y="260" width="392" height="10" />
            <rect x="0" y="370" width="392" height="10" />
          </g>
          <g>
            <rect x="24" y="58" width="70" height="80" fill="#e8f0f2" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="24" y="58" width="70" height="16" fill="#0d8a7a" />
            <rect x="104" y="58" width="70" height="80" fill="#eef4f5" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="104" y="58" width="70" height="16" fill="#3a8fa8" />
            <rect x="184" y="58" width="70" height="80" fill="#e8f0f2" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="184" y="58" width="70" height="16" fill="#c45c2a" />
            <rect x="264" y="58" width="90" height="80" fill="#f0f5f6" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="264" y="58" width="90" height="16" fill="#0d8a7a" />
          </g>
          <g>
            <rect x="28" y="172" width="100" height="70" fill="#dce8ea" />
            <rect x="28" y="172" width="100" height="8" fill="#14303a" opacity="0.5" />
            <line x1="78" y1="180" x2="78" y2="242" stroke="#b0c4ca" strokeWidth="1" />
            <rect x="140" y="172" width="100" height="70" fill="#d4e2e6" />
            <rect x="140" y="172" width="100" height="8" fill="#0d8a7a" opacity="0.7" />
            <rect x="252" y="168" width="110" height="74" fill="#e2ecee" />
            <rect x="260" y="180" width="40" height="50" fill="#fff" opacity="0.7" />
            <rect x="308" y="180" width="40" height="50" fill="#fff" opacity="0.55" />
          </g>
          <g>
            <rect x="24" y="282" width="50" height="70" fill="#eef4f5" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="24" y="282" width="50" height="12" fill="#3a8fa8" />
            <rect x="84" y="282" width="50" height="70" fill="#e8f0f2" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="84" y="282" width="50" height="12" fill="#0d8a7a" />
            <rect x="144" y="282" width="50" height="70" fill="#eef4f5" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="144" y="282" width="50" height="12" fill="#c45c2a" />
            <rect x="204" y="282" width="50" height="70" fill="#e8f0f2" stroke="#9ab0b8" strokeWidth="1" />
            <rect x="204" y="282" width="50" height="12" fill="#3a8fa8" />
            <rect x="264" y="282" width="100" height="70" fill="#d8e6e8" />
            <rect x="274" y="298" width="36" height="40" fill="#fff" opacity="0.65" />
            <rect x="318" y="298" width="36" height="40" fill="#fff" opacity="0.5" />
          </g>
        </g>

        <g transform="translate(720,520)">
          <rect x="20" y="20" width="200" height="12" fill="#5a727c" />
          <rect x="20" y="60" width="200" height="12" fill="#5a727c" />
          <rect x="28" y="20" width="8" height="90" fill="#4a6068" />
          <rect x="204" y="20" width="8" height="90" fill="#4a6068" />
          <rect x="36" y="0" width="168" height="22" fill="#e8f0f2" stroke="#8aa0a8" strokeWidth="1" />
          <rect x="44" y="4" width="40" height="14" fill="#0d8a7a" opacity="0.85" />
          <rect x="92" y="4" width="40" height="14" fill="#3a8fa8" opacity="0.85" />
          <rect x="140" y="4" width="48" height="14" fill="#c45c2a" opacity="0.75" />
          <rect x="36" y="40" width="168" height="22" fill="#e2eaec" stroke="#8aa0a8" strokeWidth="1" />
          <rect x="48" y="46" width="56" height="12" fill="#fff" opacity="0.8" />
          <rect x="116" y="46" width="56" height="12" fill="#fff" opacity="0.65" />
          <path d="M0 10h24v8H8v50H0Z" fill="#4a6068" />
          <circle cx="40" cy="118" r="10" fill="#2a4048" />
          <circle cx="40" cy="118" r="5" fill="#6a8088" />
          <circle cx="200" cy="118" r="10" fill="#2a4048" />
          <circle cx="200" cy="118" r="5" fill="#6a8088" />
        </g>

        <path d="M0 560 H1440 V900 H0 Z" fill="url(#floor)" />
        <rect x="0" y="560" width="1440" height="340" fill="url(#floorGrid)" opacity="0.9" />
        <rect x="500" y="560" width="6" height="340" fill="#0d8a7a" opacity="0.2" />
        <rect x="1100" y="560" width="6" height="340" fill="#0d8a7a" opacity="0.15" />
        <ellipse
          className="cold-pulse"
          cx="1140"
          cy="580"
          rx="160"
          ry="24"
          fill="#5abed2"
          opacity="0.12"
        />
      </svg>
    </div>
  );
}
