"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints, MessageCircleMore } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { CityScene } from "@/city/scenes/CityScene";
import type { CityInteractable } from "@/features/types";

type Props = { onObjectSelect: (object: CityInteractable) => void };

const directions = [
  { label: "向上", icon: ArrowUp, x: 0, y: -1, className: "col-start-2 row-start-1" },
  { label: "向左", icon: ArrowLeft, x: -1, y: 0, className: "col-start-1 row-start-2" },
  { label: "向下", icon: ArrowDown, x: 0, y: 1, className: "col-start-2 row-start-2" },
  { label: "向右", icon: ArrowRight, x: 1, y: 0, className: "col-start-3 row-start-2" },
];

export function CityGame({ onObjectSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hovered, setHovered] = useState<CityInteractable | null>(null);
  const [ready, setReady] = useState(false);
  const selectRef = useRef(onObjectSelect);
  selectRef.current = onObjectSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new CityScene({ onObjectClick: (object) => selectRef.current(object), onObjectHover: setHovered, onReady: () => setReady(true) });
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: "#aedbd0",
      scale: { mode: Phaser.Scale.FIT, width: 1280, height: 720, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [scene],
      render: { antialias: true, pixelArt: false, roundPixels: true },
    });
    gameRef.current = game;
    return () => { game.destroy(true); gameRef.current = null; };
  }, []);

  const scene = () => gameRef.current?.scene.getScene("city-scene") as CityScene | undefined;
  const move = (x: number, y: number) => scene()?.setVirtualDirection(x, y);
  const hoverTone = hovered?.kind === "npc" ? "npc" : hovered?.shape || "district";

  return (
    <div className="city-game relative h-full w-full bg-[#aedbd0]">
      <div className="absolute -inset-4 scale-105 bg-[url('/assets/city/v2/creator-courtyard-map.jpg')] bg-cover bg-center opacity-55 blur-md" aria-hidden="true" />
      <div ref={containerRef} className="absolute inset-0" />

      <div className="city-wayfinder pointer-events-none absolute left-3 top-3 z-10 sm:left-5 sm:top-5">
        <div className="city-wayfinder-roof" aria-hidden="true" />
        <div className="city-wayfinder-body">
          <span><Footprints size={16} /></span>
          <p><small>CREATOR COURTYARD</small><strong>方向键 / WASD 移动 · E 进入</strong></p>
        </div>
      </div>

      {hovered && (
        <div className={`city-ribbon city-ribbon-${hoverTone} pointer-events-none absolute bottom-4 left-1/2 z-20 w-[min(88vw,540px)] -translate-x-1/2 sm:bottom-7`}>
          <div className="city-ribbon-roof"><i /><i /><i /><i /><i /></div>
          <div className="city-ribbon-seal">{hovered.kind === "npc" ? "遇" : "游"}</div>
          <div className="city-ribbon-copy">
            <span>{hovered.kind === "npc" ? "CITY ENCOUNTER" : "COURTYARD PLACE"}</span>
            <strong>{hovered.nameCn}</strong>
            <p>{hovered.desc}</p>
          </div>
          <div className="city-ribbon-action"><MessageCircleMore size={16} /><b>{hovered.kind === "npc" ? "点击交谈" : "按 E 进入"}</b></div>
        </div>
      )}

      <div className="city-mobile-pad absolute bottom-4 left-4 z-30 grid grid-cols-3 grid-rows-2 gap-1 sm:hidden">
        {directions.map(({ icon: Icon, ...direction }) => (
          <button key={direction.label} className={`${direction.className} grid h-11 w-11 touch-none place-items-center`} type="button" aria-label={direction.label} title={direction.label} onPointerDown={() => move(direction.x, direction.y)} onPointerUp={() => move(0, 0)} onPointerCancel={() => move(0, 0)} onPointerLeave={() => move(0, 0)}><Icon size={20} /></button>
        ))}
      </div>
      <button className="city-mobile-enter absolute bottom-4 right-4 z-30 sm:hidden" type="button" onClick={() => scene()?.interact()}><span>E</span>进入</button>

      {!ready && <div className="city-loading absolute inset-0 z-40 grid place-items-center"><div><span>京</span><p>正在打开北京创作者院落<small>LOADING CREATOR COURTYARD</small></p></div></div>}
    </div>
  );
}
