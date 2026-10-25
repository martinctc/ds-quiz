# Data Science Knowledge Assessment

Single-page assessment tool that helps data professionals measure strengths and growth areas across core disciplines. Built with vanilla HTML, CSS, and JavaScript so it deploys anywhere static files are supported (including GitHub Pages).

## ✨ Features

- Question bank grouped into nine categories: statistics, machine learning, programming, data manipulation, mathematics, domain knowledge, data engineering, data visualization, and ethics/governance.
- Selectable assessment length (Quick, Standard, Full) with matching time limits.
- Configurable sampling of questions per category with automatic shuffling of both questions and answer options.
- Flexible delivery: present one question at a time or all questions at once, with optional review step before submission.
- Timer support, progress tracking, and the ability to revisit answers prior to submitting.
- Detailed post-submission results with overall score, category breakdown, strengths/weaknesses, a bar chart, and per-question explanations that highlight the correct answer and the user's choice.
- Attempt history saved in the browser with a best/latest/change summary card, an expandable per-attempt table, and a clear-history control.
- Touch-friendly controls plus swipe navigation (left for next, right for previous) in one-question-at-a-time mode.
- Optional in-browser question-bank admin panel (`?admin=1`) for prototyping new questions without editing JSON.
- Print-friendly layout so participants can download or print their results.
- Keyboard-friendly, screen-reader-friendly UI with focus management, ARIA labelling, an accessible data table for the chart, and reduced-motion support.

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
| `presets` | object | Named assessment lengths. Each preset defines `label`, `totalQuestions`, and optional `timeLimitMinutes`. Questions are distributed as evenly as possible across categories. |
| `defaultPreset` | string | Key of the preset selected by default (e.g. `"standard"`). |
| `displayMode` | string | `"one-at-a-time"` (default) or `"all-at-once"`. |
| `allowReview` | boolean | Enables the dedicated review screen before final submission. |
| `shuffleQuestions` | boolean | Randomizes question order after sampling. |
| `shuffleOptions` | boolean | Shuffles answer options for each question. |
| `passingScore` | number | Threshold percentage used to determine pass/fail. |
| `strengthThreshold` | number | Categories at or above this % are labeled strengths. |
| `weaknessThreshold` | number | Categories at or below this % are highlighted as focus areas. |
| `timeLimitMinutes` | number \| null | Fallback timer used only when a preset omits `timeLimitMinutes`. |
| `showHistory` | boolean | Enables the browser-local attempt history. Defaults to `true`. |
| `historyLimit` | number | Maximum number of attempts kept in `localStorage`. Defaults to `20`. |

`questionCounts` is still supported as a legacy fallback when `presets` is absent. When both are present, `presets` takes precedence.

Example:

```json
{
	"presets": {
		"quick": { "label": "Quick", "totalQuestions": 10, "timeLimitMinutes": 10 },
		"standard": { "label": "Standard", "totalQuestions": 20, "timeLimitMinutes": 20 },
		"full": { "label": "Full", "totalQuestions": 30, "timeLimitMinutes": 30 }
	},
	"defaultPreset": "standard",
	"displayMode": "one-at-a-time",
	"allowReview": true,
	"shuffleQuestions": true,
	"shuffleOptions": true,
	"passingScore": 75,
	"strengthThreshold": 75,
	"weaknessThreshold": 60,
	"timeLimitMinutes": 20,
	"showHistory": true,
	"historyLimit": 20
}
```

## 💾 Attempt History

Completed attempts are saved in the browser's `localStorage` under the key `ds-quiz:attempts:v1`. The welcome screen shows:

- A summary line plus four stat cards: attempts, best score, latest score, and the change since the previous attempt.
- A collapsible **Show details** table with completion time, assessment length, score, pass/fail, and time taken.
- A **Clear history** button.

Notes:

- History is per browser and per device. It is never uploaded.
- Only summary data is stored (score, category percentages, timing). Individual answers are not saved.
- Set `showHistory` to `false` to disable the feature, and use `historyLimit` to cap how many attempts are retained.
- If `localStorage` is unavailable (for example, strict private browsing), the assessment still works and history is simply not saved.

