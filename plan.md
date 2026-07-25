# Creator City 三小时数据库与前后端联调计划

## 目标

在 **3 小时内**完成一个可供十几到二十人试用、主链路功能完整的云端 Demo。时间短只能通过多人并行和减少商业化外围来解决，不能删除必需功能：

- 用户可以使用用户名和密码注册、登录。
- 用户的统一档案和十二三个问题答案保存到 SQLite。
- 生成后的个人 Agent 画像保存到 SQLite。
- 用户上传的头像、图片、PDF、视频等素材实际保存，并能在重新登录后恢复。
- 重新登录后能够恢复档案和个人 Agent。
- 用户 Agent 可以通过适配层进入现有 Chat Debate。
- 辩论房间、参与者和消息能够保存，页面刷新后仍可读取。
- 记录每个用户的模型调用量，并设置简单的 Demo 额度上限。
- 保留现有 Creator City 页面、广场和微信聊天 UI。
- 不修改 Chat Debate 的调度、提示词、验证、重试和裁判核心逻辑。

## 本次明确不做

- 邮箱验证、找回密码、第三方登录。
- 管理员后台和复杂权限系统。
- 好友、组队、项目社交等新功能。
- 视频转码、CDN、多清晰度播放等成熟媒体系统；但原始文件上传和恢复必须可用。
- 商业计费系统和复杂数据统计；但辩论历史与基础调用量记录必须保留。
- CircleCI。代码检查直接使用 GitHub Actions，来不及也可以先人工运行现有测试。

## 技术方案

### 云端结构

```text
域名 / HTTPS
    ↓
Nginx 或 Caddy
    ├── Creator City / Next.js
    ├── Chat Debate 前端
    ├── Python Debate API
    ├── SQLite 数据库文件
    └── 持久化 uploads 素材目录
```

SQLite 不是独立数据库服务。项目通过 SQLite 驱动直接读写云服务器上的数据库文件。

建议正式数据库路径：

```text
/var/lib/creator-city/creator-city.db
```

该目录必须位于云服务器持久化磁盘，不能放在临时构建目录中。

### 必需数据表

#### `users`

- `id`
- `username`，唯一
- `password_hash`
- `created_at`

#### `sessions`

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`

#### `profiles`

- `id`
- `user_id`，唯一
- `profile_json`：基础信息、GitHub、项目、教育和经历
- `updated_at`

#### `profile_answers`

- `id`
- `user_id`
- `question_key`
- `question_version`
- `answer`
- `updated_at`

#### `agent_profiles`

- `id`
- `user_id`
- `persona_json`：完整 Agent 画像
- `model`
- `version`
- `is_active`
- `created_at`

#### `media_assets`

- `id`
- `user_id`
- `file_name`
- `storage_path`
- `mime_type`
- `size`
- `category`
- `created_at`

#### `debates`

- `id`
- `owner_user_id`
- `topic`
- `status`
- `created_at`

#### `debate_participants`

- `debate_id`
- `agent_id` 或预制人物 ID
- `display_name`

#### `debate_messages`

- `id`
- `debate_id`
- `speaker_id`
- `content`
- `sequence`
- `created_at`

#### `usage_events`

- `id`
- `user_id`
- `action`：Agent 生成或辩论
- `model`
- `input_tokens`
- `output_tokens`
- `created_at`

Demo 阶段允许将经历、教育、项目和 Agent 结构保存在 JSON 字段中，但原始问题答案、素材、辩论消息和用量必须独立保存，不能只留在浏览器。

### 素材保存方案

- 文件本体保存到云服务器持久化目录，例如 `/var/lib/creator-city/uploads`。
- SQLite 的 `media_assets` 保存所属用户、文件名、路径、类型和大小。
- 头像、图片、PDF 和视频均走统一上传接口。
- Demo 不做转码和 CDN，但上传、读取、权限检查和重新登录恢复必须可用。

### 登录方案

- 用户使用用户名和密码登录。
- 密码使用 `bcryptjs` 生成哈希，禁止存明文。
- 登录成功后生成随机 Session Token；浏览器只保存 `HttpOnly Cookie`，数据库保存 Token 哈希与有效期。
- 前端不能直接读取 SQLite，也不能取得 DeepSeek API Key。

## 固定接口协议

采用：

```text
HTTPS + REST + JSON
接口前缀：/api/v1
字符编码：UTF-8
```

成功响应：

```json
{
  "data": {}
}
```

失败响应：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误说明"
  }
}
```

