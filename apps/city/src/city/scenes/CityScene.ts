import Phaser from "phaser";
import { SCENE_OBJECTS } from "@/city/config/sceneObjects";
import { CONVERSATION_NPCS, PATROL_NPCS, TEA_STEWARD } from "@/city/config/npcs";
import { cityAssets, cityConfig, cityPalette } from "@/city/config/neon";
import type { CityInteractable, CityNpcDef, SceneObjectDef, SceneObjectId } from "@/features/types";

type Callbacks = {
  onObjectClick: (object: CityInteractable) => void;
  onObjectHover: (object: CityInteractable | null) => void;
  onReady?: () => void;
};

type Waypoint = { x: number; y: number };

const facilityVisuals: Record<SceneObjectId, { signY: number; imageScale?: number; imageOffsetY?: number; fontSize?: number }> = {
  studio: { signY: 0.39, imageScale: 0.94, imageOffsetY: 4, fontSize: 12 },
  homepage: { signY: 0.39, imageScale: 0.96, imageOffsetY: 2, fontSize: 16 },
  bulletin: { signY: 0.31, imageScale: 0.96, imageOffsetY: 5, fontSize: 13 },
  leaderboard: { signY: 0.55, imageScale: 0.95, imageOffsetY: 4, fontSize: 13 },
  "table-dev": { signY: 0.47, imageScale: 0.95, imageOffsetY: 5, fontSize: 13 },
  "table-social": { signY: 0.31, imageScale: 0.94, imageOffsetY: 4, fontSize: 11 },
  agentroundtable: { signY: 0.31, imageScale: 0.94, imageOffsetY: 4, fontSize: 11 },
  hackathon: { signY: 0.39, imageScale: 0.94, imageOffsetY: 4, fontSize: 12 },
  agenthub: { signY: 0.22, imageScale: 0.95, imageOffsetY: 7, fontSize: 12 },
  skillgarden: { signY: 0.21, imageScale: 0.95, imageOffsetY: 7, fontSize: 11 },
};

export class CityScene extends Phaser.Scene {
  private readonly callbacks: Callbacks;
  private player?: Phaser.GameObjects.Container;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private virtualDirection = { x: 0, y: 0 };
  private currentObject: SceneObjectDef | null = null;
  private readonly objectCenters = new Map<string, Waypoint>();

  constructor(callbacks: Callbacks) {
    super({ key: "city-scene" });
    this.callbacks = callbacks;
  }

  preload() {
    this.load.image("city-generated-background", cityAssets.background);
    this.load.spritesheet("city-generated-characters", cityAssets.characters, { frameWidth: 128, frameHeight: 128 });
    Object.entries(cityAssets.facilities).forEach(([id, path]) => this.load.image(`city-facility-${id}`, path));
  }

