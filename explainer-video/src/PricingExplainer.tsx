import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const INK = "#14201e";
const GOLD = "#c4a16a";
const GOLD_LIGHT = "#e1c697";
const PAPER = "#f7f8f6";
const GREEN = "#2f8f5b";
const SERIF = '"Iowan Old Style", Baskerville, "Times New Roman", serif';
const SANS = '"Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif';

const SCENES = {
  intro: 120,
  base: 180,
  packages: 210,
  toggle: 150,
  video: 180,
  ai: 120,
  cta: 90,
};
export const TOTAL_FRAMES = Object.values(SCENES).reduce((sum, value) => sum + value, 0);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function useFade(duration: number, fadeIn = 12, fadeOut = 12) {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, fadeIn, duration - fadeOut, duration], [0, 1, 1, 0], clamp);
}

function Scene({ duration, children }: { duration: number; children: ReactNode }) {
  const opacity = useFade(duration);
  return (
    <AbsoluteFill style={{ opacity, padding: "56px 72px", fontFamily: SANS, color: INK }}>
      {children}
    </AbsoluteFill>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 18], [18, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ transform: `translateY(${y}px)` }}>
      <div style={{ color: "#806a43", fontSize: 18, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>{kicker}</div>
      <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 52, lineHeight: 1.05 }}>{title}</div>
    </div>
  );
}

const money = (value: number) => `$${value.toLocaleString("en-US")}`;

// Strikes through the regular price, then reveals the current price.
function PriceReveal({ regular, price, start, size = 40, plus = false }: { regular: number; price: number; start: number; size?: number; plus?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strike = interpolate(frame, [start, start + 14], [0, 100], { ...clamp, easing: Easing.out(Easing.cubic) });
  const reveal = spring({ frame: frame - (start + 14), fps, config: { damping: 12, stiffness: 140 } });
  const prefix = plus ? "+" : "";
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
      <span style={{ position: "relative", color: "#8b9692", fontSize: size * 0.6, fontWeight: 600 }}>
        {prefix}{money(regular)}
        <span style={{ position: "absolute", left: 0, top: "52%", width: `${strike}%`, height: 3, background: "#c0392b" }} />
      </span>
      <span style={{ color: INK, fontFamily: SERIF, fontSize: size, opacity: reveal, transform: `scale(${0.7 + 0.3 * reveal})`, transformOrigin: "left center" }}>
        {prefix}{money(price)}
      </span>
    </div>
  );
}

