Gig Worker Financial Resilience — prototype
===========================================

Monorepo layout

```
.               <- /frontend : Expo (SDK 57) + TypeScript + NativeWind v4 app
└── backend/    <- /backend  : FastAPI service hosting the real ML + LLM pipeline
```

Frontend (this directory)

```bash
npm install
npx expo start          # scan the QR with Expo Go, or press i / a
npx expo start --web    # browser preview
```

Backend (see backend/README.md)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The pipeline

1. **Dashboard sliders** produce six financial features (savings ratio,
   expense-to-income, debt burden, income volatility, emergency runway, income level).
2. **AI #1 — Resilience score.** `lib/resilienceModel.ts` mirrors the backend
   `XGBClassifier` inference path (12 boosted stumps + sigmoid) so the score re-computes
   live as you drag, shifting red / amber / green. Bands: `<40` high risk, `40-69` needs
   watch, `>=70` stable.
3. **AI #3 — Generative coach.** `lib/coach.ts` sends the snapshot + score to Gemini
   through `@google/generative-ai` with an empathetic-coach system prompt, and falls back
   to a deterministic on-device coach when no API key is present.

Screens: Dashboard (score, metrics, 6-month chart, sliders) · Coach (grounded chat) ·
Plan (buffer goal, loan default shield, ranked actions) · Profile (worker card, model
attribution, Gemini key) · Score detail modal (feature attribution breakdown).
