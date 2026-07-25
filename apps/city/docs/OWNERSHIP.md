# Creator City 协作边界

本阶段把 Creator City 拆成两个可以并行推进、通过稳定数据接口连接的方向。

## 个人主页与 Remotion

当前分支负责：

- `src/features/profile.ts`：版本化 Creator Profile、旧数据迁移、本地存储
- `src/features/mediaLibrary.ts`：IndexedDB 二进制媒体与 Profile 元数据关联
- `src/app/onboarding/`：GitHub、简历、经历、教育、奖项、成绩、论文和项目录入
- `src/app/api/profile/`：上传文档的文字提取
- `src/remotion/`：Storyboard schema、编排策略、场景渲染与动态时长
- `src/app/video/`：故事板审片台
- `src/app/profile/`：个人主页与作品证据展厅

核心接口是 `UserProfile -> buildCreatorStoryboard(profile) -> CreatorStoryboard`。Remotion 场景只消费可序列化、经过 Zod 校验的 Storyboard，不直接解释表单字段。

## 城市、Agent 与社区

队友方向负责：

- `src/city/` 与 `src/app/city/`：地图、角色、NPC、北京场景与茶务 NPC
- `src/services/agentNetwork.ts`：Agent 网络、推荐、离线代理与匹配
- 论坛、红包积分、通知、资讯墙、模型榜和 Skill 推送相关页面/API

当前分支为了形成可检验初版，已实现独立 NPC 档案、点击去向、茶务巡桌以及双 Agent 相遇交谈的前端演示。真实 Agent 网络、匹配推理、离线代理与通知仍由队友方向独立实现。城市需要展示个人主页时，只应读取已保存的 `UserProfile` 或导航到 `/profile`；若未来接入后端，Profile 的 portable schema 应继续作为两部分之间的数据合同。

## 项目媒体合同

项目 `presentationMode` 支持：

- `live`：支持公开视频 URL 或 IndexedDB 中的本地上传视频；不可用时 Builder 自动降级
- `browser`：依据项目链接渲染产品浏览器演示
- `architecture`：消费 `architecture` 节点数组
- `workflow`：消费 `workflow` 步骤数组
- `auto`：按视频、架构、流程、浏览器的优先级自动选择

社区侧不应直接依赖 Remotion 内部组件。需要展示项目时，读取 `CreatorProject` 的普通字段即可。

上传视频进入 Storyboard 后属于强证据源：只要本地原件成功解析，项目场景就必须安排多个真实视频镜头。素材评论中的“问题 / 我负责 / 行动 / 重点看 / 结果 / 复盘”是项目级叙事的最高优先级，`00:12` 一类时间点会转为 Remotion 的实际节选区间。
