# Agent Group Chat

Independent workspace for the Personal Agent group-chat variant.

Architecture:

- `server/roundtable_core/` is an unmodified copy of the original Roundtable API core.
- `server/profile_adapter.py` converts a questionnaire Profile Pack into the existing persona contract.
- `server/dev_api.py` is a local development bridge around the original `roundtable_reply` method and validator.
- `src/` implements Personal Agent intake and the WeChat-style group chat UI.

Run:

```powershell
python -m pip install -r requirements.txt
npm install
npm run dev
```

The app runs at `http://127.0.0.1:5190/` and the local API bridge at `http://127.0.0.1:8811/`.
