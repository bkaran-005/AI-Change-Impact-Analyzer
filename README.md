# ChangeScope
### AI-Powered Change Impact & Risk Analyzer

**Understand the impact. Ship with confidence.**

ChangeScope is an AI-assisted code change analysis tool that helps developers compare GitHub commits, assess potential risks, and understand how code changes may affect their projects before deployment.

It combines Git-based change analysis, heuristic risk scoring, and Google Gemini-powered explanations in a modern, interactive dashboard.

## Key Features

- **GitHub Repository Integration:** Connect a public GitHub repository and retrieve its commit history.
- **Commit Comparison:** Select two commits and inspect the changes between them.
- **Risk Assessment:** Generate a heuristic risk score from 0 to 100 using factors such as changed files, code volume, and sensitive file changes.
- **AI-Powered Insights:** Get concise summaries and detailed explanations of potential impact, risk factors, and recommended tests using Google Gemini.
- **Interactive Code Changes:** Browse changed files and inspect highlighted additions and deletions in a focused dialog.
- **Sensitive Code Indicators:** Highlight potentially sensitive changes for additional review.
- **Analysis Caching:** Reuse previously generated results for identical commit comparisons to reduce repeated analysis time.
- **Actionable Recommendations:** Review suggested checks and tests before deploying changes.
- **Modern Dashboard:** Responsive dark-themed interface built with React, Tailwind CSS, and shadcn/ui.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Backend | Python, FastAPI |
| AI | Google Gemini API |
| Version Control | Git, GitHub |
| API Communication | REST APIs |

## How It Works

1. Connect a public GitHub repository.
2. Fetch the available commits.
3. Select the source and target commits.
4. Compare the revisions using Git.
5. Calculate a heuristic risk score.
6. Generate AI-assisted explanations and recommendations.
7. Explore the results through the dashboard and interactive code diff viewer.

## Getting Started

### Prerequisites

- Python 3.10 or later
- Node.js and npm
- Git
- A Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/bkaran-005/AI-Change-Impact-Analyzer.git
cd AI-Change-Impact-Analyzer
```

### 2. Set up the backend

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure the Gemini API key

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Never commit your real API key to GitHub.

### 4. Start the backend

From the project root:

```bash
python -m uvicorn app.main:application --reload
```

The backend runs at:

`http://localhost:8000`

Interactive API documentation:

`http://localhost:8000/docs`

### 5. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the application at:

`http://localhost:5173`

## Risk Scoring

ChangeScope uses rule-based heuristics to estimate the potential risk of a code change.

The assessment considers factors such as:

- Number of changed files
- Number of added and removed lines
- Changes to potentially sensitive files

The final score ranges from **0 to 100** and is presented with a risk category.

**Important:** Risk scores are heuristic estimates, not probabilities of failure or proof that a vulnerability exists. AI-generated insights should also be reviewed against the actual code.

## Performance Optimization

ChangeScope uses analysis caching to avoid repeating expensive AI requests for identical commit comparisons.

When a result is already cached, the application can return it substantially faster than a new Gemini API request. First-time analysis may take longer depending on AI response latency and the size of the changes.

## Screenshots

Screenshots of the landing page, risk dashboard, AI analysis dialog, and code changes viewer can be added here.

## Future Enhancements

- Support for private repositories through secure authentication
- Pull request-based analysis
- Automated test recommendations
- Exportable analysis reports
- CI/CD integration

## Project Status

**Functional academic capstone project.**

ChangeScope is intended to support developer decision-making during code reviews and pre-deployment checks.

## Author

**Karan**

GitHub: https://github.com/bkaran-005

---

Built to make code changes easier to understand and safer to review.