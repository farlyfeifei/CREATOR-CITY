"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

type Props = {
  active: boolean;
  onComplete: () => void;
};

const dust = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${7 + ((index * 37) % 88)}%`,
  top: `${18 + ((index * 53) % 66)}%`,
  delay: (index % 7) * 0.12,
  size: 2 + (index % 3),
}));

function CarvedDoor({ side, reduced }: { side: "left" | "right"; reduced: boolean | null }) {
  const opened = side === "left" ? -106 : 106;
  return (
    <motion.div
      className={`cinematic-door cinematic-door-${side}`}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: reduced ? opened : [0, 0, opened] }}
      transition={reduced ? { duration: 0.12 } : { duration: 2.3, times: [0, 0.33, 1], ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="cinematic-door-wood" />
      <div className="cinematic-door-lattice" />
      <div className="cinematic-door-studs" aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <i key={index} />)}</div>
      <div className={`cinematic-door-handle cinematic-door-handle-${side}`} />
    </motion.div>
  );
}

export function GateEntrance({ active, onComplete }: Props) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(onComplete, reduced ? 220 : 3500);
    return () => window.clearTimeout(timer);
  }, [active, onComplete, reduced]);

  if (!active) return null;

  return (
    <motion.div className="gate-entrance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0.05 : 0.22 }} aria-label="正在穿过北京创作者院落">
      <motion.div
        className="gate-scene"
        initial={{ scale: 1.035, y: "0%" }}
        animate={reduced ? { scale: 1.1 } : { scale: [1.035, 1.08, 1.22, 3.75], y: ["0%", "0%", "2%", "16%"] }}
        transition={reduced ? { duration: 0.15 } : { duration: 3.5, times: [0, 0.24, 0.63, 1], ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="gate-courtyard-image" />
        <motion.div className="gate-depth-shade" animate={reduced ? { opacity: 0 } : { opacity: [0.56, 0.38, 0.15, 0] }} transition={{ duration: 3.1, times: [0, 0.35, 0.72, 1] }} />
        <motion.div className="gate-portal-glow" initial={{ opacity: 0, scale: .65 }} animate={reduced ? { opacity: 1 } : { opacity: [0, .08, .65, 1], scale: [.65, .75, 1.15, 2.6] }} transition={{ duration: 3.25, times: [0, .36, .73, 1], ease: "easeIn" }} />
        <div className="gate-architecture-lines" aria-hidden="true"><i /><i /><i /></div>
        <div className="gate-portal">
          <div className="gate-plaque"><small>京城创作者会馆</small><strong>CREATOR CITY</strong></div>
          <CarvedDoor side="left" reduced={reduced} />
          <CarvedDoor side="right" reduced={reduced} />
        </div>
        <motion.div className="gate-lantern gate-lantern-left" initial={{ opacity: 0, y: -12 }} animate={{ opacity: [0, 1, 1], y: [-12, 0, 3], rotate: [-2, 2, -1] }} transition={{ duration: 2.8, ease: "easeOut" }}><i /><span>创</span></motion.div>
        <motion.div className="gate-lantern gate-lantern-right" initial={{ opacity: 0, y: -12 }} animate={{ opacity: [0, 1, 1], y: [-12, 0, 3], rotate: [2, -2, 1] }} transition={{ duration: 2.8, ease: "easeOut" }}><i /><span>城</span></motion.div>
      </motion.div>

      <motion.div className="gate-title-sequence" style={{ x: "-50%" }} initial={{ opacity: 0, y: 16 }} animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 1, 0], y: [16, 0, 0, -12] }} transition={{ duration: reduced ? .16 : 2.25, times: [0, .15, .68, 1] }}>
        <span>BEIJING · CREATOR PROFILE STUDIO</span>
        <strong>推门，开始编排你的作品叙事</strong>
        <em>京作新声</em>
      </motion.div>

      <div className="gate-dust" aria-hidden="true">{dust.map((item) => <motion.i key={item.id} style={{ left: item.left, top: item.top, width: item.size, height: item.size }} initial={{ opacity: 0, y: 16 }} animate={reduced ? { opacity: 0 } : { opacity: [0, .7, 0], y: [16, -18, -54] }} transition={{ duration: 2.2, delay: .65 + item.delay, repeat: 1, ease: "easeOut" }} />)}</div>
      <div className="gate-film-grain" />
      <div className="gate-vignette" />
      <motion.div className="gate-focus" initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={reduced ? { opacity: 1 } : { opacity: [0, 0, .92], backdropFilter: ["blur(0px)", "blur(0px)", "blur(24px)"] }} transition={reduced ? { duration: .1 } : { duration: 3.5, times: [0, .79, 1], ease: "easeIn" }} />
      <motion.div className="gate-status" initial={{ opacity: 0 }} animate={reduced ? { opacity: 1 } : { opacity: [0, 0, 1, 0] }} transition={{ duration: reduced ? .16 : 3.35, times: [0, .48, .65, 1] }}><span />正在进入导演工作台</motion.div>
    </motion.div>
  );
}