  create() {
    this.cameras.main.setBackgroundColor(cityPalette.sky);
    this.textures.get("city-generated-background").setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get("city-generated-characters").setFilter(Phaser.Textures.FilterMode.NEAREST);
    Object.keys(cityAssets.facilities).forEach((id) => this.textures.get(`city-facility-${id}`).setFilter(Phaser.Textures.FilterMode.LINEAR));
    this.drawWorld();
    SCENE_OBJECTS.forEach((object) => this.createObject(object));
    this.player = this.createPerson(650, 352, 0xd94b3f, "你", true, 0);
    this.createRoamingAgents();
    this.createTeaSteward();
    this.createConversationEncounter();
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keys = keyboard.addKeys("W,A,S,D,E,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    }
    this.callbacks.onReady?.();
  }

  public setVirtualDirection(x: number, y: number) {
    this.virtualDirection = { x, y };
  }

  public interact() {
    if (this.currentObject) this.callbacks.onObjectClick(this.currentObject);
  }

  private drawWorld() {
    if (this.textures.exists("city-generated-background")) {
      this.add.image(cityConfig.worldWidth / 2, cityConfig.worldHeight / 2, "city-generated-background").setDisplaySize(cityConfig.worldWidth, cityConfig.worldHeight).setDepth(-100);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(cityPalette.sky, 1).fillRect(0, 0, cityConfig.worldWidth, 300);
    g.fillStyle(cityPalette.ground, 1).fillRect(0, 250, cityConfig.worldWidth, 470);
    g.fillStyle(cityPalette.wallDark, 1).fillRect(24, 52, 1228, 218);
    g.fillStyle(cityPalette.wall, 1).fillRect(32, 68, 1212, 190);
    g.fillStyle(cityPalette.roof, 1).fillRect(15, 43, 1240, 24);
    g.fillStyle(cityPalette.roofLight, 1).fillRect(25, 38, 1220, 8);
    for (let x = 30; x < 1240; x += 28) {
      g.fillStyle(x % 56 === 30 ? cityPalette.roofLight : cityPalette.roof, 1).fillRect(x, 39, 20, 25);
    }

    g.fillStyle(cityPalette.stoneDark, 1).fillRect(220, 282, 820, 120);
    g.fillStyle(cityPalette.stone, 1).fillRect(228, 290, 804, 104);
    for (let x = 236; x < 1030; x += 52) {
      for (let y = 298; y < 394; y += 34) {
        g.lineStyle(2, cityPalette.stoneDark, 0.6).strokeRect(x, y, 46, 28);
      }
    }
    g.fillStyle(cityPalette.stoneDark, 1).fillRect(620, 392, 60, 328);
    g.fillStyle(cityPalette.stone, 1).fillRect(628, 392, 44, 328);

    this.drawScreenWallTrim(g, 66, 78, 540, 177);
    this.drawLattice(g, 615, 89, 228, 142);
    this.drawTrees(g);
    this.drawStreetDetails(g);

    const title = this.add.text(46, 18, "CREATOR CITY · 北京未来创作者院落", { fontFamily: cityConfig.font, fontSize: "15px", color: "#17241f", fontStyle: "bold" });
    title.setDepth(50);
  }

  private drawScreenWallTrim(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.lineStyle(4, cityPalette.yellow, 1).strokeRect(x, y, w, h);
    g.fillStyle(cityPalette.ink, 1).fillRect(x + w / 2 - 4, y, 8, h);
  }

  private drawLattice(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.fillStyle(cityPalette.paper, 0.92).fillRect(x, y, w, h);
    g.lineStyle(5, cityPalette.ink, 1).strokeRect(x, y, w, h);
    for (let ix = x + 18; ix < x + w; ix += 30) g.lineStyle(3, cityPalette.wallDark, 1).lineBetween(ix, y, ix, y + h);
    for (let iy = y + 18; iy < y + h; iy += 30) g.lineStyle(3, cityPalette.wallDark, 1).lineBetween(x, iy, x + w, iy);
  }

  private drawTrees(g: Phaser.GameObjects.Graphics) {
    const trees = [{ x: 76, y: 350 }, { x: 114, y: 382 }, { x: 1175, y: 330 }, { x: 1215, y: 355 }];
    trees.forEach(({ x, y }, index) => {
      g.fillStyle(cityPalette.woodDark, 1).fillRect(x - 7, y, 14, 62);
      g.fillStyle(index < 2 ? cityPalette.yellow : 0x5f955f, 1);
      g.fillRect(x - 30, y - 38, 60, 44).fillRect(x - 20, y - 58, 40, 30).fillRect(x - 40, y - 22, 26, 28).fillRect(x + 16, y - 22, 26, 28);
    });
  }

  private drawStreetDetails(g: Phaser.GameObjects.Graphics) {
    for (let x = 18; x < 1260; x += 36) {
      g.fillStyle(cityPalette.grassDark, 0.5).fillRect(x, 674 - (x % 72), 5, 8);
    }
    g.fillStyle(cityPalette.ink, 1).fillRect(18, 292, 130, 7);
    g.fillStyle(cityPalette.paper, 1).fillRect(24, 299, 118, 48);
    g.lineStyle(3, cityPalette.ink, 1).strokeRect(24, 299, 118, 48);
  }

  private createObject(object: SceneObjectDef) {
    const cx = object.x + object.w / 2;
    const cy = object.y + object.h / 2;
    this.objectCenters.set(object.id, { x: cx, y: cy });
    const container = this.add.container(cx, cy).setDepth(object.y + object.h * 0.66);
    const visual = facilityVisuals[object.id];
    const imageWidth = Math.round(object.w * (visual.imageScale || 1));
    const imageHeight = Math.round(imageWidth * 2 / 3);
    const imageY = visual.imageOffsetY || 0;
    const textureKey = `city-facility-${object.id}`;
    if (this.textures.exists(textureKey)) {
      container.add(this.add.image(0, imageY, textureKey).setDisplaySize(imageWidth, imageHeight));
    } else {
      const fallback = this.add.rectangle(0, 0, object.w - 12, object.h - 28, object.color, 1).setStrokeStyle(4, cityPalette.ink, 1);
      container.add(fallback);
    }
    this.addFacilitySign(container, object, imageY - imageHeight / 2 + imageHeight * visual.signY, visual.fontSize || 14);
    const hit = this.add.rectangle(cx, cy, object.w, object.h, 0x000000, 0).setInteractive({ useHandCursor: true }).setDepth(30);
    hit.on("pointerover", () => {
      this.callbacks.onObjectHover(object);
      this.tweens.killTweensOf(container);
      this.tweens.add({ targets: container, scaleX: 1.035, scaleY: 1.035, duration: 180, ease: "Sine.easeOut" });
    });
    hit.on("pointerout", () => {
      this.callbacks.onObjectHover(this.currentObject);
      this.tweens.killTweensOf(container);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 180, ease: "Sine.easeOut" });
    });
    hit.on("pointerdown", () => this.callbacks.onObjectClick(object));
  }

