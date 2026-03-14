"use client";

import { useState, useEffect, useRef } from "react";

const TITLE = "FilCraft";
const TAGLINE = "Agent-native marketplace for the Filecoin economy";

// Deterministic particle positions seeded so SSR and client match
const PARTICLES = Array.from({ length: 60 }, (_, i) => {
  const seed = (i * 2654435761) >>> 0;
  const x = ((seed * 1664525 + 1013904223) >>> 0) % 10000 / 100;
  const y = ((seed * 22695477 + 1) >>> 0) % 10000 / 100;
  const dur = 4 + (seed % 6);
  const delay = (seed % 8000) / 1000;
  return { x, y, size: (i % 3) + 1, dur, delay };
});

export function LoadingScreen({ onEnter }: { onEnter: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTagline, setShowTagline] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [glitchIndex, setGlitchIndex] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Letter reveal with glitch
  useEffect(() => {
    let current = 0;
    intervalRef.current = setInterval(() => {
      if (current >= TITLE.length) {
        clearInterval(intervalRef.current!);
        return;
      }
      const idx = current;
      setGlitchIndex(idx);
      setTimeout(() => setGlitchIndex(null), 180);
      setVisibleCount(idx + 1);
      current++;
    }, 130);
    return () => clearInterval(intervalRef.current!);
  }, []);

  useEffect(() => {
    if (visibleCount < TITLE.length) return;
    const t1 = setTimeout(() => setShowTagline(true), 400);
    const t2 = setTimeout(() => setShowButton(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visibleCount]);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 750);
  };

  return (
    <>
      <style>{`
        @keyframes gridScroll {
          from { background-position: 0 0; }
          to   { background-position: 60px 60px; }
        }
        @keyframes particleDrift {
          0%   { transform: translateY(0)   scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-40px) scale(0.6); opacity: 0; }
        }
        @keyframes scanLine {
          0%   { top: -4px; }
          100% { top: 100%; }
        }
        @keyframes glitchFlicker {
          0%,100% { opacity: 1; text-shadow: 0 0 24px #00fff7, 0 0 60px #00fff733; transform: none; }
          20%     { opacity: 0.3; text-shadow: -3px 0 #ff003c, 3px 0 #00fff7; transform: translateX(-2px); }
          40%     { opacity: 1; text-shadow: 3px 0 #ff003c, -3px 0 #00fff7; transform: translateX(2px); }
          60%     { opacity: 0.5; text-shadow: 0 0 40px #00fff7; transform: none; }
          80%     { opacity: 1; text-shadow: -2px 0 #00fff7, 2px 0 #ff003c; transform: translateX(1px); }
        }
        @keyframes letterReveal {
          from { opacity: 0; transform: translateY(20px) skewX(-8deg); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0)   skewX(0deg);   filter: blur(0); }
        }
        @keyframes taglineFade {
          from { opacity: 0; transform: translateY(10px) letterSpacing(0.2em); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes buttonAppear {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 0 0 0 #00fff740, inset 0 0 20px #00fff710; }
          50%       { box-shadow: 0 0 20px 4px #00fff730, inset 0 0 30px #00fff720; }
        }
        @keyframes exitFade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes steadyGlow {
          0%, 100% { text-shadow: 0 0 24px #00fff7aa, 0 0 60px #00fff733, 0 0 2px #fff; }
          50%       { text-shadow: 0 0 32px #00fff7cc, 0 0 80px #00fff755, 0 0 4px #fff; }
        }
        .filcraft-letter {
          display: inline-block;
          animation: letterReveal 0.35s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .filcraft-letter.glitch {
          animation: glitchFlicker 0.18s steps(2) forwards;
        }
        .filcraft-letter.settled {
          animation: steadyGlow 3s ease-in-out infinite;
        }
        .enter-btn {
          position: relative;
          overflow: hidden;
          border: 1px solid #00fff7;
          color: #00fff7;
          background: transparent;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: 0.78rem;
          padding: 14px 44px;
          cursor: pointer;
          transition: color 0.3s, background 0.3s;
          animation: buttonAppear 0.6s cubic-bezier(0.22,1,0.36,1) forwards,
                     borderPulse 2.5s ease-in-out 0.6s infinite;
        }
        .enter-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #00fff7;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
        }
        .enter-btn:hover::before { transform: scaleX(1); }
        .enter-btn:hover { color: #000; }
        .enter-btn span { position: relative; z-index: 1; }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#020509",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          animation: exiting ? "exitFade 0.75s ease forwards" : undefined,
        }}
      >
        {/* Perspective grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,255,247,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,247,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            animation: "gridScroll 4s linear infinite",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        {/* Vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 20%, #020509 80%)",
            pointerEvents: "none",
          }}
        />

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: i % 5 === 0 ? "#ff003c" : "#00fff7",
              opacity: 0,
              animation: `particleDrift ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* Scan line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent, #00fff722, #00fff766, #00fff722, transparent)",
            animation: "scanLine 6s linear infinite",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
          {/* Subtitle above title */}
          <div
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "0.65rem",
              letterSpacing: "0.35em",
              color: "#00fff7",
              opacity: 0.5,
              marginBottom: 24,
              textTransform: "uppercase",
            }}
          >
            Filecoin Agent Economy
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-playfair-display, serif)",
              fontSize: "clamp(64px, 12vw, 120px)",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "#ffffff",
              margin: 0,
              userSelect: "none",
            }}
          >
            {TITLE.split("").map((char, i) => (
              <span
                key={i}
                className={`filcraft-letter${
                  i >= visibleCount
                    ? " hidden"
                    : glitchIndex === i
                    ? " glitch"
                    : " settled"
                }`}
                style={{
                  visibility: i < visibleCount ? "visible" : "hidden",
                }}
              >
                {char}
              </span>
            ))}
          </h1>

          {/* Tagline */}
          <p
            style={{
              marginTop: 24,
              fontFamily: "var(--font-geist-sans, sans-serif)",
              fontSize: "clamp(13px, 1.6vw, 15px)",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.45)",
              opacity: showTagline ? 1 : 0,
              transform: showTagline ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
              maxWidth: 420,
              margin: "24px auto 0",
              lineHeight: 1.6,
            }}
          >
            {TAGLINE}
          </p>

          {/* Enter button */}
          <div
            style={{
              marginTop: 48,
              opacity: showButton ? 1 : 0,
              pointerEvents: showButton ? "auto" : "none",
            }}
          >
            <button className="enter-btn" onClick={handleEnter}>
              <span>Enter FilCraft</span>
            </button>
          </div>
        </div>

        {/* Bottom status bar */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 32,
            opacity: showButton ? 0.35 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          {["ERC-8004", "x402 Payments", "Filecoin Storage"].map((label) => (
            <span
              key={label}
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "0.6rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#00fff7",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
