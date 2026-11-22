def calculate_risk(changed_files, code_diff):
    score = 0
    reasons = []

    # Rule 1: Number of changed files
    file_count = len(changed_files)

    if file_count >= 5:
        score += 30
        reasons.append("Large number of files changed")
    elif file_count >= 2:
        score += 15
        reasons.append("Multiple files changed")

    # Rule 2: Count actual changed lines
    added_lines = 0
    removed_lines = 0

    for line in code_diff.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added_lines += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed_lines += 1

    total_changes = added_lines + removed_lines

    if total_changes > 100:
        score += 35
        reasons.append("Large number of code lines changed")
    elif total_changes > 30:
        score += 20
        reasons.append("Moderate number of code lines changed")

    # Rule 3: Check sensitive filenames
    sensitive_keywords = [
        "auth", "security", "database",
        "config", "payment", "login"
    ]

    for file in changed_files:
        filename = (
            file.get("new_path")
            or file.get("old_path")
            or ""
        ).lower()

        if any(word in filename for word in sensitive_keywords):
            score += 30
            reasons.append(f"Sensitive file changed: {filename}")
            break

    score = min(score, 100)

    if score >= 70:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "added_lines": added_lines,
        "removed_lines": removed_lines,
        "reasons": reasons
    }