/**
 * The picture on a resort's card.
 *
 * A photograph of the actual place, where there is one: they live in
 * assets/resort-photos/ and scripts/make-resort-art.mjs crops and scales them
 * for the card. Two generated stand-ins were tried first — shaded relief from
 * overhead, which read as a map, and an oblique render of the same terrain,
 * whose camera never framed the mountain — and a photograph beats both,
 * because it is what a skier recognises.
 *
 * A resort with no photograph falls back to the drawn ridge below, which is
 * honest about being a stand-in. The fallback is wired to the image's own
 * error rather than to a flag, so a missing file degrades instead of breaking.
 */
import { useState } from "react";

export default function Ridge({ resort, hero }) {
  const [artFailed, setArtFailed] = useState(false);
  const art = resort.available && !artFailed
    ? `${import.meta.env.BASE_URL}resorts/${resort.id}.jpg`
    : null;

  if (art) {
    return (
      <img
        className={hero ? "hero__art" : "resortcard__thumb"}
        src={art}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setArtFailed(true)}
      />
    );
  }

  return <DrawnRidge resort={resort} hero={hero} />;
}

/** The stand-in, for a resort whose terrain has not been rendered. */
function DrawnRidge({ resort, hero }) {
  const top = resort.stats?.top ?? 3000;
  const bottom = resort.stats?.bottom ?? 1200;
  // 0 = gentle and low, 1 = high and steep.
  const rel = Math.min(1, Math.max(0.15, (top - bottom) / 2200));
  const id = resort.id;
  const h = (base, drop) => base - rel * drop;

  return (
    <svg
      className={hero ? "hero__art" : "resortcard__thumb"}
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4f70" />
          <stop offset="62%" stopColor="#77aecb" />
          <stop offset="100%" stopColor="#cbe4ef" />
        </linearGradient>
        <linearGradient id={`near-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c9dae4" />
        </linearGradient>
      </defs>

      <rect width="160" height="90" fill={`url(#sky-${id})`} />

      {/* Far range, hazed back into the sky. */}
      <path
        d={`M0 90 L14 ${h(60, 10)} L34 ${h(70, 6)} L52 ${h(50, 16)} L70 ${h(66, 8)}
            L92 ${h(44, 20)} L112 ${h(62, 10)} L134 ${h(52, 14)} L160 ${h(64, 8)} L160 90Z`}
        fill="#8fb1c7"
        opacity="0.62"
      />

      {/* Main massif — the summit sits off centre, ridges fall away unevenly. */}
      <path
        d={`M0 90 L18 ${h(74, 8)} L38 ${h(80, 4)} L56 ${h(62, 14)} L74 ${h(70, 8)}
            L96 ${h(38, 24)} L106 ${h(50, 16)} L124 ${h(44, 20)} L142 ${h(68, 10)}
            L160 ${h(60, 12)} L160 90Z`}
        fill={`url(#near-${id})`}
      />

      {/* Rock showing through on the shaded flank of the summit. */}
      <path
        d={`M96 ${h(38, 24)} L106 ${h(50, 16)} L100 ${h(56, 13)} L92 ${h(48, 18)}Z`}
        fill="#93a7b4"
        opacity="0.5"
      />

      {/* Treeline and valley floor. */}
      <path
        d="M0 90 L22 79 L46 85 L72 77 L100 84 L128 76 L160 86 L160 90Z"
        fill="#37524a"
        opacity="0.88"
      />
    </svg>
  );
}
