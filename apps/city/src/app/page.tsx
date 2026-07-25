"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Film, LockKeyhole, Map, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GateEntrance } from "@/components/GateEntrance";
import { LightRays } from "@/components/motion/LightRays";
import { SplitRevealText } from "@/components/motion/SplitRevealText";
import { createSession, loadSession } from "@/features/session";

const chapters = [
  { icon: Sparkles, label: "导入创作档案", meta: "GitHub / 简历 / 论文" },
  { icon: Film, label: "生成个人影片", meta: "Motion + 实机素材" },
  { icon: Map, label: "进入城市漫游", meta: "北京创作者院落" },
];

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("creator@city.ai");
  const [password, setPassword] = useState("creator2026");
  const [error, setError] = useState("");
  const [entering, setEntering] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    router.prefetch("/city/neon");
    const session = loadSession();
    if (session) router.replace("/city/neon");
    else setReady(true);
  }, [router]);

  const signIn = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@") || password.length < 4) {
      setError("请输入有效邮箱，密码至少 4 位");
      return;
    }
    createSession(email.trim());
    sessionStorage.setItem("creator-city-arrival", "gate");
    setEntering(true);
  };

  const finishEntrance = useCallback(() => router.push("/city/neon"), [router]);

  if (!ready) return <main className="min-h-screen bg-[#08100e]" />;

  return (
    <main className="login-cinematic">
      <motion.div
        className={`login-cinematic-scene ${entering ? "pointer-events-none" : ""}`}
        animate={entering ? { opacity: 0, scale: reduced ? 1 : 1.06, filter: reduced ? "blur(0px)" : "blur(14px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: reduced ? 0.08 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-courtyard" aria-hidden="true" />
        <div className="login-depth" aria-hidden="true" />
        <LightRays className="login-light-rays" tone="gold" />
        <div className="login-film-line" aria-hidden="true" />

        <header className="login-nav">
          <a className="login-brand" href="#top" aria-label="Creator City 首页">
            <span>创</span>
            <span><strong>CREATOR CITY</strong><small>北京 AI 创作者之城</small></span>
          </a>
          <div className="login-nav-signal"><i />LIVE PROTOTYPE · 2026</div>
        </header>

        <section className="login-stage" id="top">
          <div className="login-story">
            <p className="login-eyebrow" data-reveal>REMOTION PROFILE × CREATOR COMMUNITY</p>
            <h1><SplitRevealText text="让作品开口，" /><br /><SplitRevealText className="login-title-accent" text="让同路人出现。" /></h1>
            <p className="login-lead" data-reveal data-reveal-delay="0.22">
              你的 GitHub、简历、论文与实机录像，会被编排成一支有节奏的个人影片。影片结束，镜头继续向前，走入一座会发生相遇的北京院落。
            </p>
            <div className="login-chapters" data-reveal data-reveal-delay="0.32">
              {chapters.map(({ icon: Icon, label, meta }, index) => (
                <div key={label}>
                  <span><Icon size={17} /></span>
                  <p><small>0{index + 1}</small><strong>{label}</strong><em>{meta}</em></p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={signIn} className="login-console" data-reveal data-reveal-distance="70" data-reveal-delay="0.16">
            <div className="login-console-top"><span>CITY GATE / 身份验证</span><i /><i /><i /></div>
            <div className="login-console-body">
              <span className="login-seal"><LockKeyhole size={22} /></span>
              <p className="login-console-kicker">京城创作者会馆</p>
              <h2>持创作者身份入城</h2>
              <p className="login-console-copy">首版使用本地演示登录。凭证只留在当前浏览器，不会上传密码。</p>
              <label htmlFor="email">邮箱 / EMAIL</label>
              <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              <label htmlFor="password">口令 / PASSWORD</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              {error && <p className="login-error">{error}</p>}
              <button type="submit" disabled={entering}>
                <span>{entering ? "正在开启城门" : "推门进入创作者之城"}</span><ArrowRight size={18} />
              </button>
              <div className="login-console-foot"><span /><small>DEMO ACCOUNT READY</small><span /></div>
            </div>
          </form>
        </section>

        <div className="login-scroll-cue" aria-hidden="true"><span>一份档案，一支影片，一座城</span><i /></div>
      </motion.div>
      <AnimatePresence>{entering && <GateEntrance active onComplete={finishEntrance} />}</AnimatePresence>
    </main>
  );
}
