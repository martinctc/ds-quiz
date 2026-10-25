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

## 🎨 Customization Tips

- Update colors or typography in `style.css` by adjusting the CSS variables declared under `:root`.
- Extend the review or results views by modifying templates inside `app.js` (`createQuestionMarkup`, `renderReviewList`, `renderResults`).
- To add new categories, create a new key in `questions.json`, add a corresponding entry in `questionCounts`, and optionally style a new badge in CSS.

## 🌐 Deploying to GitHub Pages

1. Push the repository to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Choose the `main` branch with the `/ (root)` folder and save.
4. After Pages finishes building, visit the published URL to access the quiz.

No additional build step is required—just ensure `config.json` and `questions.json` are committed so they can be fetched by the client.

## ✅ Verification Checklist

- [x] Works purely in the browser with static hosting.
- [x] Loads questions and configuration from external JSON files.
- [x] Provides review and timer features when enabled.
- [x] Displays answers, explanations, and category-level insights on completion.

Enjoy tailoring the assessment for your team or learners! 🚀
