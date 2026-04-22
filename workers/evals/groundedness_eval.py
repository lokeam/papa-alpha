"""Groundedness eval — fraction of cited claims supported by the source RFP.

Each category surfaces a handful of "claims" the analysis makes about the
RFP text — typically ``exact_quote``-style references plus a sentence of
analysis context. The judge decides per-claim whether the claim is
supported by the source. The category score is ``supported / total``.

The judge is injected so:

* Unit tests can pass a deterministic stub (substring match).
* Real runs can wire an OpenAI-as-judge call (off-process, optional).

When *no* claims can be extracted for a category (e.g. an empty
analysis), the category scores 0.0 — silence is not groundedness.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, List

from .types import CATEGORIES, CategoryScores


@dataclass(frozen=True)
class Claim:
    """A single grounded claim presented to the judge."""

    category: str
    quote: str  # Exact text the analysis attributes to the RFP
    context: str  # Surrounding analysis text (issue/impact) for judge context


# Judge signature: (rfp_text, claim) -> True if the quote is supported.
# Implementations are free to call an LLM or a deterministic check.
Judge = Callable[[str, Claim], bool]


def substring_judge(rfp_text: str, claim: Claim) -> bool:
    """Deterministic offline judge — quote must appear verbatim in source.

    This is the offline default so ``make evals`` runs without an OpenAI
    key. It is strictly stricter than an LLM judge would be (no
    paraphrase tolerance), so a 1.0 here is meaningful even if the LLM
    judge would have scored higher.
    """
    return claim.quote.strip() != "" and claim.quote in rfp_text


def _extract_risks_claims(section: Dict[str, Any]) -> List[Claim]:
    out: List[Claim] = []
    for r in section.get("risks", []) or []:
        quote = r.get("exact_quote", "")
        ctx = r.get("issue_description", "")
        out.append(Claim(category="risks", quote=quote, context=ctx))
    return out


def _extract_accessibility_claims(section: Dict[str, Any]) -> List[Claim]:
    out: List[Claim] = []
    for b in section.get("barriers", []) or []:
        quote = b.get("exact_quote", "")
        ctx = b.get("impact", "")
        out.append(Claim(category="accessibility", quote=quote, context=ctx))
    return out


def _extract_questions_claims(section: Dict[str, Any]) -> List[Claim]:
    out: List[Claim] = []
    for q in section.get("questions", []) or []:
        triggered_by = q.get("triggered_by", {}) or {}
        quote = triggered_by.get("exact_quote", "")
        ctx = q.get("predicted_question", "")
        out.append(Claim(category="questions", quote=quote, context=ctx))
    return out


def _extract_subcontracting_claims(section: Dict[str, Any]) -> List[Claim]:
    out: List[Claim] = []
    for o in section.get("opportunities", []) or []:
        quote = o.get("rfp_text", "")
        ctx = o.get("area", "")
        out.append(Claim(category="subcontracting", quote=quote, context=ctx))
    return out


_EXTRACTORS = {
    "risks": _extract_risks_claims,
    "accessibility": _extract_accessibility_claims,
    "questions": _extract_questions_claims,
    "subcontracting": _extract_subcontracting_claims,
}


def eval_groundedness(
    rfp_text: str,
    analysis: Dict[str, Any],
    judge: Judge = substring_judge,
) -> CategoryScores:
    """Per-category fraction of claims the judge marks as supported."""
    scores: CategoryScores = {}
    for category in CATEGORIES:
        section = analysis.get(category)
        if section is None:
            scores[category] = 0.0
            continue
        claims = _EXTRACTORS[category](section)
        if not claims:
            scores[category] = 0.0
            continue
        supported = sum(1 for c in claims if judge(rfp_text, c))
        scores[category] = supported / len(claims)
    return scores