  private addFacilitySign(container: Phaser.GameObjects.Container, object: SceneObjectDef, y: number, fontSize: number) {
    const width = Math.min(object.w * 0.78, Math.max(112, object.nameCn.length * fontSize + 30));
    const height = object.id === "homepage" ? 31 : 27;
    const plaque = this.add.graphics();
    plaque.fillStyle(cityPalette.ink, 0.35).fillRect(-width / 2 + 4, y - height / 2 + 5, width, height);
    plaque.fillStyle(0xd8ad55, 1).fillRect(-width / 2 - 4, y - height / 2 + 4, width + 8, height - 8);
    plaque.fillStyle(0x4f211d, 1).fillRect(-width / 2, y - height / 2, width, height);
    plaque.fillStyle(0xa83b31, 1).fillTriangle(-width / 2, y - height / 2, -width / 2 - 10, y, -width / 2, y + height / 2);
    plaque.fillTriangle(width / 2, y - height / 2, width / 2 + 10, y, width / 2, y + height / 2);
    plaque.lineStyle(2, 0xe8c873, 1).strokeRect(-width / 2 + 3, y - height / 2 + 3, width - 6, height - 6);
    const label = this.add.text(0, y - 1, object.nameCn, {
      fontFamily: "'Ma Shan Zheng', 'ZCOOL XiaoWei', 'Microsoft YaHei', cursive",
      fontSize: `${fontSize}px`,
      color: "#ffe9a7",
      stroke: "#24130f",
      strokeThickness: 3,
      shadow: { offsetX: 2, offsetY: 2, color: "#120806", blur: 0, fill: true },
    }).setOrigin(0.5);
    container.add([plaque, label]);
  }

  private drawNewsWall(container: Phaser.GameObjects.Container, object: SceneObjectDef) {
    const g = this.add.graphics();
    g.fillStyle(cityPalette.paper, 1).fillRect(object.x + 8, object.y + 8, object.w - 16, object.h - 35);
    g.lineStyle(5, cityPalette.ink, 1).strokeRect(object.x + 8, object.y + 8, object.w - 16, object.h - 35);
    g.fillStyle(cityPalette.wall, 1).fillRect(object.x + 18, object.y + 18, 52, 18);
    for (let index = 0; index < 4; index++) {
      g.fillStyle(index === 0 ? cityPalette.yellow : 0xcddfd7, 1).fillRect(object.x + 20, object.y + 48 + index * 20, 188 - index * 18, 12);
      g.fillStyle(cityPalette.ink, 0.25).fillRect(object.x + 24, object.y + 52 + index * 20, 120 - index * 12, 3);
    }
    container.add(g);
    container.add(this.add.text(object.x + 78, object.y + 16, "京城 AI 新报", { fontFamily: cityConfig.font, fontSize: "17px", color: "#9f2f29", stroke: "#fff9df", strokeThickness: 2, fontStyle: "bold" }));
  }

