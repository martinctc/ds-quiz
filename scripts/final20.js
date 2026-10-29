const fs = require('fs');
const path = require('path');
const FILE = path.resolve('questions.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// List of 20 new questions (2 per category)
const newQs = [
  // statistics
  { cat: 'statistics', id: 'stats-20', q: 'What is Type II error?', opts: ['False positive', 'False negative', 'Type I error', 'Sampling bias'], correct: 1, diff: 'medium', expl: 'Type II error is failing to reject a false null hypothesis (false negative).' },
  { cat: 'statistics', id: 'stats-21', q: 'What does skewness describe?', opts: ['Mean value', 'Asymmetry of distribution', 'Standard deviation', 'Correlation'], correct: 1, diff: 'easy', expl: 'Skewness measures how much a distribution deviates from symmetry.' },
  // machine_learning
  { cat: 'machine_learning', id: 'ml-20', q: 'What does dropout do in neural networks?', opts: ['Adds parameters', 'Randomly deactivates neurons during training', 'Removes layers', 'Sets weights to zero permanently'], correct: 1, diff: 'medium', expl: 'Dropout randomly sets a fraction of neuron outputs to zero during training to prevent co-adaptation.' },
  { cat: 'machine_learning', id: 'ml-21', q: 'What is a hyperparameter?', opts: ['Model prediction', 'A setting configured before training (e.g., learning rate)', 'A feature value', 'A label'], correct: 1, diff: 'easy', expl: 'Hyperparameters are configuration variables set by the practitioner, not learned from data.' },
  // programming
  { cat: 'programming', id: 'prog-20', q: 'What does the Python `len()` function return?', opts: ['Memory size', 'Number of elements', 'Data type', 'First index'], correct: 1, diff: 'easy', expl: '`len()` returns the count of elements in a sequence or collection.' },
  { cat: 'programming', id: 'prog-21', q: 'Which Python structure is immutable?', opts: ['List', 'Set', 'Tuple', 'Dict'], correct: 2, diff: 'easy', expl: 'Tuples are immutable; lists, sets, and dicts are mutable.' },
  // data_manipulation
  { cat: 'data_manipulation', id: 'dm-20', q: 'Which SQL operation combines rows from two tables using matching values?', opts: ['JOIN', 'UNION', 'INTERSECT', 'EXCEPT'], correct: 0, diff: 'easy', expl: 'JOIN matches rows across tables based on a common key.' },
  { cat: 'data_manipulation', id: 'dm-21', q: 'In pandas, which method selects rows by label?', opts: ['iloc', 'loc', 'filter', 'map'], correct: 1, diff: 'medium', expl: '`loc` selects by index label, while `iloc` selects by integer position.' },
  // mathematics
  { cat: 'mathematics', id: 'math-20', q: 'What is the slope of a line y = mx + b?', opts: ['m', 'b', 'x', 'y'], correct: 0, diff: 'easy', expl: 'In y = mx + b, m is the slope and b is the y-intercept.' },
  { cat: 'mathematics', id: 'math-21', q: 'Which series is the sum of the first n integers?', opts: ['Geometric', 'Arithmetic', 'Harmonic', 'Factorial'], correct: 1, diff: 'medium', expl: 'The sequence 1, 3, 6, 10... is arithmetic in differences.' },
  // domain_knowledge
  { cat: 'domain_knowledge', id: 'domain-20', q: 'What is the difference between correlation and causation?', opts: ['None', 'Correlation implies causation', 'Causation implies correlation', 'They are unrelated'], correct: 2, diff: 'easy', expl: 'Causation implies correlation, but correlation alone does not prove causation.' },
  { cat: 'domain_knowledge', id: 'domain-21', q: 'What is data product management?', opts: ['Writing SQL', 'Building data-driven products with business goals', 'Cleaning data', 'Storing data'], correct: 1, diff: 'medium', expl: 'Data product management focuses on delivering data products aligned to business outcomes.' },
  // data_engineering
  { cat: 'data_engineering', id: 'de-20', q: 'What is a data pipeline?', opts: ['A database index', 'A sequence of data processing steps', 'A chart type', 'A data format'], correct: 1, diff: 'easy', expl: 'A pipeline is the automated flow from ingestion through transformation to destination.' },
  { cat: 'data_engineering', id: 'de-21', q: 'What is idempotency?', opts: ['Speed', 'Same result when run multiple times', 'Always using same code', 'No errors'], correct: 1, diff: 'medium', expl: 'Idempotent operations can be safely repeated without changing the system state.' },
  // data_visualization
  { cat: 'data_visualization', id: 'dv-20', q: 'When should log scales be avoided?', opts: ['When comparing small ranges', 'When comparing percentages', 'For exponential growth', 'When range spans orders of magnitude'], correct: 0, diff: 'medium', expl: 'Log scales can mislead when the range is small or includes zero/negative.' },
  { cat: 'data_visualization', id: 'dv-21', q: 'Which chart shows a single value over time?', opts: ['Pie chart', 'Line chart', 'Bar chart', 'Scatter plot'], correct: 1, diff: 'easy', expl: 'A line chart is ideal for time-series trends.' },
  // ethics_governance
  { cat: 'ethics_governance', id: 'eg-20', q: 'Which of these is a fairness metric?', opts: ['Accuracy', 'Demographic parity', 'F1 score', 'MAE'], correct: 1, diff: 'medium', expl: 'Demographic parity requires equal positive rates across groups.' },
  { cat: 'ethics_governance', id: 'eg-21', q: 'What is consent withdrawal?', opts: ['Canceling a project', 'Withdrawing permission for data use', 'Deleting data', 'Changing settings'], correct: 1, diff: 'easy', expl: 'Consent withdrawal lets individuals revoke permission to use their data.' },
  // llm_ai_agents
  { cat: 'llm_ai_agents', id: 'llm-ai-agents-20', q: 'What is a "system prompt"?', opts: ['A hardware prompt', 'Instructions defining model behavior', 'A user message', 'A database query'], correct: 1, diff: 'easy', expl: 'System prompts set the model role, rules, and constraints.' },
  { cat: 'llm_ai_agents', id: 'llm-ai-agents-21', q: 'What is an agent loop?', opts: ['A loop in code', 'Observe-think-act cycle', 'A data loop', 'A training loop'], correct: 1, diff: 'medium', expl: 'Agent loops consist of observation, planning/thinking, and action/tool use.' }
];

let added = 0;
for (const item of newQs) {
  const cat = item.cat;
  const q = item;
  const existingIds = data[cat].map(x => x.id);
  if (existingIds.includes(q.id)) {
    console.log('Skip duplicate:', q.id);
    continue;
  }
  data[cat].push({ id: q.id, question: q.q, options: q.opts, correctAnswer: q.correct, difficulty: q.diff, explanation: q.expl });
  added++;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 4) + '\n');
console.log('Added', added, 'questions. Total:', Object.values(data).reduce((a, b) => a + b.length, 0));
