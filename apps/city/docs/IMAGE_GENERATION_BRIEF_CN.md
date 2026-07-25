# Creator City 模块化生图指令

这份指令按功能模块生成，不要求逐个物件单独生图。所有文件名和切片顺序已经与代码固定，生成后放入对应目录即可。City 资产缺失时会自动使用程序化回退；Remotion 背景缺失时会使用纯色编辑部式回退。

## 统一视觉基准

- City：高细节 32-bit 像素画，不是低分辨率方块草图。以 2px 为基础像素单位，硬边、清晰轮廓、丰富材质与环境叙事，禁止模糊伪像素、3D 渲染、照片滤镜、霓虹赛博朋克。
- 北京语汇：灰瓦红墙、影壁、砖雕、什锦窗、石榴树、银杏、竹帘、白瓷盖碗、茉莉花茶、胡同门牌、现代创客设备。避免把场景做成宫殿、旅游纪念品或古装影视城。
- 时代感：当代北京创作者社区，传统院落经过克制的现代改造；电子屏、公告墙和工作桌真实可用。
- 色彩：朱砂红、松石绿、灰瓦、暖白、银杏黄、少量靛蓝。全套色板必须一致，阴影方向统一为右下。
- 所有输出：无品牌 Logo、无水印、无随机英文、无乱码、无额外边框。

## 模块 A：北京创作者院落完整背景

输出文件：`public/assets/city/beijing-courtyard.png`

画布：精确 `1280 × 720`，16:9，PNG，不透明背景。

直接复制以下完整指令：

```text
Use case: stylized-concept
Asset type: full-screen 2D game environment background for a browser game
Primary request: Create one exceptionally detailed, production-ready 32-bit pixel-art Beijing creator courtyard, viewed in a readable three-quarter top-down game perspective. This is a contemporary AI creator community built inside a renovated Beijing siheyuan, not a historical palace.
Scene/backdrop: grey tiled roofs and vermilion courtyard walls across the upper third; carved brick shadow wall, moon gate details, dark timber lattice windows, narrow hutong glimpses, stone paving, gingko and pomegranate trees, bamboo blinds, warm practical lanterns, subtle modern conduits and small maker-studio details. The lower two-thirds is a walkable courtyard with clear stone paths and patches of restrained greenery.
Layout contract: exact 1280x720 canvas. Keep the upper wall readable from y=45 to y=275. Preserve empty installation zones at x=82 y=92 w=240 h=152, x=350 y=92 w=240 h=152, and x=875 y=72 w=310 h=190. Preserve lower interactive zones at x=45 y=425 w=170 h=205, x=245 y=420 w=220 h=195, x=515 y=420 w=220 h=195, x=785 y=420 w=220 h=195, and x=1040 y=392 w=190 h=230. These zones may contain grounding shadows and paving but no large objects.
Style/medium: authentic hand-authored 32-bit pixel art, 2px base pixel unit, crisp hard edges, rich material clusters, controlled dithering, readable silhouettes, professional game-environment quality. No blurry anti-aliased pseudo-pixel art.
Composition/framing: fixed game camera, no perspective distortion at edges, paths visibly connect the central entry to all installation zones, enough contrast for small walking characters.
Lighting/mood: clear late-autumn Beijing afternoon, warm directional sunlight from upper left, cool grey shadows, lively and intelligent rather than nostalgic.
Color palette: Beijing vermilion, charcoal roof grey, warm limestone, muted jade, gingko yellow, small indigo accents. Balanced multi-color palette, no neon domination.
Constraints: background only; no people; no tables; no bulletin boards; no model screen; no large signs; no legible text. Leave interactive zones open exactly as specified. No watermark.
Avoid: palace scale, Forbidden City motifs, cyberpunk neon, generic Japanese village, Stardew Valley copying, isometric toy diorama, smooth vector art, 3D render, blur, fog, dark night scene.
```

验收重点：每个预留区域都应为空，中央道路从上方延伸到下方三桌区域，人物走在 `y=286–684` 时不会被背景中的大物件遮住。

## 模块 B：八设施透明图集，含艺术字

输出文件：`public/assets/city/facility-atlas.png`

画布：精确 `1024 × 384`，PNG 透明背景；严格 `4 列 × 2 行`，每格 `256 × 192`。如果生成器不能原生透明，背景使用完全均匀的 `#00ff00`，随后去背。

代码按从左到右、从上到下读取 8 格，顺序不能改变：

| 帧 | 位置 | 设施 | 画面内艺术字 |
|---|---|---|---|
| 0 | 第 1 行第 1 格 | 木框 AI 公告墙 | `京城 AI 新报` |
| 1 | 第 1 行第 2 格 | 模型能力电子榜 | `模型擂台` |
| 2 | 第 1 行第 3 格 | Skill 花圃与工具架 | `SKILL 花圃` |
| 3 | 第 1 行第 4 格 | 黑客松圆桌 | `黑客松` |
| 4 | 第 2 行第 1 格 | 开发测试圆桌 | `开发测试` |
| 5 | 第 2 行第 2 格 | 交友圆桌 | `创作者茶会` |
| 6 | 第 2 行第 3 格 | 黑客松小会馆 | `黑客松会馆` |
| 7 | 第 2 行第 4 格 | 个人创作者展厅门楼 | `创作者展厅` |