  private drawModelWall(container: Phaser.GameObjects.Container, object: SceneObjectDef) {
    const g = this.add.graphics();
    g.fillStyle(cityPalette.ink, 1).fillRect(object.x + 8, object.y + 8, object.w - 16, object.h - 35);
    g.lineStyle(5, cityPalette.yellow, 1).strokeRect(object.x + 8, object.y + 8, object.w - 16, object.h - 35);
    [0.92, 0.83, 0.76, 0.69].forEach((value, index) => {
      g.fillStyle(index === 0 ? cityPalette.yellow : cityPalette.mint, 1).fillRect(object.x + 70, object.y + 42 + index * 20, 120 * value, 9);
    });
    container.add(g);
    container.add(this.add.text(object.x + 20, object.y + 16, "模型擂台", { fontFamily: cityConfig.font, fontSize: "18px", color: "#ffd64f", stroke: "#17241f", strokeThickness: 2, fontStyle: "bold" }));
    container.add(this.add.text(object.x + 20, object.y + 40, "01\n02\n03\n04", { fontFamily: cityConfig.font, fontSize: "10px", lineSpacing: 6, color: "#fff9df" }));
  }

  private drawTable(container: Phaser.GameObjects.Container, object: SceneObjectDef) {
    const cx = object.x + object.w / 2;
    const cy = object.y + 78;
    const g = this.add.graphics();
    g.fillStyle(cityPalette.ink, 0.22).fillEllipse(cx + 6, cy + 42, 154, 46);
    [[cx - 70, cy - 8], [cx + 70, cy - 8], [cx, cy + 70], [cx, cy - 62]].forEach(([x, y]) => {
      g.fillStyle(cityPalette.ink, 1).fillRect(x - 15, y - 10, 30, 28);
      g.fillStyle(object.color, 1).fillRect(x - 11, y - 14, 22, 22);
    });
    g.fillStyle(cityPalette.woodDark, 1).fillEllipse(cx, cy + 12, 142, 72);
    g.fillStyle(cityPalette.wood, 1).fillEllipse(cx, cy, 142, 66);
    g.lineStyle(5, cityPalette.ink, 1).strokeEllipse(cx, cy, 142, 66);
    g.fillStyle(object.accent, 1).fillRect(cx - 16, cy - 11, 32, 22);
    container.add(g);
    container.add(this.add.text(cx, cy - 6, object.id === "table-dev" ? "DEV" : object.id === "table-social" ? "MATCH" : "HACK", { fontFamily: cityConfig.font, fontSize: "10px", color: "#17241f", fontStyle: "bold" }).setOrigin(0.5));
  }

  private drawGarden(container: Phaser.GameObjects.Container, object: SceneObjectDef) {
    const g = this.add.graphics();
    g.fillStyle(cityPalette.woodDark, 1).fillRect(object.x + 14, object.y + 48, object.w - 28, 82);
    g.fillStyle(0x5f955f, 1).fillRect(object.x + 20, object.y + 42, object.w - 40, 74);
    for (let index = 0; index < 8; index++) {
      const x = object.x + 28 + (index % 4) * 32;
      const y = object.y + 55 + Math.floor(index / 4) * 34;
      g.fillStyle(cityPalette.ink, 1).fillRect(x, y + 5, 4, 20);
      g.fillStyle(index % 2 ? cityPalette.yellow : cityPalette.mint, 1).fillRect(x - 6, y, 16, 12);
    }
    container.add(g);
    container.add(this.add.text(object.x + 24, object.y + 18, "SKILL\n花圃", { fontFamily: cityConfig.font, fontSize: "18px", color: "#17241f", stroke: "#fff9df", strokeThickness: 2, fontStyle: "bold" }));
  }

  private drawGate(container: Phaser.GameObjects.Container, object: SceneObjectDef) {
    const g = this.add.graphics();
    g.fillStyle(cityPalette.roof, 1).fillRect(object.x + 10, object.y + 18, object.w - 20, 26);
    g.fillStyle(cityPalette.roofLight, 1).fillRect(object.x, object.y + 12, object.w, 10);
    g.fillStyle(cityPalette.wallDark, 1).fillRect(object.x + 40, object.y + 42, object.w - 80, 118);
    g.fillStyle(cityPalette.wall, 1).fillRect(object.x + 52, object.y + 48, object.w - 104, 112);
    g.fillStyle(cityPalette.ink, 1).fillRect(object.x + 105, object.y + 80, 100, 80);
    g.fillStyle(cityPalette.yellow, 1).fillRect(object.x + 76, object.y + 52, 158, 24);
    container.add(g);
    container.add(this.add.text(object.x + object.w / 2, object.y + 64, "CREATOR STUDIO", { fontFamily: cityConfig.font, fontSize: "10px", color: "#17241f", fontStyle: "bold" }).setOrigin(0.5));
  }

