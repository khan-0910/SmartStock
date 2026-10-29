"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const fmt = new Intl.NumberFormat("en-US");

/** Count an element's text from 0 (or data-from) to data-to. */
function countTo(el: HTMLElement, vars: gsap.TweenVars = {}) {
  const to = Number(el.dataset.to ?? 0);
  const from = Number(el.dataset.from ?? 0);
  const prefix = el.dataset.prefix ?? "";
  const state = { v: from };
  el.textContent = prefix + fmt.format(from);
  return gsap.to(state, {
    v: to,
    duration: 1.6,
    ease: "power3.out",
    ...vars,
    onUpdate: () => {
      el.textContent = prefix + fmt.format(Math.round(state.v));
    },
  });
}

/**
 * All landing-page motion lives here; the markup stays server-rendered.
 * Elements hidden by CSS before hydration ([data-hero-*], [data-reveal],
 * [data-split]) are always revealed by every branch below, and the CSS only
 * hides them when the user has not asked for reduced motion.
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

          if (!motion) {
            gsap.set(q("[data-hero-title], [data-hero-fade], [data-hero-mock], [data-reveal], [data-split]"), { autoAlpha: 1 });
            return;
          }

          const cleanups: (() => void)[] = [];

          // ---- Smooth scroll (Lenis driven by GSAP's ticker so ScrollTrigger stays in sync)
          const lenis = new Lenis({ duration: 1.15, anchors: { offset: -72 }, autoRaf: false });
          lenis.on("scroll", ScrollTrigger.update);
          const raf = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          cleanups.push(() => {
            gsap.ticker.remove(raf);
            gsap.ticker.lagSmoothing(500, 33);
            lenis.destroy();
          });

          // ---- Header: frosted after scrolling, hides on scroll down, returns on scroll up
          const header = q("[data-header]")[0];
          let hidden = false;
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate(self) {
              const y = self.scroll();
              header.toggleAttribute("data-scrolled", y > 24);
              const hide = self.direction === 1 && y > 320;
              if (hide !== hidden) {
                hidden = hide;
                gsap.to(header, { yPercent: hide ? -110 : 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
              }
            },
          });

          // ---- Hero intro
          const title = q("[data-hero-title]")[0];
          SplitText.create(title, {
            type: "words,chars",
            mask: "words",
            autoSplit: true,
            onSplit(self) {
              gsap.set(title, { autoAlpha: 1 });
              return gsap.from(self.chars, { yPercent: 118, rotation: 6, duration: 1.15, ease: "expo.out", stagger: 0.016, delay: 0.1 });
            },
          });

          const intro = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.2 } });
          intro
            .fromTo(q("[data-hero-fade]"), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, stagger: 0.09 }, 0.45)
            .fromTo(
              q("[data-hero-mock]"),
              { autoAlpha: 0, y: 90, rotationX: 22, scale: 0.92, transformOrigin: "50% 0%" },
              { autoAlpha: 1, y: 0, rotationX: 0, scale: 1, duration: 1.8 },
              0.55,
            )
            .from(q("[data-mock-card]"), { y: 24, autoAlpha: 0, stagger: 0.07, duration: 1 }, 1.0)
            .from(q("[data-mock-row]"), { x: -24, autoAlpha: 0, stagger: 0.08, duration: 0.9 }, 1.25);
          q("[data-hero-count]").forEach((n, i) => intro.add(countTo(n as HTMLElement), 1.05 + i * 0.07));

          // Ambient loops
          q("[data-blob]").forEach((b) =>
            gsap.to(b, {
              x: "random(-120, 120)",
              y: "random(-80, 80)",
              scale: "random(0.85, 1.25)",
              duration: "random(7, 11)",
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              repeatRefresh: true,
            }),
          );
          q("[data-beam]").forEach((beam) => {
            const travel = () => ((beam.parentElement?.offsetHeight ?? 0) - beam.offsetHeight) * 0.9;
            gsap.fromTo(beam, { y: () => travel() * 0.05 }, { y: travel, duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true });
          });
          gsap.to(q("[data-live-dot]"), { scale: 1.8, autoAlpha: 0, duration: 1.2, ease: "power2.out", repeat: -1 });
          gsap
            .timeline({ repeat: -1, repeatDelay: 2.2, delay: 3 })
            .to(q("[data-mock-row]")[0] ?? [], { backgroundColor: "rgba(52,211,153,0.16)", duration: 0.35 })
            .to(q("[data-mock-row]")[0] ?? [], { backgroundColor: "rgba(255,255,255,0)", duration: 1.2 });

          // Hero scroll-away: copy lifts and fades, mock rises slower (parallax)
          gsap.to(q("[data-hero-copy]"), {
            yPercent: -18,
            autoAlpha: 0,
            ease: "none",
            scrollTrigger: { trigger: q("[data-hero]")[0], start: "top top", end: "60% top", scrub: true },
          });
          gsap.to(q("[data-hero-parallax]"), {
            yPercent: -12,
            scale: 1.04,
            ease: "none",
            scrollTrigger: { trigger: q("[data-hero]")[0], start: "top top", end: "bottom top", scrub: true },
          });

          // Pointer tilt on the product preview
          if (finePointer && desktop) {
            const hero = q("[data-hero]")[0] as HTMLElement;
            const tilt = q("[data-hero-tilt]")[0];
            const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.9, ease: "power3" });
            const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.9, ease: "power3" });
            const onMove = (e: PointerEvent) => {
              const r = hero.getBoundingClientRect();
              ry(((e.clientX - r.left) / r.width - 0.5) * 10);
              rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
            };
            const onLeave = () => {
              rx(0);
              ry(0);
            };
            hero.addEventListener("pointermove", onMove);
            hero.addEventListener("pointerleave", onLeave);
            cleanups.push(() => {
              hero.removeEventListener("pointermove", onMove);
              hero.removeEventListener("pointerleave", onLeave);
            });
          }

          // ---- Marquee: constant drift, sped up and reversed by scroll velocity
          const track = q("[data-marquee]")[0];
          if (track) {
            const drift = gsap.to(track, { xPercent: -50, ease: "none", duration: 38, repeat: -1 });
            // Start deep into the repeats so scrolling up can play it backwards indefinitely.
            drift.totalTime(drift.duration() * 1000);
            let dir = 1;
            ScrollTrigger.create({
              start: 0,
              end: "max",
              onUpdate(self) {
                dir = self.direction;
                const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 350);
                gsap.timeline({ overwrite: true })
                  .to(drift, { timeScale: dir * boost, duration: 0.2 })
                  .to(drift, { timeScale: dir, duration: 1.2, ease: "power2.out" });
              },
            });
          }

          // ---- "How it works": pinned, scroll-scrubbed story on desktop
          const how = q("[data-how]")[0];
          const steps = q("[data-step]");
          const visuals = q("[data-visual]");
          if (desktop && how && steps.length === 3 && visuals.length === 3) {
            gsap.set(steps.slice(1), { opacity: 0.28 });
            gsap.set(visuals.slice(1), { autoAlpha: 0, y: 60, scale: 0.96 });
            const stock = q("[data-how-stock]")[0] as HTMLElement;
            const stockState = { v: 48 };

            const tl = gsap.timeline({
              defaults: { ease: "power3.inOut", duration: 0.5 },
              scrollTrigger: {
                trigger: how,
                start: "top top",
                end: () => `+=${window.innerHeight * 2.6}`,
                pin: true,
                scrub: 0.8,
                // Labels sit inside "hold" zones, so snapping always rests on a settled step.
                snap: { snapTo: "labelsDirectional", duration: { min: 0.3, max: 0.8 }, ease: "power2.inOut", delay: 0.1 },
                invalidateOnRefresh: true,
              },
            });
            // Time map: 0–0.4 step 1 · 0.4–0.9 → step 2 · 0.9–1.5 hold · 1.5–2.0 → step 3 · 2.0–2.6 hold
            tl.addLabel("s1", 0)
              .fromTo(q("[data-how-progress]"), { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 2.6 }, 0)
              .from(q("[data-decoded]"), { autoAlpha: 0, y: 12, duration: 0.3 }, 0.05)
              // step 1 -> 2
              .to(steps[0], { opacity: 0.28 }, 0.4)
              .to(steps[1], { opacity: 1 }, 0.4)
              .to(visuals[0], { autoAlpha: 0, y: -60, scale: 0.96 }, 0.4)
              .to(visuals[1], { autoAlpha: 1, y: 0, scale: 1 }, 0.45)
              .addLabel("s2", 1.2)
              .fromTo(q("[data-confirm-btn]"), { scale: 1 }, { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, 1.0)
              // step 2 -> 3
              .to(steps[1], { opacity: 0.28 }, 1.5)
              .to(steps[2], { opacity: 1 }, 1.5)
              .to(visuals[1], { autoAlpha: 0, y: -60, scale: 0.96 }, 1.5)
              .to(visuals[2], { autoAlpha: 1, y: 0, scale: 1 }, 1.55)
              .from(q("[data-new-row]"), { autoAlpha: 0, x: -30, duration: 0.3 }, 1.8)
              .addLabel("s3", 2.6)
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
              );
          } else if (steps.length) {
            // No pin on small screens: steps simply reveal as they scroll in.
            gsap.set(steps, { autoAlpha: 0, y: 40 });
            ScrollTrigger.batch(steps, {
              start: "top 88%",
              once: true,
              onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12 }),
            });
          }


          // ---- Section headings: line-by-line masked reveal
          q("[data-split]").forEach((heading) => {
            SplitText.create(heading, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit(self) {
                gsap.set(heading, { autoAlpha: 1 });
                return gsap.from(self.lines, {
                  yPercent: 105,
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
            start: "top 88%",
            once: true,
            onEnter: (els) =>
              gsap.fromTo(els, { autoAlpha: 0, y: 56, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, ease: "expo.out", stagger: 0.09, overwrite: true }),
          });

          // ---- Fact counters
          q("[data-count]").forEach((n) => {
            ScrollTrigger.create({ trigger: n, start: "top 90%", once: true, onEnter: () => countTo(n as HTMLElement, { duration: 1.4 }) });
          });

          // ---- Pointer spotlight on feature cards
          q("[data-spot]").forEach((card) => {
            const c = card as HTMLElement;
            const onMove = (e: PointerEvent) => {
              const r = c.getBoundingClientRect();
              c.style.setProperty("--x", `${e.clientX - r.left}px`);
              c.style.setProperty("--y", `${e.clientY - r.top}px`);
            };
            c.addEventListener("pointermove", onMove);
            cleanups.push(() => c.removeEventListener("pointermove", onMove));
          });

          // ---- Magnetic buttons
          if (finePointer) {
            q("[data-magnetic]").forEach((btn) => {
              const b = btn as HTMLElement;
              const mx = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3" });
              const my = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3" });
              const onMove = (e: PointerEvent) => {
                const r = b.getBoundingClientRect();
                mx((e.clientX - (r.left + r.width / 2)) * 0.28);
                my((e.clientY - (r.top + r.height / 2)) * 0.38);
              };
              const onLeave = () => gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)", overwrite: "auto" });
              b.addEventListener("pointermove", onMove);
              b.addEventListener("pointerleave", onLeave);
              cleanups.push(() => {
                b.removeEventListener("pointermove", onMove);
                b.removeEventListener("pointerleave", onLeave);
              });
            });
          }

          gsap.to(q("[data-glow]"), { scale: 1.15, opacity: 0.85, duration: 3.5, ease: "sine.inOut", repeat: -1, yoyo: true });

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