## 🛠 Question Bank Admin Panel (`?admin=1`)

Append `?admin=1` to the site URL to open a side panel for prototyping questions:

- Add a question with four options, a correct answer, an explanation, a category, and a difficulty.
- Added questions are written to `localStorage` under `ds-quiz:admin-questions:v1`, merged into the in-memory bank for future attempts, and included in category counts.
- See every custom question and the current per-category totals, then remove all custom questions with one click.
- Close the panel with the **Close** button or the <kbd>Esc</kbd> key.

Notes:

- `questions.json` is never modified; refreshing the page cannot lose shipped questions.
- Custom questions are per browser and per device. To make a question permanent, add it to `questions.json` and run `node scripts/validate-questions.mjs`.
- The panel is hidden on normal page loads and is excluded from the printed results.

## ♿ Accessibility

- Semantic landmarks, a skip link, and labelled sections and headings.
- Keyboard support for length selection, answer options, navigation, review, and results.
- Focus moves to the current question or the new screen heading after navigation so screen-reader users are not stranded.
- Radio groups are labelled by their question text, progress is exposed as a `progressbar`, and the timer announces 5-minute and 1-minute warnings through a polite live region.
- The results chart has a visually hidden data table as its text alternative.
- Interactive targets (answer options, buttons, preset rows) are at least 44px tall, and swipe gestures supplement rather than replace buttons.
- Colour choices target WCAG AA contrast, and motion is reduced when `prefers-reduced-motion` is set.

## 📱 Mobile Behaviour

- Answer options, buttons, the timer pill, and preset rows meet the 44px touch-target guideline.
- In one-question-at-a-time mode, swiping left advances and swiping right returns; mostly-vertical gestures are ignored so the page still scrolls.
- The history stat cards reflow to two columns on narrow screens, and the admin panel becomes full width.
- Swipe navigation is disabled in all-at-once mode, where every question is already on screen.

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

### Difficulty rubric

Use this rubric when assigning `difficulty` so the meaning of each level stays consistent across categories:

| Level | What it tests | Example |
| --- | --- | --- |
| `easy` | Recall or recognition of a single concept, definition, or fact. | "Which distribution models the number of successes in n independent Bernoulli trials?" |
| `medium` | Application or interpretation, often combining two concepts or reading a result correctly. | "A hypothesis test returns a p-value of 0.03. Which interpretation is correct?" |
| `hard` | Multi-step reasoning, edge cases, trade-offs, or specialized knowledge. | "Why can a mutable default argument such as `def f(x=[])` cause subtle bugs in Python?" |

A useful check: if a practitioner who knows the concept can answer on first read, it is `easy`; if they must reason or apply it, `medium`; if they need deep or specialized reasoning, `hard`.

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
- Presets that reference real categories, fit within the available question counts, and define valid time limits.
- History settings (`showHistory`, `historyLimit`) when present.

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
- To add new categories, create a new key in `questions.json` and make sure each preset still has enough questions to sample from it.
- Attempt history uses the `ds-quiz:attempts:v1` `localStorage` key. Change `historyLimit` to control retention, or `showHistory` to disable it.
- Custom admin questions use the `ds-quiz:admin-questions:v1` `localStorage` key and are merged into `state.questions` at startup.
- When changing markup, preserve the `aria-labelledby` relationships, the focus targets, and the hidden chart data table so screen-reader support keeps working.
- The swipe threshold lives in `SWIPE_MIN_DISTANCE` (`app.js`); raise it if accidental swipes occur on small screens.

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
- [x] Saves attempt summaries in the browser and lets users clear them.
- [x] Shows attempt trends through history stat cards and an expandable attempt table.
- [x] Supports keyboard navigation, visible focus, labelled controls, and an accessible chart alternative.
- [x] Meets 44px touch-target sizing and supports swipe navigation in one-at-a-time mode.
- [x] Offers a `?admin=1` panel for adding prototype questions without touching `questions.json`.

Enjoy tailoring the assessment for your team or learners! 🚀
