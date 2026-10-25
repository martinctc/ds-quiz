# Data Science Knowledge Assessment

Single-page assessment tool that helps data professionals measure strengths and growth areas across core disciplines. Built with vanilla HTML, CSS, and JavaScript so it deploys anywhere static files are supported (including GitHub Pages).

## ✨ Features

- Question bank grouped into six categories: statistics, machine learning, programming, data manipulation, mathematics, and domain knowledge.
- Configurable sampling of questions per category with automatic shuffling of both questions and answer options.
- Flexible delivery: present one question at a time or all questions at once, with optional review step before submission.
- Timer support, progress tracking, and the ability to revisit answers prior to submitting.
- Detailed results view with overall score, category breakdown, strengths/weaknesses, explanations, and a bar chart (via Chart.js).
- Print-friendly layout so participants can download or print their results.
- Responsive, accessible UI that adapts from desktop to mobile.

## 🗂 Project Structure

```
/ (GitHub Pages ready)
├── index.html       # Main entry point
├── style.css        # Styles (responsive + print-ready)
├── app.js           # Application logic and state management
├── questions.json   # Question bank grouped by category
├── config.json      # Assessment configuration options
├── scripts/
│   └── validate-questions.mjs  # Schema validation for the question bank and config
├── .github/workflows/
│   ├── deploy.yml   # Publishes the site to GitHub Pages
│   └── validate.yml # Validates the question bank on push / pull request
└── README.md        # Project documentation
```

## 🚀 Getting Started

### 1. Clone or download

```powershell
git clone https://github.com/<your-account>/ds-quiz.git
cd ds-quiz
```

### 2. Serve the files locally

Because the app loads JSON via `fetch`, you should run it from a local web server (e.g., VS Code Live Server, `python -m http.server`, or `npx serve`).

```powershell
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

### 3. Explore the quiz

Open `index.html` in your browser via the local server. Start the assessment, answer questions, review your selections, and submit to see detailed results.

## ⚙️ Configuration (`config.json`)

All runtime settings live in `config.json`. Key properties:

| Key | Type | Description |
| --- | --- | --- |
| `questionCounts` | object | Number of questions to sample from each category (must not exceed available questions). |
| `displayMode` | string | `"one-at-a-time"` (default) or `"all-at-once"`. |
| `allowReview` | boolean | Enables the dedicated review screen before final submission. |
| `shuffleQuestions` | boolean | Randomizes question order after sampling. |
| `shuffleOptions` | boolean | Shuffles answer options for each question. |
| `passingScore` | number | Threshold percentage used to determine pass/fail. |
| `strengthThreshold` | number | Categories at or above this % are labeled strengths. |
| `weaknessThreshold` | number | Categories at or below this % are highlighted as focus areas. |
| `timeLimitMinutes` | number \| null | Optional timer. Set to `null` to disable. |

Example:

```json
{
	"questionCounts": {
		"statistics": 4,
		"machine_learning": 4,
		"programming": 4,
		"data_manipulation": 4,
		"mathematics": 4,
		"domain_knowledge": 4
	},
	"displayMode": "one-at-a-time",
	"allowReview": true,
	"shuffleQuestions": true,
	"shuffleOptions": true,
	"passingScore": 75,
	"strengthThreshold": 75,
	"weaknessThreshold": 60,
	"timeLimitMinutes": 30
}
```

## 📝 Adding or Editing Questions (`questions.json`)

Questions are grouped by category and follow a consistent schema:

```json
{
	"statistics": [
		{
			"id": "statistics-1",
			"question": "Which scenario best describes a Type I error?",
			"options": ["Rejecting a false null hypothesis", "Failing to reject a true null hypothesis", "Rejecting a true null hypothesis", "Failing to reject a false null hypothesis"],
			"correctAnswer": 2,
			"difficulty": "medium",
			"explanation": "A Type I error occurs when the null hypothesis is true but is incorrectly rejected."
		}
	],
	"machine_learning": [
		// ...
	]
}
```

Guidelines:

- Use a unique `id` per question (prefix by category for clarity).
- Provide exactly four options; `correctAnswer` is the **zero-based index** of the correct option.
- Keep explanations concise but informative—these display after submission.
- Maintain at least as many questions per category as your `questionCounts` request to preserve randomness.

## ✅ Validating the Question Bank

`questions.json` and `config.json` are validated by a small Node script so schema drift and typos are caught before deployment.

Run locally (Node 18+):

```powershell
node scripts/validate-questions.mjs
```

The script checks for:

- One array per category in `questions.json`.
- Unique, non-empty question `id`s.
- Exactly four non-empty `options` per question.
- `correctAnswer` as an integer between 0 and 3.
- A non-empty `explanation` and a valid `difficulty` (`easy`, `medium`, `hard`).
- `questionCounts` that reference real categories and do not exceed the available questions.

The same check runs automatically on every push to `main` and on pull requests via `.github/workflows/validate.yml`.

## ⚠️ Scope & Limitations

This tool is a **self-assessment for learning and practice**. It is not a certification, a validated psychometric instrument, or a substitute for professional evaluation. Scores are based on a small random sample of questions per category and can vary between attempts.

## 📄 Content & Licensing

No license is currently declared for this repository. Before distributing or reusing the content publicly, decide and document:

- **Code** (`index.html`, `style.css`, `app.js`, `scripts/`): e.g. MIT or Apache-2.0.
- **Question bank** (`questions.json`) and documentation: e.g. CC BY 4.0 or CC0.
- **Provenance**: confirm each question is original or, if adapted, record the source and its license.

Add the chosen license as a `LICENSE` file and link it from this section.

## 🎨 Customization Tips

- Update colors or typography in `style.css` by adjusting the CSS variables declared under `:root`.
- Extend the review or results views by modifying templates inside `app.js` (`createQuestionMarkup`, `renderReviewList`, `renderResults`).
- To add new categories, create a new key in `questions.json`, add a corresponding entry in `questionCounts`, and optionally style a new badge in CSS.

## 🌐 Deploying to GitHub Pages

Deployment is handled by `.github/workflows/deploy.yml`:

1. Push to `main`, or run the workflow manually from the **Actions** tab.
2. The workflow uploads the repository as a Pages artifact and deploys it.
3. The published site is available at `https://<owner>.github.io/<repo>/`.

One-time setup: in **Settings → Pages**, set **Source** to **GitHub Actions**.

No build step is required—`config.json` and `questions.json` are served as static assets.

## ✅ Verification Checklist

- [x] Works purely in the browser with static hosting.
- [x] Loads questions and configuration from external JSON files.
- [x] Provides review and timer features when enabled.
- [x] Displays answers, explanations, and category-level insights on completion.

Enjoy tailoring the assessment for your team or learners! 🚀
