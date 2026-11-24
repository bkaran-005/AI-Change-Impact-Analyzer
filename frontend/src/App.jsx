import { useMemo, useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, GitCompareArrows, RefreshCw, LoaderCircle, AlertTriangle, FileCode2, ChevronDown } from "lucide-react";
import "./App.css";


const short = (hash) => String(hash || "").slice(0, 7);
const count = (value) => Number(value) || 0;
const riskTone = (level) => String(level || "LOW").toLowerCase();
const cleanLine = (value) => String(value || "").split("\n")[0].trim();
const getRepoName = (url) => {
  const match = String(url).match(/github\.com\/([^/]+\/[^/?#]+?)(?:\.git)?\/?$/i);
  return match ? match[1] : "Connected repository";
};
const formatDate = (commit) => {
  const raw = commit.date || commit.author_date || commit.commit_date;
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const CommitPicker = memo(function CommitPicker({ label, value, commits, onChange }) {
  return (
    <div className="cs-picker">
      <span className="cs-picker-label">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="cs-select-trigger" aria-label={`${label} commit`}>
          <SelectValue placeholder="Choose commit">
            {value && <span className="cs-selected"><code>{short(value)}</code><span>{cleanLine(commits.find((c) => c.hash === value)?.message) || "Commit"}</span></span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="cs-select-content">
          {commits.map((commit) => (
            <SelectItem key={commit.hash} value={commit.hash} className="cs-select-item">
              <span className="cs-commit-option">
                <span><code>{short(commit.hash)}</code> {cleanLine(commit.message) || "Untitled commit"}</span>
                {(commit.author || commit.date || commit.author_date) && <small>{[commit.author, formatDate(commit)].filter(Boolean).join(" · ")}</small>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

const Gauge = memo(function Gauge({ score, level }) {
  const safe = Math.max(0, Math.min(100, count(score)));
  const radius = 74;
  const length = Math.PI * radius;
  return (
    <div className={`cs-gauge cs-${riskTone(level)}`} role="img" aria-label={`Estimated risk ${safe} out of 100`}>
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#282D37" strokeWidth="13" strokeLinecap="round" pathLength="100" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" pathLength="100" strokeDasharray={`${safe} 100`} />
      </svg>
      <div className="cs-gauge-number"><strong>{safe}</strong><span>/100</span></div>
    </div>
  );
});

const AiTile = memo(function AiTile({ explanation, fallback }) {
  const [open, setOpen] = useState(false);
  const content = String(explanation || "").trim();
  const unavailable = !content || /^(AI explanation unavailable|AI explanation is temporarily unavailable|No AI explanation)/i.test(content);
  const match = content.match(/(?:^|\n)SHORT SUMMARY:\s*([\s\S]*?)\n\s*DETAILED ANALYSIS:\s*([\s\S]*)/i);
  const summary = unavailable ? fallback : match
    ? match[1].replace(/\s+/g, " ").trim()
    : fallback;
  const details = match ? match[2].trim() : content;
  return (
    <article className="cs-tile cs-ai">
      <div className="cs-tile-label"><span className="cs-accent-symbol">✧</span> AI SUMMARY</div>
      <p className="cs-summary">{summary}</p>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild><button className="cs-text-button" type="button">{open ? "Hide full analysis" : "Read full analysis"} <ChevronDown size={14} className={open ? "cs-rotate" : ""} /></button></CollapsibleTrigger>
        <CollapsibleContent><div className="cs-markdown"><ReactMarkdown>{details || "AI analysis is not available. Check the Gemini API configuration."}</ReactMarkdown></div></CollapsibleContent>
      </Collapsible>
    </article>
  );
});

const RiskTile = memo(function RiskTile({ reasons, level }) {
  return <article className="cs-tile cs-risk-tile">
    <div className="cs-tile-label"><AlertTriangle size={15} className="cs-amber-text" /> RISK FACTORS</div>
    {reasons?.length ? reasons.map((reason, i) => <div className="cs-factor" key={`${reason}-${i}`}><span>{reason}</span><Badge variant="outline" className={`cs-risk-tag cs-${riskTone(level)}`}>{level}</Badge></div>) : <p className="cs-muted">No major risk indicators detected.</p>}
  </article>;
});

function parseDiff(diff) {
  let oldLine = 0, newLine = 0, file = "";
  return String(diff || "").split("\n").map((text, i) => {
    if (text.startsWith("+++ b/")) file = text.slice(6);
    const hunk = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { oldLine = Number(hunk[1]); newLine = Number(hunk[2]); return { text, type: "hunk", i, file }; }
    if (text.startsWith("diff --git") || text.startsWith("--- ") || text.startsWith("+++ ") || text.startsWith("index ")) return { text, type: "meta", i, file };
    if (text.startsWith("+")) return { text, type: "added", old: "", next: newLine++, i, file };
    if (text.startsWith("-")) return { text, type: "removed", old: oldLine++, next: "", i, file };
    if (text.startsWith(" ")) return { text, type: "context", old: oldLine++, next: newLine++, i, file };
    return { text, type: "meta", i, file };
  });
}
const sensitiveLine = (line) => /password|secret|token|api[_-]?key|eval\(|exec\(|disable.*auth|verify\s*=\s*false/i.test(line);

const DiffTile = memo(function DiffTile({ diff, files }) {
  const lines = useMemo(() => parseDiff(diff), [diff]);
  return <article className="cs-tile cs-diff">
    <div className="cs-diff-heading"><div className="cs-tile-label"><FileCode2 size={15} /> CODE DIFF</div><span className="cs-muted cs-mono">{files?.length === 1 ? files[0] : `${files?.length || 0} changed files`}</span></div>
    <ScrollArea className="cs-diff-scroll"><div className="cs-code" role="region" aria-label="Git diff">
      {lines.map((line) => {
        const flagged = line.type === "added" && sensitiveLine(line.text);
        return <div key={line.i} className={`cs-code-line cs-code-${line.type} ${flagged ? "cs-code-flagged" : ""}`}>
          <span className="cs-line-number">{line.old ?? ""}</span><span className="cs-line-number">{line.next ?? ""}</span><span className="cs-line-text">{line.text || " "}{flagged && <span className="cs-line-flag">Review sensitive code</span>}</span>
        </div>;
      })}
    </div></ScrollArea>
  </article>;
});

const FilesTile = memo(function FilesTile({ files, added, removed, level }) {
  return <article className="cs-tile cs-files">
    <div className="cs-tile-label">CHANGED FILES</div>
    {files?.length ? files.map((file, i) => <div className="cs-file-row" key={`${file}-${i}`}>
      <span className={`cs-risk-dot cs-${riskTone(level)}`} /><code title={file}>{file}</code>
      <div className="cs-file-bars"><span className="cs-file-bar-add" style={{ flex: added || 0 }} /><span className="cs-file-bar-remove" style={{ flex: removed || 0 }} /></div>
      {files.length === 1 && <span className="cs-file-count"><span className="cs-added">{added ? `+${added}` : "0"}</span> <span className={removed ? "cs-removed" : "cs-muted"}>{removed ? `−${removed}` : "0"}</span></span>}
    </div>) : <p className="cs-muted">No changed files identified.</p>}
    {files?.length > 1 && <p className="cs-muted cs-file-note">+{added} / −{removed} lines across all files</p>}
  </article>;
});

const AreasTile = memo(function AreasTile({ areas }) {
  return <article className="cs-tile cs-areas"><div className="cs-tile-label">POTENTIALLY AFFECTED AREAS</div><div className="cs-chips">{areas?.length ? areas.map((area, i) => <Badge key={`${area}-${i}`} variant="outline" className="cs-chip">{area}</Badge>) : <span className="cs-muted">No specific areas identified.</span>}</div></article>;
});

const RecommendationsTile = memo(function RecommendationsTile({ recommendations }) {
  const [checked, setChecked] = useState({});
  const items = recommendations?.length ? recommendations : ["Review the changed code and run relevant tests."];
  return <article className="cs-tile cs-recommendations"><div className="cs-tile-label">RECOMMENDATIONS</div><div className="cs-check-grid">{items.map((item, i) => <label className="cs-check-row" key={`${item}-${i}`}><Checkbox checked={!!checked[i]} onCheckedChange={(value) => setChecked((old) => ({ ...old, [i]: value === true }))} /><span className={checked[i] ? "cs-checked" : ""}>{item}</span></label>)}</div></article>;
});

function LoadingResults() {
  return <div className="cs-loading" aria-label="Analyzing repository" role="status">
    <div className="cs-tile cs-loading-verdict"><Skeleton className="h-24 w-40" /><div className="cs-loading-lines"><Skeleton className="h-5 w-24" /><Skeleton className="h-8 w-4/5" /><Skeleton className="h-4 w-2/3" /></div></div>
    <div className="cs-bento"><Skeleton className="h-44 cs-skeleton" /><Skeleton className="h-44 cs-skeleton" /><Skeleton className="h-64 cs-skeleton" /><Skeleton className="h-64 cs-skeleton" /></div>
  </div>;
}

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [showLanding, setShowLanding] = useState(true);
  const [repoPath, setRepoPath] = useState("");
  const [commits, setCommits] = useState([]);
  const [oldHash, setOldHash] = useState("");
  const [newHash, setNewHash] = useState("");
  const [analysis, setAnalysis] = useState(null);
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
    if (type === "error") toast.error(text);
    else if (type === "success") toast.success(text);
    else toast.message(text);
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
    <><Toaster position="top-right" richColors closeButton />
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
            <h3>Commit Comparison</h3>
            <p>
              Compare two revisions and inspect exactly
              what changed in your repository.
            </p>
          </article>

          <article className="landing-feature">
            <h3>Risk Assessment</h3>
            <p>
              Get an estimated risk score and identify
              potentially affected code areas.
            </p>
          </article>

          <article className="landing-feature">
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
    </main></>
  );
}

  const risk = analysis?.risk_analysis;
  const impact = analysis?.impact_analysis;
  const comparison = analysis?.comparison;
  const level = risk?.risk_level || "LOW";
  const added = count(risk?.added_lines);
  const removed = count(risk?.removed_lines);
  const files = impact?.affected_files || [];
  const primaryFile = files.length === 1 ? files[0] : `${files.length} files`;
  const verdict = `${level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()} risk: ${primaryFile} changed, ${added ? `${added} lines added` : "none added"}, ${removed ? `${removed} removed` : "none removed"}.`;
  const fallback = `${files.length} file${files.length === 1 ? "" : "s"} changed with ${added} additions and ${removed} deletions. Review the risk factors and affected areas below.`;
  return (
    <main className="cs-app">
      <Toaster position="top-right" richColors closeButton />
      <header className="cs-topbar">
        <div className="cs-topbar-inner">
          <button className="cs-brand" type="button" onClick={() => setShowLanding(true)} aria-label="ChangeScope home">
            <span className="cs-logo">{"</>"}</span><strong>ChangeScope</strong>
          </button>
          {repoPath ? <div className="cs-repo-pill"><span className="cs-online" /><code>{getRepoName(repoUrl)}</code><span className="cs-pill-separator">·</span><span>{commits.length} commits</span><button type="button" onClick={() => { setRepoPath(""); setCommits([]); setAnalysis(null); }} className="cs-change-repo">Change</button></div> : <span className="cs-topbar-label">Change Impact & Risk Analyzer</span>}
        </div>
      </header>
      {!repoPath ? <section className="cs-connect">
        <div className="cs-connect-icon"><GitCompareArrows size={22} /></div>
        <h1>Connect a repository</h1>
        <p>Enter a public GitHub repository URL to compare commits and assess potential risks.</p>
        <form className="cs-connect-form" onSubmit={(event) => { event.preventDefault(); loadRepository(); }}>
          <input aria-label="GitHub repository URL" type="url" placeholder="https://github.com/owner/repository" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          <Button type="submit" disabled={loading || !repoUrl.trim()}>{loading ? <LoaderCircle className="cs-spin" size={16} /> : null}{loading ? "Connecting..." : "Connect repository"}</Button>
        </form>
      </section> : <>
        <section className="cs-command-bar">
          <div className="cs-command-inner">
            <CommitPicker label="FROM" commits={commits} value={oldHash} onChange={(value) => { setOldHash(value); setAnalysis(null); }} />
            <ArrowRight className="cs-arrow" size={18} />
            <CommitPicker label="TO" commits={commits} value={newHash} onChange={(value) => { setNewHash(value); setAnalysis(null); }} />
            <div className="cs-command-actions">
              <Button className="cs-analyze-btn" disabled={loading || !oldHash || !newHash || oldHash === newHash} onClick={() => runAnalysis(oldHash, newHash)}>{loading ? <LoaderCircle className="cs-spin" size={16} /> : <span className="cs-play">▶</span>}{loading ? "Analyzing..." : "Analyze"}</Button>
              <Button variant="outline" className="cs-ghost-btn" disabled={loading || commits.length < 2} onClick={analyzeLatestChanges}>Use latest 2 commits</Button>
              <Button variant="ghost" size="icon" aria-label="Refresh commits" title="Refresh commits" disabled={loading} onClick={refreshRepository}><RefreshCw size={17} /></Button>
            </div>
          </div>
        </section>
        <div className="cs-content">
          {loading ? <LoadingResults /> : analysis ? <>
            <section className="cs-verdict cs-tile">
              <Gauge score={risk?.risk_score} level={level} />
              <div className="cs-verdict-main">
                <Badge variant="outline" className={`cs-risk-tag cs-${riskTone(level)}`}>{level} RISK</Badge>
                <h1>{verdict}</h1>
                <p>{risk?.reasons?.[0] || "Review the changed code and run relevant tests before merging."}</p>
                <div className="cs-stats">
                  <div><span>FILES</span><strong>{impact?.total_affected_files ?? files.length}</strong></div>
                  <div><span>ADDED</span><strong className={added ? "cs-added" : "cs-muted"}>{added ? `+${added}` : "0"}</strong></div>
                  <div><span>REMOVED</span><strong className={removed ? "cs-removed" : "cs-muted"}>{removed ? `−${removed}` : "0"}</strong></div>
                </div>
                <details className="mt-4 rounded-lg border border-[#2B303A] bg-[#0A0C10] px-4 py-3 text-sm text-[#CDD2DE]">
                  <summary className="cursor-pointer select-none font-medium text-[#8B9CFF]">How is this risk score calculated?</summary>
                  <div className="mt-3 space-y-2 leading-6">
                    <p>Rule-based estimate, not a probability of bugs or failures.</p>
                    <p>Changed files: {files.length >= 5 ? "+30 (5 or more files)" : files.length >= 2 ? "+15 (2–4 files)" : "+0 (fewer than 2 files)"}</p>
                    <p>Changed lines: {added + removed > 100 ? "+35 (over 100 lines)" : added + removed > 30 ? "+20 (31–100 lines)" : "+0 (30 or fewer lines)"}</p>
                    <p>Sensitive filename: {risk?.reasons?.some((r) => String(r).startsWith("Sensitive file changed:")) ? "+30 (auth/security/database/config/payment/login)" : "+0"}</p>
                    <p className="font-semibold">Total: {risk?.risk_score ?? 0}/100 (capped at 100). Low: 0–29 · Medium: 30–69 · High: 70–100.</p>
                    <p>Testing and code review reduce real-world uncertainty, but do not automatically lower this heuristic score.</p>
                  </div>
                </details>
              </div>
            </section>
            <div className="cs-bento">
              <AiTile key={`${oldHash}-${newHash}`} explanation={analysis.ai_explanation} fallback={fallback} />
              <RiskTile reasons={risk?.reasons} level={level} />
              <DiffTile diff={comparison?.code_diff} files={files} />
              <div className="cs-side-stack">
                <FilesTile files={files} added={added} removed={removed} level={level} />
                <AreasTile areas={impact?.potentially_affected_areas} />
              </div>
              <RecommendationsTile key={`${oldHash}-${newHash}`} recommendations={impact?.recommendations} />
            </div>
            <p className="cs-disclaimer">Risk scores and impact categories are heuristic estimates. They do not confirm defects or actual dependency relationships. Review AI suggestions against the code.</p>
          </> : <div className="cs-empty"><GitCompareArrows size={28} /><h2>Ready to compare changes</h2><p>Select two commits and click Analyze to inspect the code diff, estimated risk, and AI-assisted insights.</p></div>}
        </div>
      </>}
    </main>
  );
}

export default App;
