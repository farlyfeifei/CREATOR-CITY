# Creator City

Creator City is kept in one repository while preserving both upstream projects as independent source trees:

- `apps/city`: complete source from `xingchenyd/creator-city` at `c1630a9`.
- `apps/chat-debate`: complete source from `nankainankai/CREATOR-CHAT-DEBATE` at `21f479e`.

The Chat Debate AI backend, provider implementation, scheduling, validation, retry, profile adapter, and verdict logic remain in the original Chat Debate application. Integration work must be added around that application rather than replacing its core logic.

## Install

```powershell
cd "C:\Users\35726\Desktop\creator city"
npm install
npm run setup
```

## Run

```powershell
npm run dev
```

- Creator City: `http://localhost:3000`
- Chat Debate: `http://127.0.0.1:5190`
- Chat Debate API: `http://127.0.0.1:8811`

The Chat Debate backend requires one of the model providers supported by its original configuration. When no provider key is configured, it must report that AI is unavailable rather than generating local placeholder dialogue.

## Model provider

Copy the example file before starting the apps:

```powershell
Copy-Item "apps/chat-debate/.env.example" "apps/chat-debate/.env"
```

The original backend defaults to MiMo (`MIMO_API_KEY`) and also supports the `grok2api` and `opencode_go` OpenAI-compatible providers. Set `AI_CHAT_PROVIDER` to choose one.
