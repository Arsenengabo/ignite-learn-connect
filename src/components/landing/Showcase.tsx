import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Calls back with whether the element is on screen. */
const useInView = <T extends Element>(threshold = 0.2) => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
};

/** Fades and lifts its content in the first time it scrolls into view. */
export const Reveal = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (inView) setShown(true);
  }, [inView]);
  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        shown ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-6",
        className,
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
};

/** A phone outline around a screenshot or video. */
export const PhoneFrame = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("relative rounded-[2.4rem] bg-neutral-900 p-[10px] shadow-2xl ring-1 ring-white/10", className)}>
    <div className="absolute left-1/2 top-[14px] z-10 h-[18px] w-[30%] -translate-x-1/2 rounded-full bg-neutral-900" aria-hidden />
    <div className="overflow-hidden rounded-[1.9rem] bg-background aspect-[390/844]">{children}</div>
  </div>
);

/** A laptop outline around a screenshot. */
export const LaptopFrame = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("relative", className)}>
    <div className="rounded-t-xl bg-neutral-900 p-[10px] pb-[14px] ring-1 ring-white/10 shadow-2xl">
      <div className="overflow-hidden rounded-md bg-background aspect-[1440/900]">{children}</div>
    </div>
    <div className="relative mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-xl bg-gradient-to-b from-neutral-700 to-neutral-900" aria-hidden>
      <div className="absolute left-1/2 top-0 h-1.5 w-[14%] -translate-x-1/2 rounded-b-md bg-neutral-800" />
    </div>
  </div>
);

const Screen = ({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) => (
  <img
    src={src}
    alt={alt}
    loading={eager ? "eager" : "lazy"}
    decoding="async"
    className="block h-full w-full object-cover object-top"
  />
);

/** The real Live lecture screen, recorded, playing inside a phone. */
export const HeroVideo = () => {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play only while visible, and never on its own for reduced-motion visitors.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView && !reduced) v.play().catch(() => undefined);
    else v.pause();
  }, [inView, reduced]);

  return (
    <div ref={ref} className="relative mx-auto w-[260px] sm:w-[290px]">
      <PhoneFrame className="motion-safe:animate-float-slow">
        <video
          ref={videoRef}
          className="block h-full w-full object-cover object-top"
          src="/showcase/live-lecture.mp4"
          poster="/showcase/live-lecture-poster.webp"
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          aria-label="Codex Live lecture: the transcript fills in as the lecturer speaks, then a summary appears"
        />
      </PhoneFrame>
      <div className="absolute -left-8 sm:-left-16 top-20 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur motion-safe:animate-float-slower">
        <p className="text-xs font-semibold">Transcript</p>
        <p className="text-[11px] text-muted-foreground">writes itself as they speak</p>
      </div>
      <div className="absolute -right-6 sm:-right-14 bottom-24 rounded-xl border border-primary/40 bg-card/95 px-3 py-2 shadow-xl backdrop-blur motion-safe:animate-float-slow">
        <p className="text-xs font-semibold text-primary">Summary ready</p>
        <p className="text-[11px] text-muted-foreground">key points · exam tips</p>
      </div>
    </div>
  );
};

export interface TourStep {
  id: string;
  tab: string;
  title: string;
  text: string;
  desktop: { src: string; alt: string };
  phone?: { src: string; alt: string };
}

const STEP_MS = 6000;

/**
 * Auto-playing product tour: tabs switch between real Codex screens on a laptop
 * and a phone, like a short video. Pauses on hover, keyboard focus, when off screen,
 * and stays still for reduced-motion visitors.
 */
export const ProductTour = ({ steps }: { steps: TourStep[] }) => {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPicked, setUserPicked] = useState(false);
  const playing = inView && !hovering && !reduced && !userPicked;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, active, steps.length]);

  const step = steps[active];

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      <div role="tablist" aria-label="Codex tour" className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center [scrollbar-width:none]">
        {steps.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            id={`tour-tab-${s.id}`}
            aria-selected={i === active}
            aria-controls="tour-panel"
            onClick={() => {
              setActive(i);
              setUserPicked(true);
            }}
            className={cn(
              "relative flex-shrink-0 overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              i === active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.tab}
            {i === active && playing && (
              <span
                key={`${active}-progress`}
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary animate-tour-progress"
                style={{ ["--tour-duration" as string]: `${STEP_MS}ms` }}
              />
            )}
          </button>
        ))}
      </div>

      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${step.id}`} className="mt-8 grid lg:grid-cols-[0.8fr_1.6fr] gap-8 lg:gap-12 items-center">
        <div key={step.id} className="text-center lg:text-left motion-safe:animate-fade-in">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{step.title}</h3>
          <p className="mt-3 text-muted-foreground leading-relaxed">{step.text}</p>
        </div>

        <div className="relative px-2 sm:px-6 pb-6">
          {steps.map((s, i) => (
            <div
              key={s.id}
              aria-hidden={i !== active}
              className={cn(
                "transition-opacity duration-500",
                i === active ? "relative opacity-100" : "pointer-events-none absolute inset-0 px-2 sm:px-6 opacity-0",
              )}
            >
              <LaptopFrame className="w-full">
                <Screen src={s.desktop.src} alt={s.desktop.alt} />
              </LaptopFrame>
              {s.phone && (
                <PhoneFrame className="absolute -bottom-2 right-0 sm:right-2 w-[30%] max-w-[190px] p-[6px] rounded-[1.6rem]">
                  <Screen src={s.phone.src} alt={s.phone.alt} />
                </PhoneFrame>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** A slowly scrolling strip of feature names. Static for reduced-motion visitors. */
export const FeatureMarquee = ({ items }: { items: string[] }) => (
  <div className="relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
    <ul className="flex w-max gap-3 motion-safe:animate-marquee hover:[animation-play-state:paused]" aria-label="Codex features">
      {[...items, ...items].map((item, i) => (
        <li
          key={`${item}-${i}`}
          aria-hidden={i >= items.length}
          className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  </div>
);
