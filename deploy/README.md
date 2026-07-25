# Creator City production container

The root `Dockerfile` builds and runs all three services behind one public port:

- Creator City Next.js server: internal port `3002`
- Agent Debate static frontend: `/chat-debate/`
- Agent conversation API: internal port `8811`, exposed at `/api/chat/*`
- Nginx public entrypoint: port `3000`

## Runtime environment

Configure the selected AI provider as runtime secrets on the hosting platform. Do not add provider keys to the repository or Docker build arguments.

```dotenv
AI_CHAT_PROVIDER=mimo
MIMO_API_KEY=
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_CHAT_MODEL=mimo-v2.5-pro
```

The alternative `grok2api` and `opencode_go` variable names are documented in `apps/chat-debate/.env.example`.

Supabase browser values are public build-time settings. The Dockerfile currently defaults to the Creator City project values and they can be overridden with these build arguments:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_CHAT_DEBATE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CREATOR_CITY_URL
```

The container exposes port `3000`. A successful deployment should return `200` for `/`, `/city/neon`, `/chat-debate/`, and `/api/health`. Production chat routes are `/api/chat/reply` and `/api/chat/discussion/verdict`.