### 账号接口

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

注册和登录请求：

```json
{
  "username": "zhangsan",
  "password": "password"
}
```

### 档案接口

```text
GET /api/v1/profile
PUT /api/v1/profile
```

`PUT /profile` 一次保存完整档案：

```json
{
  "displayName": "张三",
  "avatarUrl": "/uploads/avatar.png",
  "bio": "AI 产品经理",
  "answers": {
    "question_1": "回答内容",
    "question_2": "回答内容"
  },
  "links": {
    "github": "https://github.com/example"
  }
}
```

### Agent 接口

```text
GET  /api/v1/agent
POST /api/v1/agent/generate
GET  /api/v1/agents/:agentId/debate-profile
```

`debate-profile` 返回稳定的外围格式：

```json
{
  "data": {
    "id": "agent-id",
    "displayName": "张三",
    "avatarUrl": "/uploads/avatar.png",
    "persona": {
      "summary": "人物简介",
      "expertise": ["AI 产品"],
      "values": ["实用主义"],
      "speakingStyle": "直接、简洁",
      "debateStyle": "重视案例",
      "systemPrompt": "完整人物提示词"
    },
    "version": 1
  }
}
```

Chat Debate 外围适配器负责把它转换成现有 Persona 输入，核心模块保持不变。

### 素材接口

```text
POST   /api/v1/media
GET    /api/v1/media
DELETE /api/v1/media/:id
```

上传接口使用 `multipart/form-data`。接口必须验证登录用户，并保证用户只能读取和删除自己的素材。

### 辩论与用量接口

```text
POST /api/v1/debates
GET  /api/v1/debates/:id
POST /api/v1/debates/:id/messages
GET  /api/v1/usage/me
```

Chat Debate 每得到一条已通过原有验证逻辑的真实回复，就将最终消息写入 `debate_messages`。模型调用完成后写入 `usage_events`。

## 三小时并行安排

> 必须至少三人并行，建议四人：前端、数据库/API、Chat Debate 适配、部署与测试。一个人依次完成所有内容，三小时无法保证主链路完整。

### 00:00—00:15：冻结协议

全员共同完成：

- 确认上述必需表和字段不再随意变化。
- 确认接口路径、请求字段和返回格式。
- 建立各自 Git 分支。
- 指定文件和目录负责人，避免同时修改同一个文件。

验收：前端可以根据协议制作 Mock 数据，后端可以独立实现接口。

### 00:15—01:15：前后端并行

#### A 组：前端与页面逻辑

- 保留现有开屏、登录、广场、档案和 Chat Debate UI。
- 增加注册/登录状态切换。
- 建立统一 API Client，页面不直接操作数据库。
- 将个人档案读写收口到 `getProfile`、`saveProfile`。
- 将个人 Agent 读写收口到 `getAgent`、`generateAgent`。
- 将素材上传、列表和删除收口到统一 Media Client。
- 将辩论创建、消息恢复和用量显示收口到统一 Debate Client。
- 后端没完成时使用与正式接口完全相同的 Mock 返回。

#### B 组：SQLite 与后端接口

- 接入 SQLite 驱动。
- 创建全部必需表及初始化逻辑。
- 实现注册、登录、退出、当前用户接口。
- 实现档案和十二三个原始答案的读取、保存接口。
- 实现 Agent 读取和保存接口。
- 实现素材上传、列表、读取和删除接口。
- 实现辩论房间、参与者、消息和用量记录接口。
- 使用 Cookie 判断当前用户，接口只能读写自己的数据。