  private drawHackathon(container: Phaser.GameObjects.Container, object: SceneObjectDef) {
    const cx = object.x + object.w / 2;
    const g = this.add.graphics();
    g.fillStyle(cityPalette.roof, 1).fillTriangle(cx, object.y + 12, object.x + 8, object.y + 72, object.x + object.w - 8, object.y + 72);
    g.fillStyle(cityPalette.wall, 1).fillRect(object.x + 24, object.y + 70, object.w - 48, 112);
    g.fillStyle(cityPalette.ink, 1).fillRect(cx - 34, object.y + 112, 68, 70);
    g.fillStyle(cityPalette.yellow, 1).fillRect(object.x + 44, object.y + 82, object.w - 88, 24);
    container.add(g);
    container.add(this.add.text(cx, object.y + 94, "HACKATHON", { fontFamily: cityConfig.font, fontSize: "10px", color: "#17241f", fontStyle: "bold" }).setOrigin(0.5));
  }

  private createPerson(x: number, y: number, color: number, label: string, isPlayer = false, spriteFrame = 0) {
    let body: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite;
    if (this.textures.exists("city-generated-characters")) {
      body = this.add.sprite(0, 2, "city-generated-characters", spriteFrame).setDisplaySize(74, 74);
    } else {
      const g = this.add.graphics();
      g.fillStyle(cityPalette.ink, 1).fillRect(-13, -28, 26, 25).fillRect(-17, -4, 34, 30).fillRect(-12, 26, 9, 18).fillRect(4, 26, 9, 18);
      g.fillStyle(0xf1c7a5, 1).fillRect(-9, -24, 18, 17);
      g.fillStyle(color, 1).fillRect(-12, 0, 24, 21);
      g.fillStyle(cityPalette.ink, 1).fillRect(-5, -18, 3, 3).fillRect(4, -18, 3, 3);
      body = g;
    }
    const name = this.add.text(0, -49, label, { fontFamily: cityConfig.font, fontSize: isPlayer ? "12px" : "10px", color: isPlayer ? "#17241f" : "#fff9df", backgroundColor: isPlayer ? "#ffd64f" : "#236b5b", padding: { x: 5, y: 3 }, stroke: "#17241f", strokeThickness: isPlayer ? 0 : 1, fontStyle: "bold" }).setOrigin(0.5);
    const person = this.add.container(x, y, [body, name]).setDepth(y + 20);
    person.setData("body", body).setData("spriteFrame", spriteFrame);
    return person;
  }

  private setPersonMotion(person: Phaser.GameObjects.Container, moving: boolean, facing?: number, chat = false) {
    const body = person.getData("body") as Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite | undefined;
    if (!body) return;
    const direction = facing || Number(person.getData("facing")) || 1;
    if (facing) person.setData("facing", facing);
    if (body instanceof Phaser.GameObjects.Sprite) {
      body.setFlipX(direction < 0);
      const base = Number(person.getData("spriteFrame")) || 0;
      const row = chat ? 3 : moving ? (Math.floor(this.time.now / 170) % 2 ? 1 : 2) : 0;
      const frame = row * 12 + base;
      if (frame < body.texture.frameTotal) body.setFrame(frame);
    } else {
      body.setScale(direction < 0 ? -1 : 1, 1);
    }
  }

  private makeNpcInteractive(person: Phaser.GameObjects.Container, npc: CityNpcDef) {
    person.setInteractive(new Phaser.Geom.Rectangle(-30, -55, 60, 105), Phaser.Geom.Rectangle.Contains)
      .on("pointerover", () => this.callbacks.onObjectHover(npc))
      .on("pointerout", () => this.callbacks.onObjectHover(this.currentObject))
      .on("pointerdown", () => this.callbacks.onObjectClick(npc));
  }

  private createRoamingAgents() {
    PATROL_NPCS.forEach((npc, index) => {
      const person = this.createPerson(npc.points[0].x, npc.points[0].y, npc.color, npc.nameCn, false, npc.spriteFrame);
      this.makeNpcInteractive(person, npc);
      this.patrol(person, npc.points, index % npc.points.length);
    });
  }