直接复制以下完整指令：

```text
Use case: stylized-concept
Asset type: transparent pixel-art facility sprite atlas for a browser game
Primary request: Generate a single coherent atlas containing exactly eight highly detailed Beijing creator-community facilities. Use one shared art direction, one shared light direction and one shared scale. Strict 4-column by 2-row grid, exact 1024x384 canvas, each cell exactly 256x192, no gutters crossing cell boundaries.
Cell contents in reading order: 1) carved dark-wood bulletin wall covered with layered paper notes, red seals, tiny technology diagrams and the large hand-lettered Chinese title “京城 AI 新报”; 2) brass-framed modern model ranking screen set into grey brick with the large title “模型擂台”, small abstract ranking bars but no other readable copy; 3) lush raised Skill garden with tool drawers, labelled seed packets, small robotic watering arm and the title “SKILL 花圃”; 4) round hackathon table with four stools, laptops, sticky notes, tea cups and the title “黑客松”; 5) round development and testing table with monitors, bug cards, a small red reward envelope and the title “开发测试”; 6) round social creator tea table with white porcelain gaiwan, profile cards and the title “创作者茶会”; 7) compact Beijing courtyard hackathon pavilion with grey eaves, red columns, maker banners and the title “黑客松会馆”; 8) renovated studio gate with dark lattice door, warm interior screens and the title “创作者展厅”.
Typography: Chinese titles must be verbatim, large, legible, expressive hand-painted Beijing shop-sign lettering; cream or gold characters with dark outline; no extra characters; no garbled text. Keep title treatment integrated into each object.
Style/medium: professional 32-bit pixel art, crisp 2px pixel clusters, rich wood grain, brick, brass, paper, porcelain and screen reflections, hard edges, controlled highlights, no smooth gradients.
Composition/framing: one centered object per cell, entire object visible, generous transparent padding, consistent ground baseline, view matches a three-quarter top-down game camera. No object may touch or leak into a neighbouring cell.
Lighting/mood: warm sunlight from upper left, compact right-down cast shadows contained within each cell.
Background: perfectly transparent. If transparency is unavailable, use one perfectly flat solid #00ff00 background with no texture, no floor, no gradient and no green inside objects.
Constraints: exactly eight objects, exact cell order, no people, no watermark, no logo, no random text. Titles are the only readable text.
Avoid: photorealism, vector UI, 3D toy render, Japanese architecture, palace decoration, neon cyberpunk, blurry edges, inconsistent scale, overlapping grid cells.
```

如果中文文字生成不稳定：保留牌匾留白，不要接受乱码版本。运行时仍会用本地 `ZCOOL XiaoWei` 艺术字体在设施下方叠加正确名称。

## 模块 C：十二角色四动作透明图集

输出文件：`public/assets/city/character-atlas.png`

画布：精确 `1536 × 512`，PNG 透明背景；严格 `12 列 × 4 行`，每格 `128 × 128`。四行分别是：站立、走路 A、走路 B、交谈。每列必须是同一个角色且身份一致。

列顺序：玩家、研究 Agent、工程 Agent、设计 Agent、产品 Agent、开源 Agent、论文 Agent、Skill Agent、茶务小满、架构 Agent 阿衡、洞察 Agent 若谷、访客角色。

直接复制以下完整指令：

```text
Use case: stylized-concept
Asset type: transparent 32-bit pixel-art character animation atlas
Primary request: Create exactly twelve distinct full-body contemporary Beijing creator-community characters in a strict 12-column by 4-row sprite atlas. Exact canvas 1536x512; each frame exactly 128x128. Each column is one persistent character. Row 1 idle standing, row 2 walking pose A, row 3 walking pose B, row 4 conversational gesture. Identity, outfit, hair, accessories, scale and palette must stay invariant across all four rows.
Characters by column: 1) user/player in a restrained vermilion modern jacket; 2) research agent with indigo overshirt, glasses and a small paper tablet; 3) engineering agent in dark jade utility jacket with compact tool pouch; 4) design agent in berry-red contemporary coat carrying a color notebook; 5) product agent in warm ochre jacket with cards; 6) open-source agent in muted violet hoodie under a Beijing-style work vest; 7) paper agent in blue-grey cardigan carrying annotated papers; 8) Skill agent in leafy green field jacket with a tiny modular device; 9) tea steward Xiaoman in modern cream changshan-inspired workwear carrying a brass teapot and white porcelain cup; 10) architecture agent Aheng in teal technical coat with rolled blueprint; 11) insight agent Ruogu in brick-red coat with research cards; 12) neutral visiting creator in charcoal and yellow.
Beijing details: subtle frog-button, stand-collar, woven cloth, hutong maker-studio workwear and practical winter layers. Contemporary clothing only; no full historical costumes, no imperial hats.
Style/medium: premium 32-bit pixel character art, crisp 2px base pixel unit, expressive readable faces, detailed fabric and accessories, dark but not heavy outline, consistent anatomy and 52-60 pixel character height within each 128 frame.
Composition/framing: one character centered in every cell, full body and feet visible, same ground baseline, at least 20px clear padding, facing mostly front-right; walking rows show clear opposite leg and arm positions; conversation row shows an open-hand or pointing gesture.
Background: perfectly transparent. If unavailable, use perfectly flat #00ff00 with no shadow, texture, floor, reflection or green pixels in subjects.
Constraints: exact 12x4 grid; no labels; no text; no speech bubbles; no cast shadows; no cell separators in final file; no character crosses cell boundaries; no watermark.
Avoid: chibi giant heads, anime style, Stardew Valley imitation, medieval fantasy, Japanese school uniforms, smooth vector art, 3D render, blurry antialiasing, inconsistent character between rows.
```

