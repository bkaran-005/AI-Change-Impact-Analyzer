def analyze_impact(changed_files):
    affected_areas = set()
    affected_files = []
    recommendations = []

    for file in changed_files:
        filename = file.get("new_path") or file.get("old_path") or ""
        filename_lower = filename.lower()

        affected_files.append(filename)

        if "test" in filename_lower:
            affected_areas.add("Testing")

        if "database" in filename_lower or "model" in filename_lower:
            affected_areas.add("Database / Data Models")

        if "api" in filename_lower or "route" in filename_lower:
            affected_areas.add("API / Backend")

        if "auth" in filename_lower or "login" in filename_lower:
            affected_areas.add("Authentication / Security")

        if "config" in filename_lower or "settings" in filename_lower:
            affected_areas.add("Configuration")

        if filename_lower.endswith((".html", ".css", ".js", ".jsx")):
            affected_areas.add("Frontend")

        if filename_lower.endswith(".py"):
            affected_areas.add("Python Application Logic")

        if filename_lower.endswith((".md", ".txt")):
            affected_areas.add("Documentation / Text Files")

    if "Python Application Logic" in affected_areas:
        recommendations.append(
            "Run relevant Python tests to check for regressions."
        )

    if "Authentication / Security" in affected_areas:
        recommendations.append(
            "Review authentication and security-related changes carefully."
        )

    if "Database / Data Models" in affected_areas:
        recommendations.append(
            "Check data compatibility and dependent components."
        )

    if "Frontend" in affected_areas:
        recommendations.append(
            "Test affected user interface functionality."
        )

    if not recommendations:
        recommendations.append(
            "Review changed files and verify expected behavior."
        )

    return {
        "total_affected_files": len(affected_files),
        "affected_files": affected_files,
        "potentially_affected_areas": sorted(affected_areas),
        "recommendations": recommendations
    }