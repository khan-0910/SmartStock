"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const fmt = new Intl.NumberFormat("en-US");

/** Count an element's text from data-from (default 0) to data-to. */
function countTo(el: HTMLElement, vars: gsap.TweenVars = {}) {
  const to = Number(el.dataset.to ?? 0);
  const from = Number(el.dataset.from ?? 0);
  const state = { v: from };
  el.textContent = fmt.format(from);
  return gsap.to(state, {
    v: to,
    duration: 1.4,
    ease: "power3.out",
    ...vars,
    onUpdate: () => {
      el.textContent = fmt.format(Math.round(state.v));
    },
  });
}

// Fanned resting positions for the hero photo deck, front card first.
const FAN = [
  { xPercent: 0, yPercent: 0, rotation: -4, scale: 1 },
  { xPercent: 7, yPercent: 3, rotation: 5, scale: 0.95 },
  { xPercent: -7, yPercent: 6, rotation: -10, scale: 0.9 },
  { xPercent: 10, yPercent: 9, rotation: 12, scale: 0.85 },
];

/**
 * All landing-page motion. Markup is server-rendered; this only animates
 * transform / opacity / clip-path (compositor-friendly) and pauses looping
 * work while it is off screen. Elements hidden by CSS before hydration are
 * always revealed, including in the reduced-motion branch.
 */
