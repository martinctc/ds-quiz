
## Prompt for Code-Dev AI Agent:
Create a single-page web application for a Data Science knowledge assessment test with the following specifications:

## Core Requirements:

1. Tech Stack: Pure HTML, CSS, and JavaScript (no frameworks) - must be deployable to GitHub Pages 
2. Question Bank: Store all questions in a questions.json file with this structure: 
  * Categories: statistics, machine_learning, programming, data_manipulation, mathematics, domain_knowledge 
  * Each question has: id, question text, 4 options, correct answer index, difficulty level, explanation 
3. Randomization: 
  * Randomly select a subset of questions from each category (configurable per category) 
  * Shuffle question order 
  * Shuffle answer option order (so correct answer isn't always in same position) 
4. User Flow: 
  * Welcome screen explaining the test 
  * Display questions one at a time or all at once (configurable) 
  * Progress tracker 
  * Allow review/change answers before final submission 
  * Submit button to calculate results 

## Scoring & Results:

- Calculate overall score (percentage correct) 
- Break down score by category with percentages 
- Identify strength areas (>75%) and weakness areas (<60%) 
- Display detailed explanations for all questions after submission 
- Visual presentation of results (can use Chart.js for bar charts) 
- Option to download/print results 

## Configuration:

- Create a config.json for settings like: Number of questions to select per category 
  - Passing score threshold 
  - Time limit (optional) 

## File Structure:

```
/
├── index.html
├── style.css
├── app.js
├── questions.json
├── config.json
└── README.md
```


## Additional Features:

- Responsive design (works on mobile and desktop) 
- Clean, professional UI 
- README with instructions on how to add new questions to the JSON file 
- Example questions (5-10 per category) to demonstrate 


## Deployment:

- Must work as static files on GitHub Pages (no build process) 
- All processing happens client-side 
- Make the code well-commented and modular so it's easy to maintain and update the question bank.