  private patrol(person: Phaser.GameObjects.Container, points: Waypoint[], index: number) {
    const nextIndex = (index + 1) % points.length;
    const next = points[nextIndex];
    const facing = next.x < person.x ? -1 : 1;
    this.setPersonMotion(person, true, facing);
    this.tweens.add({ targets: person, x: next.x, y: next.y, duration: 2800 + nextIndex * 280, ease: "Linear", onUpdate: () => { this.setPersonMotion(person, true, facing); person.setDepth(person.y + 20); }, onComplete: () => { this.setPersonMotion(person, false, facing); this.time.delayedCall(550, () => this.patrol(person, points, nextIndex)); } });
  }

  private createTeaSteward() {
    const route = TEA_STEWARD.points;
    const person = this.createPerson(route[0].x, route[0].y, TEA_STEWARD.color, TEA_STEWARD.nameCn, false, TEA_STEWARD.spriteFrame);
    this.makeNpcInteractive(person, TEA_STEWARD);
    if (!this.textures.exists("city-generated-characters")) person.add(this.add.graphics().fillStyle(0xcaa63e, 1).fillRect(13, 2, 13, 15).fillRect(24, 7, 8, 5));
    const bubble = this.add.text(0, -74, "添茶中…", { fontFamily: cityConfig.font, fontSize: "10px", color: "#17241f", backgroundColor: "#fff9df", padding: { x: 6, y: 4 }, stroke: "#ffffff", strokeThickness: 1, fontStyle: "bold" }).setOrigin(0.5).setAlpha(0);
    person.add(bubble);
    this.serveTea(person, bubble, route, 0);
  }

  private serveTea(person: Phaser.GameObjects.Container, bubble: Phaser.GameObjects.Text, route: Waypoint[], index: number) {
    const nextIndex = (index + 1) % route.length;
    const next = route[nextIndex];
    const facing = next.x < person.x ? -1 : 1;
    this.setPersonMotion(person, true, facing);
    this.tweens.add({ targets: person, x: next.x, y: next.y, duration: 2500, ease: "Linear", onUpdate: () => { this.setPersonMotion(person, true, facing); person.setDepth(person.y + 24); }, onComplete: () => {
      this.setPersonMotion(person, false, facing);
      bubble.setText(nextIndex === 3 ? "换一壶茉莉花茶" : "给这桌添茶").setAlpha(1);
      this.time.delayedCall(nextIndex === 3 ? 900 : 1400, () => { bubble.setAlpha(0); this.serveTea(person, bubble, route, nextIndex); });
    } });
  }

  private createConversationEncounter() {
    const [leftNpc, rightNpc] = CONVERSATION_NPCS;
    if (!leftNpc || !rightNpc) return;
    const left = this.createPerson(leftNpc.points[0].x, leftNpc.points[0].y, leftNpc.color, leftNpc.nameCn, false, leftNpc.spriteFrame);
    const right = this.createPerson(rightNpc.points[0].x, rightNpc.points[0].y, rightNpc.color, rightNpc.nameCn, false, rightNpc.spriteFrame);
    this.makeNpcInteractive(left, leftNpc);
    this.makeNpcInteractive(right, rightNpc);
    const leftBubble = this.add.text(-62, -82, "", { fontFamily: cityConfig.font, fontSize: "10px", color: "#17241f", backgroundColor: "#fff9df", padding: { x: 7, y: 5 }, stroke: "#ffffff", strokeThickness: 1, wordWrap: { width: 170 }, align: "center" }).setOrigin(1, 1).setAlpha(0);
    const rightBubble = this.add.text(62, -82, "", { fontFamily: cityConfig.font, fontSize: "10px", color: "#fff9df", backgroundColor: "#236b5b", padding: { x: 7, y: 5 }, wordWrap: { width: 170 }, align: "center" }).setOrigin(0, 1).setAlpha(0);
    left.add(leftBubble); right.add(rightBubble);
    this.runConversationCycle(left, right, leftNpc, rightNpc, leftBubble, rightBubble);
  }

