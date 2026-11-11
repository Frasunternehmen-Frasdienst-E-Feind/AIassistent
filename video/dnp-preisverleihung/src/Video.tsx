import "@fontsource/exo/900.css";
import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import ci from "../../../branding/feind-ci.tokens.json";
import { TEXTE } from "./texte";

const W = 1920;
const H = 1080;
const FPS = 30;
const A2 = 110; // Beginn Akt 2 (Bild)
const A3 = 260; // Beginn Akt 3
const ENDE = 420; // 14 s

const GRUEN = ci.palette["feind-gruen"];
const ANTHRAZIT = ci.palette.anthrazit;
const WEISS = ci.palette.weiss;
const HELL = ci.tokens.light["surface-muted"];
const AUF_GRUEN = ci.tokens.light["on-accent-strong"];

const RAND = 120;
const OBERKANTE = 760; // geschliffene Höhe der Steine
const STEIN = 80;
const RADIUS = 70;
const klemmen = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const weich = { ...klemmen, easing: Easing.inOut(Easing.cubic) };

// Fester Pseudozufall je Stein, damit jeder Render identisch ist.
const zufall = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
// Höhe einer Steinecke: links von der Schleiflinie plan, rechts davon roh.
const ecke = (stein: number, rechts: boolean, x: number, schleifX: number) =>
  x < schleifX ? OBERKANTE : OBERKANTE - 6 - zufall(stein * 2 + (rechts ? 1 : 0)) * 34;

const oberflaeche = (x: number, schleifX: number) => {
  const i = Math.floor(x / STEIN);
  const t = x / STEIN - i;
  const l = ecke(i, false, i * STEIN, schleifX);
  const r = ecke(i, true, (i + 1) * STEIN, schleifX);
  return l + (r - l) * t;
};

const Pflaster: React.FC<{ schleifX: number; farbe: string }> = ({ schleifX, farbe }) => (
  <>
    {Array.from({ length: W / STEIN }, (_, i) => {
      const xl = i * STEIN + 7;
      const xr = (i + 1) * STEIN - 7;
      const unten = OBERKANTE + 100;
      return (
        <polygon
          key={i}
          points={`${xl},${ecke(i, false, xl, schleifX)} ${xr},${ecke(i, true, xr, schleifX)} ${xr},${unten} ${xl},${unten}`}
          fill={farbe}
          stroke={farbe}
          strokeWidth={8}
          strokeLinejoin="round"
        />
      );
    })}
  </>
);

const Rad: React.FC<{ x: number; schleifX: number; farbe: string }> = ({ x, schleifX, farbe }) => {
  const y = oberflaeche(x, schleifX) - RADIUS - 12;
  return (
    <g transform={`translate(${x} ${y}) rotate(${(x / RADIUS) * (180 / Math.PI)})`} stroke={farbe} fill="none">
      <circle r={RADIUS} strokeWidth={12} />
      {[0, 45, 90, 135].map((w) => (
        <line key={w} x1={-RADIUS} x2={RADIUS} transform={`rotate(${w})`} strokeWidth={3} />
      ))}
      <circle r={9} fill={farbe} />
    </g>
  );
};

const zeile: React.CSSProperties = {
  fontFamily: "Exo, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontWeight: 900,
  lineHeight: 1.12,
};

const Akt1: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ background: HELL }}>
    <div style={{ position: "absolute", left: RAND, top: 110, color: ANTHRAZIT, fontSize: 112, ...zeile }}>
      {TEXTE.akt1.map((t, i) => (
        <div key={t} style={{ opacity: interpolate(frame, [8 + i * 22, 14 + i * 22], [0, 1], klemmen) }}>
          {t}
        </div>
      ))}
    </div>
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <rect x={RAND} y={530} height={10} fill={GRUEN} width={interpolate(frame, [72, 98], [0, 900], weich)} />
      <Pflaster schleifX={-1} farbe={ANTHRAZIT} />
      <Rad x={interpolate(frame, [0, A2 + 12], [-RADIUS - 20, 1500], klemmen)} schleifX={-1} farbe={ANTHRAZIT} />
    </svg>
  </AbsoluteFill>
);

