export const cityPalette = {
  ink: 0x17241f,
  paper: 0xfff9df,
  sky: 0xaedbd0,
  ground: 0x7cab76,
  grassDark: 0x4d7b55,
  stone: 0xc4c5b8,
  stoneDark: 0x8c918b,
  wall: 0xd94b3f,
  wallDark: 0xa9322b,
  roof: 0x4a514e,
  roofLight: 0x747d78,
  jade: 0x236b5b,
  mint: 0x42c8c4,
  yellow: 0xffd64f,
  wood: 0x9b693f,
  woodDark: 0x65462f,
  blue: 0x4b86d1,
  purple: 0x7256a8,
} as const;

export const cityCss = { ink: "#17241f", paper: "#fff9df", jade: "#236b5b", red: "#d94b3f", yellow: "#ffd64f" } as const;
export const cityConfig = { worldWidth: 1280, worldHeight: 720, font: "'ZCOOL XiaoWei', 'Microsoft YaHei', serif" } as const;

export const cityAssets = {
  background: "/assets/city/v2/creator-courtyard-map.jpg",
  characters: "/assets/city/character-atlas.png",
  facilities: {
    studio: "/assets/city/v2/profile-studio-optimized.png",
    homepage: "/assets/city/v2/profile-studio-optimized.png",
    bulletin: "/assets/city/v2/intelligence-academy.webp",
    leaderboard: "/assets/city/v2/model-observatory.webp",
    "table-dev": "/assets/city/v2/dev-test-workshop.webp",
    "table-social": "/assets/city/v2/creator-teahouse.webp",
    agentroundtable: "/assets/city/v2/agent-roundtable.webp",
    hackathon: "/assets/city/v2/hackathon-hall.webp",
    agenthub: "/assets/city/v2/creator-gallery.webp",
    skillgarden: "/assets/city/v2/skill-market.webp",
  },
} as const;
