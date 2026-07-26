import React from 'react';

export const LightningChatBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#030712] select-none z-0">
      {/* Radial Atmospheric Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(2,132,199,0.35)_0%,rgba(3,7,18,0.95)_75%)]" />
      <div className="absolute top-0 left-0 right-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(0,180,255,0.2)_0%,transparent_70%)]" />

      {/* Top Lens Flare Horizontal Beam */}
      <div className="absolute top-10 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_20px_#00f0ff] opacity-90" />
      <div className="absolute top-[39px] left-[20%] w-4 h-[4px] bg-[#ffffff] rounded-full blur-[2px] shadow-[0_0_12px_#ffffff]" />
      <div className="absolute top-[39px] right-[25%] w-6 h-[4px] bg-[#ffffff] rounded-full blur-[2px] shadow-[0_0_12px_#ffffff]" />

      {/* SVG Lightning Bolts & Grid */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1000 500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow Filters */}
          <filter id="lightning-glow-intense" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur1" />
            <feGaussianBlur stdDeviation="3" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="grid-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0066ff" stopOpacity="0" />
            <stop offset="25%" stopColor="#00d2ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="bolt-grad-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="bolt-grad-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* LEFT LIGHTNING BOLT MAIN & BRANCHES */}
        <g filter="url(#lightning-glow-intense)">
          {/* Main Left Lightning */}
          <path
            d="M 120 0 L 90 60 L 140 110 L 80 180 L 160 230 L 110 310 L 220 380 L 180 440 L 260 500"
            fill="none"
            stroke="url(#bolt-grad-left)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Outer glow aura left */}
          <path
            d="M 120 0 L 90 60 L 140 110 L 80 180 L 160 230 L 110 310 L 220 380 L 180 440 L 260 500"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="7"
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Left Branches */}
          <path
            d="M 90 60 L 30 110 L 10 170 M 140 110 L 200 150 L 240 210 M 80 180 L 30 240 M 160 230 L 230 270 L 280 320 M 110 310 L 50 360 L 30 430"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeOpacity="0.85"
            strokeLinecap="round"
          />
          <path
            d="M 220 380 L 300 420 M 180 440 L 120 480"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
        </g>

        {/* RIGHT LIGHTNING BOLT MAIN & BRANCHES */}
        <g filter="url(#lightning-glow-intense)">
          {/* Main Right Lightning */}
          <path
            d="M 880 0 L 910 70 L 850 130 L 930 200 L 840 260 L 890 330 L 780 390 L 820 450 L 740 500"
            fill="none"
            stroke="url(#bolt-grad-right)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Outer glow aura right */}
          <path
            d="M 880 0 L 910 70 L 850 130 L 930 200 L 840 260 L 890 330 L 780 390 L 820 450 L 740 500"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="7"
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Branches */}
          <path
            d="M 910 70 L 970 120 L 990 180 M 850 130 L 780 170 L 730 230 M 930 200 L 980 250 M 840 260 L 760 300 M 890 330 L 950 380 L 970 450"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeOpacity="0.85"
            strokeLinecap="round"
          />
          <path
            d="M 780 390 L 700 430 M 820 450 L 880 490"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
        </g>

        {/* PERSPECTIVE GRID FLOOR (BOTTOM 30%) */}
        <g filter="url(#grid-glow)" opacity="0.85">
          {/* Horizontal Grid Lines */}
          <line x1="0" y1="410" x2="1000" y2="410" stroke="#00d2ff" strokeWidth="0.8" strokeOpacity="0.3" />
          <line x1="0" y1="425" x2="1000" y2="425" stroke="#00d2ff" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="0" y1="442" x2="1000" y2="442" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.6" />
          <line x1="0" y1="462" x2="1000" y2="462" stroke="#00f0ff" strokeWidth="1.6" strokeOpacity="0.8" />
          <line x1="0" y1="485" x2="1000" y2="485" stroke="#00f0ff" strokeWidth="2.2" strokeOpacity="0.95" />

          {/* Perspective Radial Lines from Horizon (Center 500, Horizon 400) */}
          <line x1="500" y1="400" x2="-200" y2="500" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="500" y1="400" x2="-50" y2="500" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="500" y1="400" x2="100" y2="500" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.75" />
          <line x1="500" y1="400" x2="250" y2="500" stroke="#00d2ff" strokeWidth="1.4" strokeOpacity="0.8" />
          <line x1="500" y1="400" x2="380" y2="500" stroke="#00f0ff" strokeWidth="1.5" strokeOpacity="0.85" />
          <line x1="500" y1="400" x2="500" y2="500" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.9" />
          <line x1="500" y1="400" x2="620" y2="500" stroke="#00f0ff" strokeWidth="1.5" strokeOpacity="0.85" />
          <line x1="500" y1="400" x2="750" y2="500" stroke="#00d2ff" strokeWidth="1.4" strokeOpacity="0.8" />
          <line x1="500" y1="400" x2="900" y2="500" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.75" />
          <line x1="500" y1="400" x2="1050" y2="500" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="500" y1="400" x2="1200" y2="500" stroke="#00d2ff" strokeWidth="1.2" strokeOpacity="0.7" />

          {/* Glowing Intersection Dots on Floor */}
          <circle cx="500" cy="485" r="3" fill="#ffffff" />
          <circle cx="380" cy="485" r="2.5" fill="#00f0ff" />
          <circle cx="620" cy="485" r="2.5" fill="#00f0ff" />
          <circle cx="250" cy="485" r="2" fill="#00d2ff" />
          <circle cx="750" cy="485" r="2" fill="#00d2ff" />
          <circle cx="500" cy="462" r="2" fill="#00f0ff" />
        </g>
      </svg>
    </div>
  );
};