## 模块 D：Remotion 七场景电影背景系列

这是一个“系列生成”模块，一次提交同一套指令，要求模型返回七张统一视觉语言的 16:9 背景。不要在图中直接生成标题，所有文字由 Remotion 用本地艺术字体渲染，保证准确。

输出目录与文件名：

- `public/assets/remotion/identity.jpg`
- `public/assets/remotion/timeline.jpg`
- `public/assets/remotion/evidence.jpg`
- `public/assets/remotion/project.jpg`
- `public/assets/remotion/research.jpg`
- `public/assets/remotion/skills.jpg`
- `public/assets/remotion/closing.jpg`

每张精确 `1280 × 720`，JPG 或 PNG。直接复制以下完整指令：

```text
Use case: stylized-concept
Asset type: seven-image coordinated cinematic background series for a Remotion personal portfolio film
Primary request: Produce a coherent set of seven separate 1280x720 editorial cinematic backplates for a Chinese creator portfolio video. The visual language combines contemporary Beijing architecture, tactile paper, darkroom photography, technical drafting and restrained modern exhibition design. These are background plates, not finished slides: no readable text, no UI cards, no people, no logos.
Shared art direction: sophisticated editorial photography and mixed-media collage, precise geometry, tactile paper fibres, ink registration marks, architectural linework, subtle halftone and film grain. Use a balanced palette of carbon black, warm paper white, vermilion, muted jade, oxidized brass and small indigo accents. Rich but quiet; not pixel art; not a corporate template; not beige-dominated; no gradients or decorative glowing orbs.
Plate 1 identity.jpg: dark Beijing studio at dusk, close architectural crop of grey eaves and a modern exhibition wall, strong negative space across left and centre for a very large Chinese name, restrained vermilion edge light.
Plate 2 timeline.jpg: warm off-white drafting table atmosphere with faint hutong map traces, archival paper edges and a vertical route line, low contrast so four timeline modules remain readable.
Plate 3 evidence.jpg: pale jade-grey gallery wall with abstract measurement ticks, embossed seals and trophy-case reflections, clean central field for metrics and awards.
Plate 4 project.jpg: dark production studio with a diagonal glimpse of a contemporary Beijing window lattice, practical monitor glow and technical annotations at the extreme edges; keep the right 65 percent visually quiet for live project video and the left 30 percent dark for explanation.
Plate 5 research.jpg: deep charcoal library and lab archive, layered paper silhouettes, citation marks and microscope-like glass reflections, three calm vertical zones for research cards.
Plate 6 skills.jpg: deep mineral red workshop wall with modular tool shadows, narrow jade and brass accents, clean two-column reading field.
Plate 7 closing.jpg: modern Beijing courtyard threshold just after rain, deep jade doors, warm interior light, large open area on the left for an invitation and a circular visual anchor area on the right.
Composition/framing: preserve all specified copy-safe regions; edge details only; no important subject beneath likely text. Every plate must work behind a 55-80 percent opaque color wash.
Lighting/mood: cinematic natural practical lighting, credible shadows, restrained contrast, intelligent and human rather than luxury advertising.
Constraints: exactly seven separate files; exact filenames; exact 1280x720; no words, letters, numbers, captions, UI, logos, watermarks, people, faces or QR codes. Keep the set stylistically consistent.
Avoid: generic PowerPoint backgrounds, neon cyberpunk, purple-blue gradients, glowing bokeh, stock-photo blur, ornate palace imagery, tourism poster, motivational poster, empty single-color background.
```

## 放置与验收

1. 文件名必须完全一致，目录大小写保持一致。
2. City 图集不允许自动裁边或增加外边距，否则帧坐标会错位。
3. 检查 `facility-atlas.png` 是否为 `1024 × 384`，`character-atlas.png` 是否为 `1536 × 512`。
4. 透明图检查四角 alpha 为 0；使用绿幕时必须先去背，最终文件不能保留绿色底。
5. 打开 `/city/neon`：背景、8 个设施和角色图集会自动取代程序化回退。
6. 打开 `/video`：七张背景会自动进入各类 Remotion 场景，上方仍叠加深浅遮罩保证文字对比度。