  private runConversationCycle(left: Phaser.GameObjects.Container, right: Phaser.GameObjects.Container, leftNpc: CityNpcDef, rightNpc: CityNpcDef, leftBubble: Phaser.GameObjects.Text, rightBubble: Phaser.GameObjects.Text) {
    let arrived = 0;
    const onArrive = () => { arrived += 1; if (arrived === 2) this.playConversation(left, right, leftNpc, rightNpc, leftBubble, rightBubble, 0); };
    const move = (person: Phaser.GameObjects.Container, target: Waypoint, facing: number) => {
      this.setPersonMotion(person, true, facing);
      this.tweens.add({ targets: person, x: target.x, y: target.y, duration: 3400, ease: "Sine.easeInOut", onUpdate: () => { this.setPersonMotion(person, true, facing); person.setDepth(person.y + 22); }, onComplete: () => { this.setPersonMotion(person, false, facing); onArrive(); } });
    };
    move(left, leftNpc.points[1], 1);
    move(right, rightNpc.points[1], -1);
  }

  private playConversation(left: Phaser.GameObjects.Container, right: Phaser.GameObjects.Container, leftNpc: CityNpcDef, rightNpc: CityNpcDef, leftBubble: Phaser.GameObjects.Text, rightBubble: Phaser.GameObjects.Text, step: number) {
    const lines = [leftNpc.dialogue[0], rightNpc.dialogue[0], leftNpc.dialogue[1], rightNpc.dialogue[1]];
    if (step >= lines.length) {
      leftBubble.setAlpha(0); rightBubble.setAlpha(0);
      this.time.delayedCall(1000, () => {
        let departed = 0;
        const onDepart = () => { departed += 1; if (departed === 2) this.time.delayedCall(1600, () => this.runConversationCycle(left, right, leftNpc, rightNpc, leftBubble, rightBubble)); };
        [[left, leftNpc.points[0], -1], [right, rightNpc.points[0], 1]].forEach(([person, target, facing]) => {
          const actor = person as Phaser.GameObjects.Container; const point = target as Waypoint; const direction = facing as number;
          this.setPersonMotion(actor, true, direction);
          this.tweens.add({ targets: actor, x: point.x, y: point.y, duration: 3000, ease: "Sine.easeInOut", onUpdate: () => this.setPersonMotion(actor, true, direction), onComplete: () => { this.setPersonMotion(actor, false, direction); onDepart(); } });
        });
      });
      return;
    }
    const leftSpeaking = step % 2 === 0;
    if (leftSpeaking) {
      leftBubble.setText(lines[step]).setAlpha(1);
      rightBubble.setAlpha(0);
    } else {
      rightBubble.setText(lines[step]).setAlpha(1);
      leftBubble.setAlpha(0);
    }
    this.setPersonMotion(left, false, 1, leftSpeaking);
    this.setPersonMotion(right, false, -1, !leftSpeaking);
    this.time.delayedCall(1900, () => this.playConversation(left, right, leftNpc, rightNpc, leftBubble, rightBubble, step + 1));
  }

  update(_time: number, delta: number) {
    if (!this.player) return;
    const keyX = (this.cursors?.right.isDown || this.keys?.D.isDown ? 1 : 0) - (this.cursors?.left.isDown || this.keys?.A.isDown ? 1 : 0);
    const keyY = (this.cursors?.down.isDown || this.keys?.S.isDown ? 1 : 0) - (this.cursors?.up.isDown || this.keys?.W.isDown ? 1 : 0);
    const dx = keyX || this.virtualDirection.x;
    const dy = keyY || this.virtualDirection.y;
    if (dx || dy) {
      const length = Math.hypot(dx, dy) || 1;
      const speed = (delta / 1000) * 145;
      this.player.x = Phaser.Math.Clamp(this.player.x + (dx / length) * speed, 34, 1246);
      this.player.y = Phaser.Math.Clamp(this.player.y + (dy / length) * speed, 286, 684);
      this.setPersonMotion(this.player, true, dx < 0 ? -1 : 1);
      this.player.setDepth(this.player.y + 30);
    } else this.setPersonMotion(this.player, false);
    let nearest: SceneObjectDef | null = null;
    let nearestDistance = 145;
    SCENE_OBJECTS.forEach((object) => {
      const center = this.objectCenters.get(object.id);
      if (!center) return;
      const distance = Math.hypot(this.player!.x - center.x, this.player!.y - center.y);
      if (distance < nearestDistance) { nearest = object; nearestDistance = distance; }
    });
    if (nearest !== this.currentObject) {
      this.currentObject = nearest;
      this.callbacks.onObjectHover(nearest);
    }
    if (this.keys && (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE))) this.interact();
  }
}
