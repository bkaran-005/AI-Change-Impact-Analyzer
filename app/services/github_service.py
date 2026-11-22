import os
from git import Repo

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPO_DIR = os.path.join(BASE_DIR, "temp_repos")

def clone_repository(repo_url : str):

    os.makedirs(REPO_DIR, exist_ok = True)

    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")

    local_path = os.path.join(REPO_DIR, repo_name)

    if os.path.exists(local_path):
        return{
            "message" : "Repository already exists",
            "path": local_path
        }

    Repo.clone_from(repo_url, local_path)

    return{
        "message" : "Repository cloned successfully",
        "path": local_path
    }

def get_commit_history(local_path: str):
    repo = Repo(local_path)

    commits = []

    for commit in repo.iter_commits(max_count=20):
        commits.append({
            "hash": commit.hexsha,
            "message": commit.message.strip(),
            "author": commit.author.name,
            "date": commit.committed_datetime.isoformat()
        })

    return commits

def compare_commits(local_path: str, old_hash: str, new_hash: str):
    repo = Repo(local_path.strip())

    old_commit = repo.commit(old_hash)
    new_commit = repo.commit(new_hash)

    differences = repo.git.diff(
        old_commit.hexsha,
        new_commit.hexsha,
        "--",
        unified=3
    )

    changed_files = []

    for diff in old_commit.diff(new_commit):
        changed_files.append({
            "old_path": diff.a_path,
            "new_path": diff.b_path,
            "change_type": diff.change_type
        })

    return {
        "old_commit": old_hash,
        "new_commit": new_hash,
        "total_files_changed": len(changed_files),
        "changed_files": changed_files,
        "code_diff": differences
    }


def refresh_repository(local_path: str):
    from git import Repo

    repo = Repo(local_path.strip())

    if repo.bare:
        raise ValueError("Invalid Git repository")

    repo.remotes.origin.fetch()

    remote_branch = repo.active_branch.tracking_branch()

    if remote_branch is None:
        raise ValueError("No remote tracking branch configured")

    repo.git.merge("--ff-only", remote_branch.name)

    latest_commit = repo.head.commit

    return {
        "message": "Repository refreshed successfully",
        "local_path": local_path,
        "latest_commit": latest_commit.hexsha,
        "latest_message": latest_commit.message.strip()
    }