#### C 组：Chat Debate 适配与云端准备

- 不修改 `roundtable_core`、调度、验证、重试和裁判逻辑。
- 实现数据库 Agent 到现有 Persona 结构的单向适配器。
- 在原核心返回最终有效回复后调用持久化接口，不改变回复生成流程。
- 保证页面刷新后可恢复同一辩论的已有消息。
- 准备云端数据库持久化目录和环境变量。
- 确认域名下 Creator City、Chat Debate 和 Python API 的转发路径。

### 01:15—02:05：第一次整合

- 后端先提交接口分支。
- 前端把 Mock Client 切换成真实 API Client。
- 完成注册 → 登录 → 填写档案 → 刷新恢复档案。
- 完成上传素材 → 刷新和重新登录后恢复素材。
- 完成生成 Agent → 保存 Agent → 重新登录后恢复 Agent。
- 修正字段名差异，只改适配层，不临时修改接口协议。

验收：两个不同账号的数据不会串在一起。

### 02:05—02:35：接入 Agent 辩论

- 从广场选择预制人物或用户 Agent。
- 用户 Agent 通过 `debate-profile` 接口进入适配层。
- 适配层生成现有 Chat Debate 所需的 Persona。
- 发起一场真实 DeepSeek 对话。
- 将房间、参与者和真实消息写入 SQLite，刷新后恢复。
- 写入本次模型用量，并验证超过 Demo 上限时能够拒绝继续调用。
- 确认预制的张雪峰、张一鸣、马斯克等人物仍然可用。

验收：真实 Agent 会思考和回复，不出现本地模板轮播。

### 02:35—02:55：回归测试与部署检查

必须检查：

- 新用户可以注册和登录。
- 未登录用户不能直接进入广场个人数据页面。
- 档案刷新后不丢失。
- 十二三个问题的原始答案均能恢复。
- 上传素材刷新和重新登录后仍存在。
- 退出后重新登录能够恢复档案和 Agent。
- 两个账号的数据互相隔离。
- 辩论消息刷新后仍存在，用量记录正确增加。
- Chat Debate 核心测试仍然通过。
- DeepSeek API Key 和 Cookie 密钥没有提交到 Git。
- SQLite 文件位于持久化目录。

运行现有检查：

```text
npm run typecheck
npm run build
python -m pytest apps/chat-debate/server/test_dialogue_quality.py
```

### 02:55—03:00：冻结版本

- 三个工作分支通过 Pull Request 合入 `main`。
- 给最终提交打 Demo 标签。
- 推送 GitHub。
- 记录数据库文件路径、启动命令和域名。
- 三小时后停止增加功能，只修阻塞体验的问题。

## GitHub 协作规则

建议分支：

```text
frontend/demo-pages
backend/sqlite-api
integration/debate-adapter
deploy/cloud-demo
```

规则：

- 不直接在 `main` 上多人同时开发。
- 每人只修改自己负责的目录。
- 数据库初始化和迁移文件只由后端负责人修改。
- `.env`、数据库文件、上传文件和 API Key 不提交。
- 每个 Pull Request 写明改动文件和已完成测试。
- 合并顺序：后端接口 → 前端接入 → Chat Debate 适配 → 最终回归。

## 三小时完成标准

满足以下流程即算完成：

```text
注册账号
→ 登录进入广场
→ 填写并保存个人档案与全部原始答案
→ 上传素材并在重新登录后恢复
→ 生成并保存个人 Agent
→ 重新登录后资料仍存在
→ 选择个人 Agent 进入原 Chat Debate
→ 真实模型完成一次对话
→ 刷新后恢复辩论消息
→ 记录本次模型用量
```

其他功能不影响这条主链路时，不在本次三小时范围内处理。