export function LandingMotion({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          desktop: "(min-width: 1024px)",
          finePointer: "(pointer: fine)",
        },
        (ctx) => {
          const { motion, desktop, finePointer } = ctx.conditions as Record<string, boolean>;
          const el = root.current!;
          const q = gsap.utils.selector(el);
          const one = (sel: string) => q(sel)[0] as HTMLElement | undefined;

          if (!motion) {
            gsap.set(q("[data-hero-title], [data-hero-fade], [data-reveal], [data-split]"), { autoAlpha: 1 });
            return;
          }

          const cleanups: (() => void)[] = [];
          const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
            t.addEventListener(type, fn as EventListener, { passive: true });
            cleanups.push(() => t.removeEventListener(type, fn as EventListener));
          };

          // ---- Smooth scroll: Lenis on GSAP's ticker (one rAF loop for everything)
          const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: { offset: -80 }, stopInertiaOnNavigate: true, autoRaf: false });
          lenis.on("scroll", ScrollTrigger.update);
          const raf = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          cleanups.push(() => {
            gsap.ticker.remove(raf);
            gsap.ticker.lagSmoothing(500, 33);
            lenis.destroy();
          });

          // ---- Header: solid after scrolling, hides going down, returns going up
          const header = one("[data-header]");
          if (header) {
            const nav = header.querySelector("nav")!;
            let hidden = false;
            ScrollTrigger.create({
              start: 0,
              end: "max",
              onUpdate(self) {
                const y = self.scroll();
                nav.toggleAttribute("data-scrolled", y > 24);
                const hide = self.direction === 1 && y > 400;
                if (hide !== hidden) {
                  hidden = hide;
                  gsap.to(header, { yPercent: hide ? -140 : 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
                }
              },
            });
          }

          // ---- Hero intro
          const hero = one("[data-hero]")!;
          const title = one("[data-hero-title]");
          if (title) {
            SplitText.create(title, {
              type: "words,chars",
              mask: "words",
              autoSplit: true,
              onSplit(self) {
                gsap.set(title, { autoAlpha: 1 });
                return gsap.from(self.chars, { yPercent: 120, rotation: 12, duration: 1.1, ease: "expo.out", stagger: 0.025, delay: 0.1 });
              },
            });
          }
          const intro = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.1 } });
          intro.fromTo(q("[data-hero-fade]"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.08 }, 0.35);

          // Photo deck: cards fly up into a fan, then shuffle on a loop.
          const cards = q("[data-deck-card]") as HTMLElement[];
          let order = [...cards];
          const restack = () => order.forEach((c, i) => gsap.set(c, { zIndex: order.length - i }));
          gsap.set(cards, { yPercent: 70, rotation: 0, scale: 0.7, autoAlpha: 0, transformOrigin: "50% 100%" });
          order.forEach((c, i) => intro.to(c, { ...FAN[i], autoAlpha: 1, duration: 1.4 }, 0.45 + (order.length - i) * 0.09));
          intro.from(q("[data-sticker]"), { scale: 0, rotation: -30, autoAlpha: 0, duration: 0.8, ease: "back.out(2.2)", stagger: 0.1 }, 1.1);

          let shuffling = false;
          const shuffle = () => {
            if (shuffling || order.length < 2) return;
            shuffling = true;
            const top = order[0];
            const rest = order.slice(1);
            const tl = gsap.timeline({ onComplete: () => void (shuffling = false) });
            tl.to(top, { xPercent: 120, yPercent: -8, rotation: 28, duration: 0.55, ease: "power3.in" })
              .add(() => {
                order = [...rest, top];
                restack();
              })
              .to(top, { ...FAN[order.length - 1], duration: 0.8, ease: "power3.out" });
            rest.forEach((c, i) => tl.to(c, { ...FAN[i], duration: 0.75, ease: "back.out(1.6)" }, 0.3));
          };
          // A repeating empty tween is an easy, pausable metronome.
          const deckClock = gsap.to({}, { duration: 3, repeat: -1, onRepeat: shuffle, delay: 2.4 });
          const deck = one("[data-deck]");
          if (deck) {
            on(deck, "pointerenter", () => deckClock.pause());
            on(deck, "pointerleave", () => deckClock.resume());
            on(deck, "click", shuffle);
          }

          // Stickers: gentle bob (yPercent) + pointer parallax (x/y), so they never fight.
          const stickers = q("[data-sticker]") as HTMLElement[];
          const bobs = stickers.map((s, i) =>
            gsap.to(s, { yPercent: -18, rotation: `+=${i % 2 ? 4 : -4}`, duration: 2 + i * 0.35, ease: "sine.inOut", repeat: -1, yoyo: true }),
          );
          if (finePointer) {
            const movers = stickers.map((s) => ({
              depth: Number(s.dataset.depth ?? 1),
              x: gsap.quickTo(s, "x", { duration: 0.9, ease: "power3" }),
              y: gsap.quickTo(s, "y", { duration: 0.9, ease: "power3" }),
            }));
            on(hero, "pointermove", (e) => {
              const r = hero.getBoundingClientRect();
              const px = (e.clientX - r.left) / r.width - 0.5;
              const py = (e.clientY - r.top) / r.height - 0.5;
              movers.forEach((m) => {
                m.x(px * 40 * m.depth);
                m.y(py * 30 * m.depth);
              });
            });
          }

          // Pause hero loops while the hero is off screen.
          const heroLoops = [deckClock, ...bobs];
          ScrollTrigger.create({
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => heroLoops.forEach((t) => (self.isActive ? t.resume() : t.pause())),
          });

          // Scroll away: copy drifts up, deck tilts back.
          gsap.to(one("[data-hero-copy]") ?? [], {
            yPercent: -12,
            autoAlpha: 0.2,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
          });
          gsap.to(one("[data-deck-wrap]") ?? [], {
            yPercent: 14,
            rotation: -6,
            scale: 0.9,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
          });

          // ---- Scroll-expand photo: framed card grows to full bleed (pinned)
          const expand = one("[data-expand]");
          if (expand) {
            gsap
              .timeline({
                scrollTrigger: { trigger: expand, start: "top top", end: "+=110%", pin: true, scrub: 0.6, anticipatePin: 1 },
              })
              .fromTo(one("[data-expand-frame]") ?? [], { clipPath: "inset(12% 8% round 2rem)" }, { clipPath: "inset(0% 0% round 0rem)", ease: "none" }, 0)
              .fromTo(one("[data-expand-img]") ?? [], { scale: 1.35 }, { scale: 1, ease: "none" }, 0)
              .from(q("[data-expand-kicker], [data-expand-title]"), { yPercent: 80, autoAlpha: 0, stagger: 0.12, ease: "power3.out", duration: 0.4 }, 0.45);
          }

          // ---- Features: horizontal scroll on desktop, reveal on smaller screens
          const hsection = one("[data-hscroll]");
          const track = one("[data-htrack]");
          const hcards = q("[data-hcard]") as HTMLElement[];
          if (desktop && hsection && track) {
            const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
            const hTween = gsap.to(track, {
              x: () => -distance(),
              ease: "none",
              scrollTrigger: {
                trigger: hsection,
                start: "top top",
                end: () => `+=${distance()}`,
                pin: true,
                scrub: 0.6,
                invalidateOnRefresh: true,
                anticipatePin: 1,
              },
            });
            hcards.forEach((card, i) => {
              const tilt = i % 2 ? 7 : -7;
              gsap.fromTo(
                card,
                { rotation: tilt, yPercent: 8, scale: 0.9 },
                {
                  rotation: 0,
                  yPercent: 0,
                  scale: 1,
                  ease: "power2.out",
                  scrollTrigger: { trigger: card, containerAnimation: hTween, start: "left 95%", end: "center 60%", scrub: true },
                },
              );
              const img = card.querySelector("[data-hcard-img]");
              if (img) {
                gsap.fromTo(
                  img,
                  { xPercent: -6 },
                  { xPercent: 6, ease: "none", scrollTrigger: { trigger: card, containerAnimation: hTween, start: "left right", end: "right left", scrub: true } },
                );
              }
            });
          } else if (hcards.length) {
            gsap.set(hcards, { autoAlpha: 0, y: 60, rotation: (i: number) => (i % 2 ? 4 : -4) });
            ScrollTrigger.batch(hcards, {
              start: "top 90%",
              once: true,
              onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, rotation: 0, duration: 1, ease: "expo.out", stagger: 0.1 }),
            });
          }

          // ---- How it works: pinned, scroll-scrubbed story on desktop
          const how = one("[data-how]");
          const steps = q("[data-step]") as HTMLElement[];
          const visuals = q("[data-visual]") as HTMLElement[];
          if (desktop && how && steps.length === 3 && visuals.length === 3) {
            gsap.set(steps.slice(1), { opacity: 0.3 });
            gsap.set(visuals.slice(1), { autoAlpha: 0, y: 80, rotation: 6, scale: 0.92 });
            const stock = one("[data-how-stock]");
            const stockState = { v: 48 };
            const tl = gsap.timeline({
              defaults: { ease: "power3.inOut", duration: 0.5 },
              scrollTrigger: {
                trigger: how,
                start: "top top",
                end: () => `+=${window.innerHeight * 2.4}`,
                pin: true,
                scrub: 0.7,
                // Labels sit inside "hold" zones, so snapping always rests on a settled step.
                snap: { snapTo: "labelsDirectional", duration: { min: 0.3, max: 0.8 }, ease: "power2.inOut", delay: 0.1 },
                invalidateOnRefresh: true,
              },
            });
            // Time map: 0–0.4 step 1 · 0.4–0.9 → step 2 · 0.9–1.5 hold · 1.5–2.0 → step 3 · 2.0–2.6 hold
            tl.addLabel("s1", 0)
              .fromTo(one("[data-how-progress]") ?? [], { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 2.6 }, 0)
              .from(one("[data-decoded]") ?? [], { autoAlpha: 0, y: 14, duration: 0.3 }, 0.05)
              .to(steps[0], { opacity: 0.3 }, 0.4)
              .to(steps[1], { opacity: 1 }, 0.4)
              .to(visuals[0], { autoAlpha: 0, y: -80, rotation: -6, scale: 0.92 }, 0.4)
              .to(visuals[1], { autoAlpha: 1, y: 0, rotation: 0, scale: 1 }, 0.45)
              .addLabel("s2", 1.2)
              .fromTo(one("[data-confirm-btn]") ?? [], { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 }, 1.0)
              .to(steps[1], { opacity: 0.3 }, 1.5)
              .to(steps[2], { opacity: 1 }, 1.5)
              .to(visuals[1], { autoAlpha: 0, y: -80, rotation: -6, scale: 0.92 }, 1.5)
              .to(visuals[2], { autoAlpha: 1, y: 0, rotation: 0, scale: 1 }, 1.55)
              .from(one("[data-new-row]") ?? [], { autoAlpha: 0, x: -30, duration: 0.3 }, 1.8)
              .to(
                stockState,
                {
                  v: 43,
                  duration: 0.35,
                  ease: "power1.out",
                  onUpdate: () => {
                    if (stock) stock.textContent = String(Math.round(stockState.v));
                  },
                },
                1.75,
              )
              .addLabel("s3", 2.6);
          } else if (steps.length) {
            gsap.set(steps, { autoAlpha: 0, y: 40 });
            ScrollTrigger.batch(steps, {
              start: "top 88%",
              once: true,
              onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12 }),
            });
          }

          // Scanner beam inside the "how" visual.
          const beams = q("[data-beam]") as HTMLElement[];
          const beamTweens = beams.map((beam) => {
            const travel = () => ((beam.parentElement?.offsetHeight ?? 0) - beam.offsetHeight) * 0.9;
            return gsap.fromTo(beam, { y: () => travel() * 0.05 }, { y: travel, duration: 1.5, ease: "sine.inOut", repeat: -1, yoyo: true });
          });
          if (how) {
            ScrollTrigger.create({
              trigger: how,
              start: "top bottom",
              end: "bottom top",
              onToggle: (self) => beamTweens.forEach((t) => (self.isActive ? t.resume() : t.pause())),
            });
          }

          // ---- Gallery: clip-path wipes upward, photo settles from a zoom
          const clips = q("[data-clip]") as HTMLElement[];
          if (clips.length) {
            gsap.set(clips, { clipPath: "inset(100% 0% 0% 0% round 1.75rem)" });
            gsap.set(q("[data-clip-img]"), { scale: 1.35 });
            ScrollTrigger.batch(clips, {
              start: "top 88%",
              once: true,
              onEnter: (els) => {
                gsap.to(els, { clipPath: "inset(0% 0% 0% 0% round 1.75rem)", duration: 1.2, ease: "expo.inOut", stagger: 0.12 });
                gsap.to(
                  els.map((e) => e.querySelector("[data-clip-img]")),
                  { scale: 1, duration: 1.6, ease: "expo.out", stagger: 0.12, clearProps: "transform" },
                );
              },
            });
          }

          // ---- Section headings: masked line-by-line reveal
          q("[data-split]").forEach((heading) => {
            SplitText.create(heading, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit(self) {
                gsap.set(heading, { autoAlpha: 1 });
                return gsap.from(self.lines, {
                  yPercent: 110,
                  rotation: 2,
                  duration: 1.2,
                  ease: "expo.out",
                  stagger: 0.1,
                  scrollTrigger: { trigger: heading, start: "top 88%", once: true },
                });
              },
            });
          });

          // ---- Generic reveals, batched so items entering together stagger
          ScrollTrigger.batch(q("[data-reveal]"), {
            start: "top 90%",
            once: true,
            onEnter: (els) =>
              gsap.fromTo(els, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true }),
          });

          // ---- Fact counters
          q("[data-count]").forEach((n) => {
            ScrollTrigger.create({ trigger: n, start: "top 92%", once: true, onEnter: () => countTo(n as HTMLElement) });
          });

          // ---- CTA: orbiting photos spin slowly and drift with scroll
          const orbits = q("[data-orbit]") as HTMLElement[];
          const spins = orbits.map((o, i) => gsap.to(o, { rotation: i % 2 ? -360 : 360, duration: 40, ease: "none", repeat: -1 }));
          orbits.forEach((o, i) =>
            gsap.fromTo(o, { y: i % 2 ? -60 : 80 }, { y: i % 2 ? 60 : -80, ease: "none", scrollTrigger: { trigger: o.closest("section"), scrub: true } }),
          );
          if (orbits[0]) {
            ScrollTrigger.create({
              trigger: orbits[0].closest("section"),
              start: "top bottom",
              end: "bottom top",
              onToggle: (self) => spins.forEach((t) => (self.isActive ? t.resume() : t.pause())),
            });
          }

          // ---- Magnetic buttons
          if (finePointer) {
            q("[data-magnetic]").forEach((btn) => {
              const b = btn as HTMLElement;
              const mx = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3" });
              const my = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3" });
              on(b, "pointermove", (e) => {
                const r = b.getBoundingClientRect();
                mx((e.clientX - (r.left + r.width / 2)) * 0.3);
                my((e.clientY - (r.top + r.height / 2)) * 0.4);
              });
              on(b, "pointerleave", () => gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)", overwrite: "auto" }));
            });
          }

          // Live dot pulse.
          gsap.to(q("[data-live-dot]"), { scale: 2.2, autoAlpha: 0, duration: 1.4, ease: "power2.out", repeat: -1 });

          return () => cleanups.forEach((fn) => fn());
        },
        root,
      );
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
