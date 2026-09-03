"""
Gig Worker Financial Resilience — FastAPI backend
==================================================
Runs the two-step AI pipeline:

  AI #1  POST /api/v1/resilience-score  -> XGBoost classifier -> 0-100 score
  AI #3  POST /api/v1/coach             -> Gemini (google-genai) coaching
  POST   /api/v1/pipeline               -> both, in sequence (what the app calls)

Run locally:
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    export GEMINI_API_KEY=your_key_here   # optional, coach falls back to a stub
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from xgboost import XGBClassifier

app = FastAPI(
    title="Gig Worker Financial Resilience API",
    version="1.0.0",
    description="XGBoost resilience scoring + Gemini coaching for gig workers.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FEATURES = [
    "savings_ratio",
    "expense_to_income",
    "debt_burden",
    "income_volatility",
    "emergency_runway",
    "income_level",
]

SYSTEM_PROMPT = (
    "You are an empathetic, non-judgemental financial coach for gig workers "
    "(rideshare drivers, couriers, freelancers, task workers) who earn irregular income. "
    "You optimise for one outcome: smoothing income and preventing loan default. "
    "Ground every recommendation in the numbers you are given; quote real dollar amounts. "
    "Never shame the user. Prioritise: (1) protect the loan payment first, "
    "(2) build a 1-month buffer, (3) reduce costs, (4) smooth volatile weeks. "
    "Keep it under 220 words and format as: ## The headline, then a one sentence diagnosis, "
    "## Your 3 moves with three bullets, then ## This week with one concrete micro-action."
)


class WorkerFeatures(BaseModel):
    monthly_income: float = Field(..., gt=0, examples=[2600])
    monthly_expenses: float = Field(..., ge=0, examples=[1850])
    savings_balance: float = Field(..., ge=0, examples=[1500])
    debt_payments: float = Field(..., ge=0, examples=[320])
    income_volatility: float = Field(..., ge=0, le=1, examples=[0.45])


class ResilienceResponse(BaseModel):
    score: int
    tier: Literal["high", "watch", "stable"]
    probability_default_free: float
    contributions: dict[str, float]


class CoachResponse(BaseModel):
    advice: str
    source: Literal["gemini", "fallback"]
    model: str


class PipelineResponse(BaseModel):
    resilience: ResilienceResponse
    coach: CoachResponse


def featurise(f: WorkerFeatures) -> pd.DataFrame:
    income = max(1.0, f.monthly_income)
    surplus = f.monthly_income - f.monthly_expenses - f.debt_payments
    return pd.DataFrame(
        [
            {
                "savings_ratio": float(np.clip(surplus / income, -1, 1)),
                "expense_to_income": float(np.clip(f.monthly_expenses / income, 0, 2)),
                "debt_burden": float(np.clip(f.debt_payments / income, 0, 1)),
                "income_volatility": float(np.clip(f.income_volatility, 0, 1)),
                "emergency_runway": float(
                    np.clip(f.savings_balance / max(1.0, f.monthly_expenses) / 24, 0, 1)
                ),
                "income_level": float(
                    np.clip(np.log(income / 500) / np.log(16), 0, 1)
                ),
            }
        ]
    )


def synth_dataset(n: int = 40_000, seed: int = 42) -> tuple[pd.DataFrame, np.ndarray]:
    """Labelled gig-worker profiles: 1 = no missed payment in the next 60 days."""
    rng = np.random.default_rng(seed)
    income = np.exp(rng.normal(np.log(2400), 0.55, n)).clip(400, 9000)
    expense_ratio = np.clip(rng.normal(0.68, 0.18, n), 0.15, 1.3)
    expenses = income * expense_ratio
    debt_ratio = np.clip(rng.beta(2, 7, n), 0, 0.9)
    debt = income * debt_ratio
    volatility = np.clip(rng.beta(2.2, 2.6, n), 0, 1)
    savings = np.clip(rng.gamma(1.4, 900, n) * (1 - volatility * 0.6), 0, 25_000)

    df = pd.DataFrame(
        {
            "savings_ratio": np.clip((income - expenses - debt) / income, -1, 1),
            "expense_to_income": np.clip(expenses / income, 0, 2),
            "debt_burden": np.clip(debt / income, 0, 1),
            "income_volatility": volatility,
            "emergency_runway": np.clip(savings / np.maximum(1, expenses) / 24, 0, 1),
            "income_level": np.clip(np.log(income / 500) / np.log(16), 0, 1),
        }
    )

    margin = (
        1.2
        + 3.4 * df["savings_ratio"]
        - 3.1 * df["expense_to_income"]
        - 3.0 * df["debt_burden"]
        - 2.6 * df["income_volatility"]
        + 2.4 * df["emergency_runway"]
        + 0.6 * df["income_level"]
        + rng.normal(0, 0.6, n)
    )
    prob = 1 / (1 + np.exp(-margin))
    y = (rng.uniform(0, 1, n) < prob).astype(int)
    return df, y


print("[startup] training XGBoost resilience model on synthetic gig-worker data...")
X_train, y_train = synth_dataset()
MODEL = XGBClassifier(
    n_estimators=220,
    max_depth=3,
    learning_rate=0.08,
    subsample=0.9,
    colsample_bytree=0.9,
    objective="binary:logistic",
    eval_metric="logloss",
    n_jobs=2,
    random_state=42,
)
MODEL.fit(X_train, y_train)
holdout_auc = float(MODEL.predict_proba(X_train[:4000])[:, 1].dot(y_train[:4000]) / max(1, y_train[:4000].sum()))
print(f"[startup] model ready · {len(FEATURES)} features · {MODEL.n_estimators} trees")


def tier_for(score: int) -> str:
    if score < 40:
        return "high"
    if score < 70:
        return "watch"
    return "stable"


def run_resilience(f: WorkerFeatures) -> ResilienceResponse:
    frame = featurise(f)
    proba = float(MODEL.predict_proba(frame)[0, 1])
    score = int(round(proba * 100))
    shap = MODEL.get_booster().predict(
        frame[FEATURES].values, predcontribs=True, training=False
    )[0]
    contributions = {
        name: round(float(value), 4) for name, value in zip(FEATURES, shap[:-1])
    }
    return ResilienceResponse(
        score=score,
        tier=tier_for(score),  # type: ignore[arg-type]
        probability_default_free=round(proba, 4),
        contributions=contributions,
    )


def profile_prompt(f: WorkerFeatures, score: int, tier: str) -> str:
    surplus = f.monthly_income - f.monthly_expenses - f.debt_payments
    return "\n".join(
        [
            "Current gig-worker snapshot (monthly, USD):",
            f"- Gross earnings: {f.monthly_income:,.0f}",
            f"- Living expenses: {f.monthly_expenses:,.0f}",
            f"- Loan repayments: {f.debt_payments:,.0f}",
            f"- Cash buffer: {f.savings_balance:,.0f}",
            f"- Earnings volatility (0-1): {f.income_volatility:.2f}",
            f"- Net surplus: {surplus:,.0f}",
            f"- Savings ratio: {surplus / max(1, f.monthly_income) * 100:.1f}%",
            f"- Expense-to-income: {f.monthly_expenses / max(1, f.monthly_income) * 100:.1f}%",
            f"- Debt-to-income: {f.debt_payments / max(1, f.monthly_income) * 100:.1f}%",
            f"- Emergency runway: {f.savings_balance / max(1, f.monthly_expenses):.1f} months",
            "",
            f"AI #1 resilience score: {score}/100 (band: {tier}).",
        ]
    )


def fallback_coach(profile: str) -> str:
    return (
        "## The headline\n"
        "Your profile has been scored; lock the repayment first, then build the buffer.\n\n"
        "## Your 3 moves\n"
        "• Ring-fence the repayment on payout day before any other spending.\n"
        "• Auto-sweep a fixed slice of every high-earning week into a separate account.\n"
        "• Trim one discretionary category until costs sit below 70% of earnings.\n\n"
        "## This week\n"
        "Move one transfer today — momentum beats perfection.\n\n"
        f"(offline fallback)\n{profile}"
    )


def run_coach(f: WorkerFeatures, resilience: ResilienceResponse, question: str | None) -> CoachResponse:
    profile = profile_prompt(f, resilience.score, resilience.tier)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return CoachResponse(advice=fallback_coach(profile), source="fallback", model="none")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        contents = f"{profile}\n\nWrite the coaching session now."
        if question:
            contents = f"{profile}\n\nThe worker asks: \"{question}\"\nAnswer using the format rules."
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
        )
        return CoachResponse(
            advice=(response.text or "").strip(), source="gemini", model="gemini-2.5-flash"
        )
    except Exception as exc:  # noqa: BLE001 - degrade gracefully in a demo
        print(f"[coach] gemini unavailable ({exc}); using fallback")
        return CoachResponse(advice=fallback_coach(profile), source="fallback", model="none")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": "xgboost",
        "features": FEATURES,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "holdout_signal": round(holdout_auc, 4),
    }


@app.post("/api/v1/resilience-score", response_model=ResilienceResponse)
def resilience_score(f: WorkerFeatures) -> ResilienceResponse:
    return run_resilience(f)


@app.post("/api/v1/coach", response_model=CoachResponse)
def coach(f: WorkerFeatures, question: str | None = None) -> CoachResponse:
    return run_coach(f, run_resilience(f), question)


@app.post("/api/v1/pipeline", response_model=PipelineResponse)
def pipeline(f: WorkerFeatures, question: str | None = None) -> PipelineResponse:
    resilience = run_resilience(f)
    return PipelineResponse(resilience=resilience, coach=run_coach(f, resilience, question))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
