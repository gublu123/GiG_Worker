# Backend — FastAPI + XGBoost + Gemini

The mobile app ships with a mirrored, on-device copy of this pipeline so the prototype
stays interactive with no server. Point it here when you want the real thing.

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here        # optional
uvicorn main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
```

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/health` | Liveness + feature list + whether Gemini is configured |
| POST | `/api/v1/resilience-score` | AI #1 — XGBoost score (0-100), tier, SHAP-style contributions |
| POST | `/api/v1/coach` | AI #3 — Gemini coaching (`?question=` optional) |
| POST | `/api/v1/pipeline` | Both, in sequence — what the app calls |

## Payload

```json
{
  "monthly_income": 2600,
  "monthly_expenses": 1850,
  "savings_balance": 1500,
  "debt_payments": 320,
  "income_volatility": 0.45
}
```

## Model notes

- `XGBClassifier`, 220 trees, `max_depth=3`, `learning_rate=0.08`, trained at boot on 40k
  synthesised gig-worker profiles labelled "no missed payment in the next 60 days".
- Score = `round(100 * P(default-free))`, banded `<40 High risk`, `40-69 Needs watch`,
  `>=70 Stable` — the exact same bands the mobile app renders.
- Contributions come from `predict(..., predcontribs=True)`, i.e. native SHAP values.
- If `GEMINI_API_KEY` is missing the coach degrades to a deterministic template, so the
  endpoint never 500s during a demo.