const Akt2: React.FC<{ frame: number }> = ({ frame }) => {
  const f = frame - A2;
  const nah = f >= 78; // harter Schnitt auf die Maschine
  const zoom = nah
    ? interpolate(f, [78, A3 - A2 + 12], [1.55, 1.63], klemmen)
    : interpolate(f, [-12, 78], [1, 1.05], klemmen);
  const rein = spring({ frame: f - 16, fps: FPS, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: ci.tokens.dark["surface-inverse"] }}>
      <div style={{ position: "absolute", top: 120, width: W, height: 672, overflow: "hidden" }}>
        <Img
          src={staticFile("milling-site.jpg")}
          style={{ width: W, transform: `scale(${zoom})`, transformOrigin: nah ? "90% 66%" : "70% 60%" }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: RAND,
          top: 730,
          padding: "16px 40px 24px",
          background: GRUEN,
          color: AUF_GRUEN,
          fontSize: 104,
          transform: `translateX(${(rein - 1) * 1200}px)`,
          ...zeile,
        }}
      >
        {TEXTE.akt2}
      </div>
    </AbsoluteFill>
  );
};

const Akt3: React.FC<{ frame: number }> = ({ frame }) => {
  const f = frame - A3;
  const schleifX = interpolate(f, [26, 92], [-20, W + 20], weich);
  const saetze = TEXTE.akt3.split(/(?<=[.!?])\s+/);
  return (
    <AbsoluteFill style={{ background: ANTHRAZIT }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <Pflaster schleifX={schleifX} farbe={ci.tokens.dark["surface-inverse"]} />
        {/* Die grüne Linie: senkrecht die Schleifkante, waagerecht die fertige Oberfläche */}
        <rect x={0} y={OBERKANTE - 12} width={Math.max(0, schleifX)} height={10} fill={GRUEN} />
        <rect x={schleifX - 5} y={OBERKANTE - 110} width={10} height={210} fill={GRUEN} />
        <Rad x={interpolate(f, [84, ENDE - A3], [-RADIUS - 20, 1180], klemmen)} schleifX={schleifX} farbe={WEISS} />
      </svg>
      <div style={{ position: "absolute", left: RAND, top: 130, color: WEISS, fontSize: 112, ...zeile }}>
        {saetze.map((t, i) => (
          <div key={i} style={{ opacity: interpolate(f, [70 + i * 16, 80 + i * 16], [0, 1], klemmen) }}>
            {t}
          </div>
        ))}
      </div>
      <Img
        src={staticFile("logo-service-white.png")}
        style={{
          position: "absolute",
          right: 64,
          bottom: 48,
          height: 132,
          opacity: interpolate(f, [104, 120], [0, 1], klemmen),
        }}
      />
    </AbsoluteFill>
  );
};

// „Grind the Line“: eine grüne Kante schiebt die nächste Szene von links ins Bild.
const Wischer: React.FC<{ frame: number; ab: number; children: React.ReactNode }> = ({ frame, ab, children }) => {
  const x = interpolate(frame, [ab - 12, ab + 12], [-10, W + 10], weich);
  if (frame < ab - 12) return null;
  return (
    <>
      <AbsoluteFill style={{ clipPath: `inset(0 ${Math.max(0, W - x)}px 0 0)` }}>{children}</AbsoluteFill>
      {x < W && <div style={{ position: "absolute", left: x - 5, width: 10, height: H, background: GRUEN }} />}
    </>
  );
};

const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const [warten] = React.useState(() => delayRender("Schrift Exo laden"));
  React.useEffect(() => {
    document.fonts.load("900 100px Exo").then(() => continueRender(warten));
  }, [warten]);
  return (
    <AbsoluteFill>
      {frame < A2 + 12 && <Akt1 frame={frame} />}
      {frame < A3 + 12 && (
        <Wischer frame={frame} ab={A2}>
          <Akt2 frame={frame} />
        </Wischer>
      )}
      <Wischer frame={frame} ab={A3}>
        <Akt3 frame={frame} />
      </Wischer>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="DnpPreis" component={Film} width={W} height={H} fps={FPS} durationInFrames={ENDE} />
);
