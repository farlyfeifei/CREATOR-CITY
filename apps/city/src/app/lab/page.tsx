"use client";
import { mentorRecommendations } from "@/data/mockData";

export default function MentorPage() {
  return (
    <div className="min-h-screen bg-[#0d0a10] text-zinc-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-200">AI Mentor</h1>
          <p className="text-xs text-zinc-500">Growth system - not a chatbot</p>
        </div>
        <a href="/city/neon" className="text-xs text-zinc-500 hover:text-amber-200 transition-colors">&larr; Back to City</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Tree (left) */}
        <div>
          <h2 className="text-lg font-bold text-amber-200 mb-3">Current Capabilities</h2>
          <div className="space-y-2">
            {mentorRecommendations.map(r => (
              <div key={r.skill} className="border border-amber-700/30 bg-[#1a1520] rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold">{r.skill}</span>
                  <span className="text-xs text-zinc-500">{r.currentLevel} / {r.targetLevel}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-amber-500" style={{width: r.currentLevel + "%"}} />
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500/50" style={{width: r.targetLevel + "%"}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Roadmap (right) */}
        <div>
          <h2 className="text-lg font-bold text-amber-200 mb-3">Growth Roadmap</h2>
          <div className="space-y-3">
            {mentorRecommendations.map((r, i) => (
              <div key={r.skill} className="border border-amber-700/30 bg-[#1a1520] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-700/40 flex items-center justify-center text-xs font-bold text-amber-200">{i+1}</span>
                  <span className="text-sm font-bold">{r.skill}</span>
                </div>
                <p className="text-xs text-zinc-400 mb-2">{r.reason}</p>
                <div className="flex gap-1 flex-wrap">
                  {r.resources.map(res => (
                    <span key={res} className="text-xs px-2 py-1 bg-amber-900/20 text-amber-400/70 rounded">{res}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