function Card({ children, delay, highlight = false, style }: { children: ReactNode; delay: number; highlight?: boolean; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 40}px)`,
        background: highlight ? "#fbf8f0" : "white",
        border: `2px solid ${highlight ? GOLD : "#dfe5e1"}`,
        padding: 26,
        boxShadow: highlight ? "0 18px 40px rgb(196 161 106 / 25%)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SavingsBadge({ amount, start }: { amount: number; start: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - start, fps, config: { damping: 9, stiffness: 160 } });
  return (
    <div style={{ display: "inline-block", transform: `scale(${pop})`, background: GREEN, color: "white", padding: "8px 16px", fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>
      SAVE {money(amount)}
    </div>
  );
}

function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: INK, color: "white", fontFamily: SANS, alignItems: "center", justifyContent: "center", textAlign: "center", opacity: useFade(SCENES.intro, 10, 14) }}>
      <div style={{ color: GOLD_LIGHT, fontSize: 20, letterSpacing: 7, textTransform: "uppercase" }}>Merit Media &amp; Marketing</div>
      <div style={{ marginTop: 22, fontFamily: SERIF, fontSize: 88, lineHeight: 1.02, transform: `scale(${0.85 + 0.15 * pop})`, opacity: pop }}>
        Two ways to book<br /><span style={{ color: GOLD_LIGHT }}>your listing media.</span>
      </div>
      <div style={{ marginTop: 30, fontSize: 26, color: "rgb(255 255 255 / 75%)", opacity: interpolate(frame, [40, 60], [0, 1], clamp) }}>
        Build it à la carte, or save with a turnkey package.
      </div>
    </AbsoluteFill>
  );
}

function BaseScene() {
  return (
    <Scene duration={SCENES.base}>
      <Heading kicker="Step 1" title="Choose your base property media" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: 40 }}>
        <Card delay={14}>
          <div style={{ fontFamily: SERIF, fontSize: 32 }}>Photo-Only Essentials</div>
          <div style={{ marginTop: 8, color: "#65726e", fontSize: 20 }}>Next-day HDR interior &amp; exterior stills</div>
          <div style={{ marginTop: 28 }}><PriceReveal regular={235} price={195} start={44} /></div>
        </Card>
        <Card delay={24} highlight>
          <div style={{ fontFamily: SERIF, fontSize: 32 }}>Full Media Suite</div>
          <div style={{ marginTop: 8, color: "#65726e", fontSize: 20 }}>HDR stills · 4K aerials · 2D floor plan</div>
          <div style={{ marginTop: 28 }}><PriceReveal regular={330} price={275} start={54} /></div>
        </Card>
      </div>
      <div style={{ marginTop: 34, fontSize: 22, color: "#65726e" }}>Pricing scales by square footage. Next, a smarter way to book.</div>
    </Scene>
  );
}

function PackagesScene() {
  return (
    <Scene duration={SCENES.packages}>
      <Heading kicker="Right after your base choice" title="Upgrade to a turnkey package" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: 36 }}>
        <Card delay={14} highlight>
          <div style={{ color: "#806a43", fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>MOST POPULAR · COMPLETE LISTING LAUNCH</div>
          <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 34 }}>The Complete Showcase Suite</div>
          <ul style={{ margin: "14px 0 20px", paddingLeft: 22, fontSize: 19, lineHeight: 1.55, color: "#263432" }}>
            <li>Photos, drone &amp; 2D floor plan</li>
            <li>60-sec Realtor-Hosted Branding Reel</li>
            <li>Zillow 3D Tour + twilight + boundary graphic</li>
            <li>30-Day Automated Social Post Pack</li>
          </ul>
          <PriceReveal regular={1140} price={795} start={60} size={44} />
          <div style={{ marginTop: 14 }}><SavingsBadge amount={345} start={86} /></div>
        </Card>
        <Card delay={26} highlight style={{ borderColor: INK }}>
          <div style={{ color: "#806a43", fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>SIGNATURE LUXURY · WATERFRONT &amp; ACREAGE</div>
          <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 34 }}>Waterfront &amp; Estate Luxury Suite</div>
          <ul style={{ margin: "14px 0 20px", paddingLeft: 22, fontSize: 19, lineHeight: 1.55, color: "#263432" }}>
            <li>50–60+ HDR stills · 12–15+ 4K aerials</li>
            <li>2-Minute Cinematic Showcase Film</li>
            <li>Amenities suite · Zillow 3D · boundary graphic</li>
            <li>30-Day Premium Social Engine: 4 reels + 8 posts</li>
          </ul>
          <PriceReveal regular={1620} price={1195} start={72} size={44} />
          <div style={{ marginTop: 14 }}><SavingsBadge amount={425} start={98} /></div>
        </Card>
      </div>
    </Scene>
  );
}

function ToggleScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = spring({ frame: frame - 40, fps, config: { damping: 16 } });
  const knob = 6 + flip * 50;
  const dim = interpolate(flip, [0, 1], [1, 0.28]);
  return (
    <Scene duration={SCENES.toggle}>
      <Heading kicker="Keep it simple" title="Pick a package and the extras tuck away" />
      <Card delay={10} style={{ marginTop: 40, maxWidth: 920 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>À la carte options</div>
            <div style={{ marginTop: 6, fontSize: 19, color: "#65726e" }}>{flip > 0.5 ? "Off — everything you need is already included." : "On — build exactly what you want."}</div>
          </div>
          <div style={{ position: "relative", width: 112, height: 56, borderRadius: 28, background: flip > 0.5 ? "#cfd6d2" : GOLD }}>
            <div style={{ position: "absolute", top: 6, left: knob, width: 44, height: 44, borderRadius: 22, background: "white", boxShadow: "0 2px 6px rgb(0 0 0 / 25%)" }} />
          </div>
        </div>
        <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, opacity: dim }}>
          {["Video production", "Quick enhancements", "Social add-ons"].map((label) => (
            <div key={label} style={{ border: "1px dashed #aab3af", padding: "18px 14px", fontSize: 19, textAlign: "center" }}>{label}</div>
          ))}
        </div>
      </Card>
      <div style={{ marginTop: 26, fontSize: 22, color: "#65726e", opacity: interpolate(frame, [70, 90], [0, 1], clamp) }}>
        Want more control? Flip it back on to build à la carte.
      </div>
    </Scene>
  );
}

function VideoScene() {
  const options = [
    { name: "60-Sec Cinematic B-Roll Reel", regular: 375, price: 275 },
    { name: "60-Sec Realtor-Hosted Branding Reel", regular: 495, price: 395 },
    { name: "2-Min Cinematic Showcase Film", regular: 745, price: 645 },
  ];
  return (
    <Scene duration={SCENES.video}>
      <Heading kicker="À la carte · Step 2" title="Add video: the high-impact upsell" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginTop: 40 }}>
        {options.map((option, index) => (
          <Card key={option.name} delay={12 + index * 10} highlight={index === 1}>
            <div style={{ fontFamily: SERIF, fontSize: 26, minHeight: 96, lineHeight: 1.15 }}>{option.name}</div>
            <div style={{ marginTop: 20 }}><PriceReveal regular={option.regular} price={option.price} start={46 + index * 14} size={42} plus /></div>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 30, fontSize: 22, color: "#65726e" }}>Every video shows its regular price, then your current price.</div>
    </Scene>
  );
}

function AiScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = 1 + 0.03 * Math.sin(frame / 6);
  const pop = spring({ frame: frame - 14, fps, config: { damping: 13 } });
  return (
    <Scene duration={SCENES.ai}>
      <Heading kicker="No camera? No problem" title="Not good on camera?" />
      <Card delay={10} highlight style={{ marginTop: 40, maxWidth: 1000, transform: `scale(${pulse * (0.9 + 0.1 * pop)})`, transformOrigin: "left top" }}>
        <div style={{ fontFamily: SERIF, fontSize: 38 }}>Use an AI Presenter instead.</div>
        <div style={{ marginTop: 10, fontSize: 22, color: "#263432", lineHeight: 1.5 }}>
          Your approved likeness and voice, a polished promo, and no filming day. Add it right in the quote.
        </div>
        <div style={{ display: "flex", gap: 36, marginTop: 24 }}>
          <PriceReveal regular={595} price={495} start={34} size={40} />
          <span style={{ alignSelf: "center", fontSize: 20, color: "#65726e" }}>30 seconds</span>
          <PriceReveal regular={795} price={695} start={48} size={40} />
          <span style={{ alignSelf: "center", fontSize: 20, color: "#65726e" }}>up to 90 seconds</span>
        </div>
      </Card>
    </Scene>
  );
}

function Cta() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 6, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ background: INK, color: "white", fontFamily: SANS, alignItems: "center", justifyContent: "center", textAlign: "center", opacity: useFade(SCENES.cta, 12, 4) }}>
      <div style={{ fontFamily: SERIF, fontSize: 70, transform: `scale(${0.85 + 0.15 * pop})`, opacity: pop }}>Choose your path.</div>
      <div style={{ marginTop: 22, fontSize: 28, color: GOLD_LIGHT }}>À la carte · or turnkey package</div>
      <div style={{ marginTop: 34, border: `2px solid ${GOLD_LIGHT}`, padding: "14px 34px", fontSize: 26, letterSpacing: 2 }}>meritmediafl.com</div>
    </AbsoluteFill>
  );
}

export const PricingExplainer = () => {
  let cursor = 0;
  const place = (duration: number) => {
    const from = cursor;
    cursor += duration;
    return from;
  };
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Sequence from={place(SCENES.intro)} durationInFrames={SCENES.intro}><Intro /></Sequence>
      <Sequence from={place(SCENES.base)} durationInFrames={SCENES.base}><BaseScene /></Sequence>
      <Sequence from={place(SCENES.packages)} durationInFrames={SCENES.packages}><PackagesScene /></Sequence>
      <Sequence from={place(SCENES.toggle)} durationInFrames={SCENES.toggle}><ToggleScene /></Sequence>
      <Sequence from={place(SCENES.video)} durationInFrames={SCENES.video}><VideoScene /></Sequence>
      <Sequence from={place(SCENES.ai)} durationInFrames={SCENES.ai}><AiScene /></Sequence>
      <Sequence from={place(SCENES.cta)} durationInFrames={SCENES.cta}><Cta /></Sequence>
    </AbsoluteFill>
  );
};
