# Creator City 多人协作

## 邀请队友

1. 打开 GitHub 仓库的 `Settings`。
2. 进入 `Collaborators and teams`。
3. 点击 `Add people`，输入队友的 GitHub 用户名或邮箱并发送邀请。
4. 队友接受邀请后即可按仓库权限拉取和推送分支。

若仓库是公开仓库，也可以不授予写权限：队友 Fork 仓库后从自己的 Fork 发 Pull Request。

## 推荐分支边界

- `main`：始终保持可运行，只通过经过检查的 Pull Request 合并。
- `remotion/*`：个人主页、素材解析、Storyboard、Remotion 场景和导演台。
- `city/*`：地图、建筑落位、角色、NPC 与 Phaser 交互。
- `agent/*`：真实 Agent 网络、匹配、论坛、通知与积分系统。
- `data/*`：资讯、模型榜、黑客松和创作者展厅的数据接入。

现有代码所有权与模块合同见 `docs/OWNERSHIP.md`。

## 队友开始工作

```bash
git clone https://github.com/xingchenyd/creator-city.git
cd creator-city
npm install
git switch -c city/your-feature
npm run dev
```

提交前至少运行：

```bash
npm run typecheck
npm run build
```

涉及 Remotion 时再运行：

```bash
npm run remotion:still
```

完成后推送自己的分支并创建 Pull Request：

```bash
git add <本次负责的文件>
git commit -m "feat: describe the feature"
git push -u origin city/your-feature
```

## 避免冲突

- 城市/Agent 队友不要直接修改 `src/remotion/` 与 `src/features/profile.ts`。
- Remotion 队友不要在同一个 Pull Request 中重写 Agent 网络实现。
- 共享数据结构先在 `src/features/types.ts` 或 portable profile schema 中确定，再分别接入页面。
- 大型图片和视频不要提交用户上传原件；生成后的正式公共资产统一放到 `public/assets/`，并在 Pull Request 中说明来源和用途。
- `.env.local`、API Key 和任何个人媒体原件都不得提交。
