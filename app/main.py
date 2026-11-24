import hashlib
import logging
import os
import time
from collections import OrderedDict
from threading import Lock

from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl
from app.services.github_service import (
    clone_repository,
    get_commit_history,
    compare_commits,
    refresh_repository,
)
from app.analyzers.risk_analyzer import calculate_risk
from app.analyzers.impact_analyzer import analyze_impact
from app.services.ai_service import generate_ai_explanation

logger = logging.getLogger("uvicorn.error")
_CACHE_LIMIT = 32
_analysis_cache = OrderedDict()
_cache_lock = Lock()

application = FastAPI(
    title="AI Change and Impact Analyzer",
    description="An AI powered software that analyzes changes and impacts",
    version="1.0.0",
)


class RepositoryRequest(BaseModel):
    repo_url: HttpUrl


@application.get("/")
def greet():
    return {"message": "Welcome to AI change analyzer"}


@application.get("/health")
def health():
    return {"status": "healthy"}


@application.post("/repositories")
def add_repository(request: RepositoryRequest):
    return clone_repository(str(request.repo_url))


@application.get("/repositories/commits")
def fetch_commits(local_path: str):
    commits = get_commit_history(local_path)
    return {"total_commits": len(commits), "commits": commits}


@application.get("/repositories/compare")
def compare_repository_commits(local_path: str, old_hash: str, new_hash: str):
    return compare_commits(local_path, old_hash, new_hash)


@application.get("/repositories/analyze")
def analyze_repository(local_path: str, old_hash: str, new_hash: str):
    started = time.perf_counter()
    comparison = compare_commits(local_path, old_hash, new_hash)
    git_seconds = time.perf_counter() - started

    # Include the actual diff so a changed repository cannot reuse stale results.
    diff_digest = hashlib.sha256(comparison["code_diff"].encode("utf-8")).hexdigest()
    cache_key = (os.path.realpath(local_path), old_hash, new_hash, diff_digest)

    with _cache_lock:
        cached = _analysis_cache.get(cache_key)
        if cached is not None:
            _analysis_cache.move_to_end(cache_key)
    if cached is not None:
        logger.info("Analysis cache HIT | git=%.2fs | total=%.2fs", git_seconds, time.perf_counter() - started)
        return cached

    step_started = time.perf_counter()
    risk = calculate_risk(comparison["changed_files"], comparison["code_diff"])
    impact = analyze_impact(comparison["changed_files"])
    rules_seconds = time.perf_counter() - step_started

    step_started = time.perf_counter()
    ai_explanation = generate_ai_explanation(comparison, risk, impact)
    ai_seconds = time.perf_counter() - step_started

    result = {
        "comparison": comparison,
        "risk_analysis": risk,
        "impact_analysis": impact,
        "ai_explanation": ai_explanation,
    }

    # Do not cache temporary API failures or missing-key responses.
    if ai_explanation and not ai_explanation.startswith((
        "AI explanation unavailable",
        "AI explanation is temporarily unavailable",
        "No AI explanation",
    )):
        with _cache_lock:
            _analysis_cache[cache_key] = result
            _analysis_cache.move_to_end(cache_key)
            if len(_analysis_cache) > _CACHE_LIMIT:
                _analysis_cache.popitem(last=False)

    logger.info(
        "Analysis cache MISS | git=%.2fs | rules=%.2fs | gemini=%.2fs | total=%.2fs",
        git_seconds, rules_seconds, ai_seconds, time.perf_counter() - started,
    )
    return result


@application.post("/repositories/refresh")
def refresh_repository_endpoint(local_path: str):
    return refresh_repository(local_path)
