# Creator City

Creator City 是一个面向 AI 创作者的个人主页与像素社区原型。本阶段重点是可运行的个人主页生成器：用户登录后导入 GitHub、简历、经历、教育、奖项、成绩、论文和项目资料，系统将这些输入编排为一份可审阅的 Storyboard，再用 Remotion 生成包含 PPT 式排版、文字动画、项目实机或原理流程的动态自我介绍。

## 当前能力

- 本地演示登录与会话保护
- GitHub 公开主页、项目和技术栈导入
- PDF、DOCX、TXT、Markdown 简历文字提取（8 MB 上限）
- 结构化经历、教育、成绩、奖项、论文、技能证据和项目录入
- Profile v6 数据模型与旧 `localStorage` 数据自动迁移
- IndexedDB 本地媒体库，可保存多份项目视频、图片和 PDF 原件，并分别绑定项目与经历
- 素材用途、用户评论、视频时长/画幅、六段叙事节拍与分析状态编辑
- 视频/图片代表帧视觉分析；未配置模型时自动回退到可编辑的本地叙事草稿
- 独立的 Zod Storyboard schema 与确定性编排器
- 身份、轨迹、结果、项目、论文、技能和结尾等 Remotion 场景
- 项目实机视频、浏览器演示、架构图与流程图四种呈现方式
- 动态场景数、动态影片时长和 Remotion CLI 渲染
- 非像素风的专业故事板导演台与完整个人主页
- 上传视频优先的项目级叙事：按“问题 → 职责 → 行动 → 画面证据 → 结果/复盘”形成完整主线
- 左侧 Motion 与右侧实机/路演/图片/文档同屏播放；重点视频片段可短暂全屏
- 支持从素材评论中的 `00:12` 等时间点自动选择多个视频片段，不再只循环播放开头
- 导演台显示本地视频载入状态、文件名与时长，原文件缺失时给出明确提示
- 北京院落底图上的九座独立建筑、可行走角色、独立 NPC 档案、茶务 NPC 和双 Agent 相遇交谈循环
- 可替换的 City 图集与 Remotion 背景资产合同，含完整模块化生图指令

## 数据管线

```text
GitHub / Resume / Awards / Papers / Projects
                    |
                    v
            Creator Profile v6
                    |
                    v
      Media Narrative + Storyboard Builder
                    |
                    v
       Remotion Scenes + Personal Homepage
```

项目没有实机媒体时不会出现空镜头。Storyboard Builder 会依次尝试架构、流程和浏览器演示作为回退。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。登录页已填入演示账号；在档案工作台点击“载入完整演示”可快速检查完整路径。

### 可选：启用素材视觉分析

默认版本无需 API 即可运行，会根据素材用途、绑定项目/经历和用户评论生成六段本地叙事。要让“分析画面并重写叙事”读取视频代表帧，在项目根目录的 `.env.local` 配置：

```bash
OPENAI_API_KEY=your_api_key
# 可选，默认 gpt-5.6-terra
OPENAI_MEDIA_MODEL=gpt-5.6-terra
```

密钥只由服务端 `POST /api/media/analyze` 读取，不会进入浏览器包。视频原件不会发送给模型，仅发送浏览器抽取的最多四张低清代表帧以及用户填写的素材说明。

## 验证与渲染

```bash
npm run typecheck
npm run build
npm run remotion
npm run remotion:still
npm run remotion:render
```

Remotion composition ID 为 `CreatorIntro`，30 fps、1280 × 720；总时长由 Storyboard 动态计算。

## 分工

个人主页/Remotion 与城市/Agent 的长期代码边界见 [docs/OWNERSHIP.md](docs/OWNERSHIP.md)。当前版本已经补齐可检验的 City 场景与 NPC 交互原型，真实 Agent 网络仍保持独立边界。

多人协作的仓库邀请、分支和 Pull Request 流程见 [docs/COLLABORATION.md](docs/COLLABORATION.md)。

## 生成视觉资产

北京院落、八设施图集、十二角色动作图集和七张 Remotion 电影背景的统一指令见 [docs/IMAGE_GENERATION_BRIEF_CN.md](docs/IMAGE_GENERATION_BRIEF_CN.md)。按文档中的固定文件名放入 `public/assets/city/` 和 `public/assets/remotion/` 后，运行时会自动使用；未放入时保留可运行回退。

## MVP 边界

结构化资料仍保存在浏览器 `localStorage`，二进制媒体保存在当前浏览器的 IndexedDB。GitHub API 只读取公开数据。账号后端、云对象存储、真实通知、红包支付和真实 Agent 匹配尚未接入。
