# Creator City · Chat Debate

The original Chat Debate application, now connected to Creator City through a thin UI integration layer.

Architecture:

- The original Python API core, prompts, providers, scheduling, validation, retry, and verdict logic remain unchanged.
- `server/profile_adapter.py` converts a questionnaire Profile Pack into the existing persona contract.
- `server/dev_api.py` is a local development bridge around the original reply method and validator.
- `src/` keeps the WeChat-style group chat UI and adds Creator City entry/profile links.

Run:

```powershell
python -m pip install -r requirements.txt
npm install
npm run dev
```

The app runs at `http://127.0.0.1:5190/` and the local API bridge at `http://127.0.0.1:8811/`.

Copy `.env.example` to `.env` and configure one supported provider. Without a provider key, the UI reports that AI service is unavailable and never generates placeholder dialogue.
