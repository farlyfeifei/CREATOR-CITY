"use client";

import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const revealSelector = "[data-reveal]:not([data-motion-ready])";

export function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.classList.toggle("motion-reduced", reduced);

    const constrainedBrowser = /Codex|Electron/i.test(navigator.userAgent);
    if (reduced || constrainedBrowser || pathname.startsWith("/city")) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
        node.dataset.motionReady = "true";
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.08, smoothWheel: true, wheelMultiplier: 0.9 });
    const progress = document.querySelector<HTMLElement>(".motion-scroll-progress");
    const update = (event?: { progress?: number }) => {
      ScrollTrigger.update();
      if (progress) progress.style.transform = `scaleX(${event?.progress ?? 0})`;
    };
    const raf = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const animations: gsap.core.Tween[] = [];
    const mountReveals = () => {
      document.querySelectorAll<HTMLElement>(revealSelector).forEach((node) => {
        node.dataset.motionReady = "true";
        const distance = Number(node.dataset.revealDistance || 46);
        const delay = Number(node.dataset.revealDelay || 0);
        const tween = gsap.fromTo(
          node,
          { autoAlpha: 0, y: distance, filter: "blur(12px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.05,
            delay,
            ease: "power4.out",
            scrollTrigger: { trigger: node, start: "top 91%", once: true },
          },
        );
        animations.push(tween);
      });
    };

    const mountSplits = () => {
      document.querySelectorAll<HTMLElement>("[data-split]:not([data-split-ready])").forEach((node) => {
        node.dataset.splitReady = "true";
        const letters = node.querySelectorAll<HTMLElement>("[data-letter]");
        if (!letters.length) return;
        gsap.fromTo(
          letters,
          { yPercent: 125, rotate: 5, opacity: 0 },
          { yPercent: 0, rotate: 0, opacity: 1, duration: 1.15, stagger: 0.035, ease: "power4.out", delay: 0.15 },
        );
      });
    };

    mountReveals();
    mountSplits();
    let refreshFrame = 0;
    const observer = new MutationObserver(() => {
      mountReveals();
      mountSplits();
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const observerTimer = window.setTimeout(() => observer.disconnect(), 1800);

    return () => {
      window.clearTimeout(observerTimer);
      window.cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      animations.forEach((animation) => animation.kill());
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      gsap.ticker.remove(raf);
      lenis.off("scroll", update);
      lenis.destroy();
    };
  }, [pathname]);

  return <div className="motion-scroll-progress" aria-hidden="true" />;
}
