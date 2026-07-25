"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Building2, Film, LogOut, MessageCircleMore, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CityFacilityWorkbench } from "@/city/CityFacilityWorkbench";
import { SCENE_OBJECTS } from "@/city/config/sceneObjects";
import { loadProfile } from "@/features/profile";
import { clearSession, loadSession } from "@/features/session";
import type { CityInteractable, SceneObjectDef, SceneObjectId } from "@/features/types";

const CityGame = dynamic(() => import("@/city/CityGame").then((module) => module.CityGame), { ssr: false });

export function CityPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<CityInteractable | null>(null);
  const [activeFacility, setActiveFacility] = useState<SceneObjectDef | null>(null);
  const [name, setName] = useState("Creator");
  const interactionLocked = useRef(false);

  useEffect(() => {
    if (!loadSession()) { router.replace("/"); return; }
    setName(loadProfile()?.name || "Creator");
  }, [router]);

  const signOut = () => { clearSession(); router.push("/"); };

  const facilityFor = (object: CityInteractable): SceneObjectDef | null => {
    if (object.kind === "facility") return object;
    const routeMap: Record<string, SceneObjectId> = {
      "/video": "studio",
      "/intelligence": "bulletin",
      "/skills": "skillgarden",
      "/projects": "hackathon",
      "/creator": "agenthub",
      "/collaboration?zone=hackathon": "hackathon",
      "/collaboration?zone=dev": "table-dev",
      "/collaboration?zone=social": "table-social",
      "/collaboration?zone=agent": "agentroundtable",
    };
    const id = routeMap[object.route];
    return SCENE_OBJECTS.find((facility) => facility.id === id) || null;
  };

  const enterSelected = () => {
    if (!selected) return;
    const facility = facilityFor(selected);
    if (facility) {
      interactionLocked.current = true;
      setActiveFacility(facility);
    }
    setSelected(null);
  };

  const dismissSelected = () => {
    interactionLocked.current = true;
    setSelected(null);
    window.setTimeout(() => { if (!activeFacility) interactionLocked.current = false; }, 120);
  };

  const closeFacility = () => {
    setActiveFacility(null);
    setSelected(null);
    window.setTimeout(() => { interactionLocked.current = false; }, 120);
  };

  const selectObject = (object: CityInteractable) => {
    if (!interactionLocked.current) setSelected(object);
  };

  return (
    <main className="city-page relative h-svh w-screen overflow-hidden bg-[#aedbd0]">
      <CityGame onObjectSelect={selectObject} />
      <nav className="city-nav absolute right-3 top-3 z-20 sm:right-5 sm:top-5" aria-label="城市导航">
        <a href="/video" title="个人影片"><Film size={17} /><span>影片</span></a>
        <a className="city-nav-profile" href="/profile" title="个人主页"><UserRound size={17} /><span>{name}</span></a>
        <button type="button" onClick={signOut} title="退出登录" aria-label="退出登录"><LogOut size={17} /><span>退出</span></button>
      </nav>

      {selected && (
        <div className="city-dialog-backdrop absolute inset-0 z-50 grid place-items-center p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) dismissSelected(); }}>
          <section className={`city-dialog city-dialog-${selected.kind}`} onClick={(event) => event.stopPropagation()}>
            <div className="city-dialog-eaves" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <button className="city-dialog-close" type="button" onClick={dismissSelected} title="关闭" aria-label="关闭"><X size={18} /></button>
            <div className="city-dialog-heading">
              <span className="city-dialog-seal">{selected.kind === "npc" ? <MessageCircleMore size={24} /> : <Building2 size={24} />}</span>
              <div><p>{selected.kind === "npc" ? "京城偶遇 · CITY AGENT" : "院落去处 · DISTRICT ENTRY"}</p><h2>{selected.nameCn}</h2><small>{selected.kind === "npc" ? selected.role : selected.name}</small></div>
            </div>
            <p className="city-dialog-desc">{selected.desc}</p>
            {selected.kind === "npc" && <div className="city-dialog-lines">{selected.dialogue.map((line, index) => <p className={index % 2 ? "reply" : ""} key={line}><span>{index % 2 ? "答" : "问"}</span>{line}</p>)}</div>}
            <div className="city-dialog-actions">
              <button
                className="primary"
                type="button"
                onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); enterSelected(); }}
                onClick={(event) => { if (event.detail === 0) enterSelected(); }}
              ><span>{selected.kind === "npc" ? selected.actionLabel : "进入空间"}</span><ArrowRight size={18} /></button>
              <button type="button" onClick={dismissSelected}>留在院中</button>
            </div>
          </section>
        </div>
      )}

      {activeFacility && <CityFacilityWorkbench facility={activeFacility} onClose={closeFacility} />}
    </main>
  );
}
