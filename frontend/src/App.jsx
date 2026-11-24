
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [showLanding, setShowLanding] = useState(true);
  const [repoPath, setRepoPath] = useState("");
  const [commits, setCommits] = useState([]);
  const [oldHash, setOldHash] = useState("");
  const [newHash, setNewHash] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);

  async function request(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const detail = data.detail || data;
      throw new Error(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail)
      );
    }

    return data;
  }

  function notify(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  async function fetchCommits(localPath) {
    const params = new URLSearchParams({
      local_path: localPath,
    });

    const history = await request(
      `/repositories/commits?${params}`
    );

    return history.commits || [];
  }

  function selectLatestCommits(commitList) {
    if (commitList.length >= 2) {
      setOldHash(commitList[1].hash);
      setNewHash(commitList[0].hash);
    } else {
      setOldHash("");
      setNewHash("");
    }
  }

  async function loadRepository() {
    if (!repoUrl.trim()) return;

    setLoading(true);
    notify("Connecting to repository...");
    setRepoPath("");
    setCommits([]);
    setOldHash("");
    setNewHash("");
    setAnalysis(null);

    try {
      const repo = await request("/repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo_url: repoUrl.trim(),
        }),
      });

      const history = await fetchCommits(repo.path);

      setRepoPath(repo.path);
      setCommits(history);
      selectLatestCommits(history);

      if (history.length < 2) {
        notify(
          "Repository connected. At least two commits are needed for comparison.",
          "info"
        );
      } else {
        notify(
          `Repository connected. ${history.length} commits available.`,
          "success"
        );
      }
    } catch (error) {
      notify(`Unable to load repository: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function refreshRepository() {
    if (!repoPath) return;

    setLoading(true);
    setAnalysis(null);
    notify("Checking GitHub for new commits...");

    try {
      const params = new URLSearchParams({
        local_path: repoPath,
      });

      await request(`/repositories/refresh?${params}`, {
        method: "POST",
      });

      const updatedCommits = await fetchCommits(repoPath);

      setCommits(updatedCommits);
      selectLatestCommits(updatedCommits);

      notify(
        `Repository updated. ${updatedCommits.length} commits available.`,
        "success"
      );
    } catch (error) {
      notify(`Refresh failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis(selectedOldHash, selectedNewHash) {
    if (!repoPath) {
      notify("Connect a repository first.", "error");
      return;
    }

    if (
      !selectedOldHash ||
      !selectedNewHash ||
      selectedOldHash === selectedNewHash
    ) {
      notify("Select two different commits.", "error");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    notify("Analyzing code changes...");

    try {
      const params = new URLSearchParams({
        local_path: repoPath,
        old_hash: selectedOldHash,
        new_hash: selectedNewHash,
      });

      const result = await request(
        `/repositories/analyze?${params}`
      );

      setAnalysis(result);
      notify("Analysis completed successfully.", "success");
    } catch (error) {
      notify(`Analysis failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  function analyzeLatestChanges() {
    if (commits.length < 2) {
      notify("At least two commits are required.", "error");
      return;
    }

    const previousHash = commits[1].hash;
    const latestHash = commits[0].hash;

    setOldHash(previousHash);
    setNewHash(latestHash);

    runAnalysis(previousHash, latestHash);
  }

  function commitLabel(commit) {
    const title = String(commit.message || "Untitled commit")
      .split("\n")[0]
      .trim();

    return `${title} (${commit.hash.slice(0, 7)})`;
  }
  if (showLanding) {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="landing-logo-mark">{"</>"}</span>
          <strong>ChangeScope</strong>
        </div>

        <span className="landing-nav-label">
          AI Change Impact & Risk Analyzer
        </span>
      </nav>

      <section className="landing-hero">
        <div className="landing-eyebrow">
          CODE CHANGE INTELLIGENCE
        </div>

        <h1>
          Understand the impact.
          <br />
          Ship with confidence.
        </h1>

        <p>
          Compare GitHub commits, assess potential code risks,
          and understand what changed with AI-assisted insights.
          A smarter way to review changes before deployment.
        </p>

        <button
          type="button"
          className="landing-primary-btn"
          onClick={() => setShowLanding(false)}
        >
          Start Analyzing <span aria-hidden="true">→</span>
        </button>

        <div className="landing-feature-grid">
          <article className="landing-feature">
            <span className="landing-feature-number">01</span>
            <h3>Commit Comparison</h3>
            <p>
              Compare two revisions and inspect exactly
              what changed in your repository.
            </p>
          </article>

          <article className="landing-feature">
            <span className="landing-feature-number">02</span>
            <h3>Risk Assessment</h3>
            <p>
              Get an estimated risk score and identify
              potentially affected code areas.
            </p>
          </article>

          <article className="landing-feature">
            <span className="landing-feature-number">03</span>
            <h3>AI-Assisted Insights</h3>
            <p>
              Understand code changes through clear
              explanations and review recommendations.
            </p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        ChangeScope · AI Change Impact & Risk Analyzer
      </footer>
    </main>
  );
}
  const risk = analysis?.risk_analysis;
  const impact = analysis?.impact_analysis;
  const comparison = analysis?.comparison;

  return (
    <main className="container">
      <header className="header">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            {"</>"}
          </div>

          <div>
            <h1>Change Impact Analyzer</h1>
            <p className="header-subtitle">
              Understand code changes and their potential risks.
            </p>
          </div>
        </div>
      </header>

      <div className="workflow">
        <section className="panel">
          <div className="section-heading">
            <span className="step-number">1</span>
            <div>
              <h2>Connect repository</h2>
              <p>Enter a public GitHub repository URL.</p>
            </div>
          </div>

          <label htmlFor="repo">Repository URL</label>

          <div className="input-row">
            <input
              id="repo"
              type="url"
              value={repoUrl}
              onChange={(event) =>
                setRepoUrl(event.target.value)
              }
              placeholder="https://github.com/owner/repository"
            />

            <button
              type="button"
              className="btn-primary"
              onClick={loadRepository}
              disabled={loading || !repoUrl.trim()}
            >
              {loading && !repoPath
                ? "Loading..."
                : "Load repository"}
            </button>
          </div>

          {repoPath && (
            <div className="repository-status">
              <div className="connected-info">
                <span className="status-dot" aria-hidden="true" />
                <span>
                  Connected · {commits.length} commits available
                </span>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={refreshRepository}
                disabled={loading}
              >
                Refresh commits
              </button>
            </div>
          )}

          {message && (
            <p
              className={`message message-${messageType}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </section>

        {commits.length > 0 && (
          <section className="panel">
            <div className="section-heading">
              <span className="step-number">2</span>
              <div>
                <h2>Compare commits</h2>
                <p>
                  Choose two revisions to see what changed.
                </p>
              </div>
            </div>

            <div className="commit-grid">
              <div className="field">
                <label htmlFor="old">Previous commit</label>

                <select
                  id="old"
                  value={oldHash}
                  onChange={(event) => {
                    setOldHash(event.target.value);
                    setAnalysis(null);
                  }}
                >
                  {commits.map((commit) => (
                    <option
                      key={commit.hash}
                      value={commit.hash}
                    >
                      {commitLabel(commit)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="new">New commit</label>

                <select
                  id="new"
                  value={newHash}
                  onChange={(event) => {
                    setNewHash(event.target.value);
                    setAnalysis(null);
                  }}
                >
                  {commits.map((commit) => (
                    <option
                      key={commit.hash}
                      value={commit.hash}
                    >
                      {commitLabel(commit)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="action-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => runAnalysis(oldHash, newHash)}
                disabled={
                  loading ||
                  !repoPath ||
                  !oldHash ||
                  !newHash ||
                  oldHash === newHash
                }
              >
                {loading ? "Analyzing..." : "Analyze changes"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={analyzeLatestChanges}
                disabled={
                  loading ||
                  !repoPath ||
                  commits.length < 2
                }
              >
                Analyze latest changes
              </button>
            </div>
          </section>
        )}

        {analysis && (
          <section className="panel results-panel">
            <div className="section-heading">
              <span className="step-number">3</span>
              <div>
                <h2>Analysis results</h2>
                <p>
                  A summary of the selected code changes.
                </p>
              </div>
            </div>

            <div className="stats">
              <div className="stat-card">
                <span className="stat-label">Estimated risk</span>

                <strong className="stat-value">
                  {risk.risk_score}
                  <small>/100</small>
                </strong>

                <span
                  className={`risk-badge ${risk.risk_level.toLowerCase()}`}
                >
                  {risk.risk_level} risk
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Changed files</span>

                <strong className="stat-value">
                  {impact.total_affected_files}
                </strong>

                <span className="stat-caption">
                  Files modified
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Lines added</span>

                <strong className="stat-value added">
                  +{risk.added_lines}
                </strong>

                <span className="stat-caption">
                  New lines
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Lines removed</span>

                <strong className="stat-value removed">
                  -{risk.removed_lines}
                </strong>

                <span className="stat-caption">
                  Deleted lines
                </span>
              </div>
            </div>


            <details className="ai-panel ai-accordion">
              <summary className="ai-accordion-header">
                <span className="ai-accordion-title">
                  <strong>AI Analysis</strong>
                  <small>Change summary, potential risks and recommendations</small>
                </span>

                <span className="ai-chevron" aria-hidden="true"></span>
              </summary>

              <div className="ai-accordion-content">
                <div className="ai-text">
                  <ReactMarkdown>
                    {analysis.ai_explanation || "No AI explanation available."}
                  </ReactMarkdown>
                </div>
              </div>
            </details>


            <div className="details-grid">
              <div className="detail-card">
                <h3>Risk factors</h3>

                <ul>
                  {(
                    risk.reasons?.length
                      ? risk.reasons
                      : ["No major risk indicators detected."]
                  ).map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-card">
                <h3>Potentially affected areas</h3>

                <ul>
                  {(
                    impact.potentially_affected_areas?.length
                      ? impact.potentially_affected_areas
                      : ["No specific areas identified."]
                  ).map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-card">
                <h3>Changed files</h3>

                <ul className="file-list">
                  {(
                    impact.affected_files?.length
                      ? impact.affected_files
                      : ["No changed files identified."]
                  ).map((file, index) => (
                    <li key={index}>
                      <code>{file}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-card">
                <h3>Recommendations</h3>

                <ul>
                  {(
                    impact.recommendations?.length
                      ? impact.recommendations
                      : ["Review the changed code and run relevant tests."]
                  ).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <details className="diff-section">
              <summary>
                <span>View code changes</span>
                <span className="diff-hint">
                  Git diff
                </span>
              </summary>

              <pre className="colored-diff">
                <code>
                  {(comparison.code_diff || "No textual diff available.")
                    .split("\n")
                    .map((line, index) => {
                      let lineType = "diff-normal";

                      if (line.startsWith("@@")) {
                        lineType = "diff-hunk";
                      } else if (
                        line.startsWith("+") &&
                        !line.startsWith("+++")
                      ) {
                        lineType = "diff-added";
                      } else if (
                        line.startsWith("-") &&
                        !line.startsWith("---")
                      ) {
                        lineType = "diff-removed";
                      }

                      return (
                        <span key={index} className={`diff-line ${lineType}`}>
                          {line}
                          {"\n"}
                        </span>
                      );
                    })}
                </code>
              </pre>
            </details>

            <p className="disclaimer">
              Risk scores and impact categories are heuristic
              estimates. They do not confirm defects or actual
              dependency relationships. Review AI suggestions
              against the code.
            </p>
          </section>
        )}
      </div>

      <footer className="footer">
        AI Change Impact &amp; Risk Analyzer
        <span> · </span>
        Developer analysis tool
      </footer>
    </main>
  );
}

export default App;
