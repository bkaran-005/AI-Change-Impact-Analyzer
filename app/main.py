from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl
from app.services.github_service import (
    clone_repository,
    get_commit_history,
    compare_commits,
    refresh_repository
)
from app.analyzers.risk_analyzer import calculate_risk 
from app.analyzers.impact_analyzer import analyze_impact
from app.services.ai_service import generate_ai_explanation




application = FastAPI(
    title= "AI Change and Impact Analyzer",
    description = "An AI powered software that analyzes changes and impacts",
    version= "1.0.0"
)

class RepositoryRequest(BaseModel):
    repo_url: HttpUrl


@application.get("/")
def greet():
    return {
        "message": "Welcome to AI change analyzer"
    }

@application.get("/health")
def health():
    return {
        "status": "healthy"
    }

@application.post("/repositories")
def add_repository(request: RepositoryRequest):
        result = clone_repository(str(request.repo_url))
        return result

@application.get("/repositories/commits")
def fetch_commits(local_path: str):

     commits = get_commit_history(local_path)
     return{
          "total_commits": len(commits),
          "commits": commits
     } 

@application.get("/repositories/compare")
def compare_repository_commits(
    local_path: str,
    old_hash: str,
    new_hash: str
):
    return compare_commits(local_path, old_hash, new_hash)

@application.get("/repositories/analyze")
def analyze_repository(local_path: str, old_hash: str, new_hash: str):

    comparison = compare_commits(local_path, old_hash, new_hash)

    risk = calculate_risk(
        comparison["changed_files"],
        comparison["code_diff"]
    )

    impact = analyze_impact(
        comparison["changed_files"]
    )

    ai_explanation = generate_ai_explanation(
        comparison,
        risk,
        impact
    )

    return {
        "comparison": comparison,
        "risk_analysis": risk,
        "impact_analysis": impact,
        "ai_explanation": ai_explanation
    }


@application.post("/repositories/refresh")
def refresh_repository_endpoint(local_path: str):
    return refresh_repository(local_path)

