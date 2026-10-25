'use strict';

const state = {
    config: null,
    questions: {},
    selectedQuestions: [],
    currentIndex: 0,
    answers: new Map(),
    timerInterval: null,
    remainingSeconds: 0,
    chart: null,
    isComplete: false,
    autoSubmitted: false
};

const dom = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    attachEventListeners();
    initializeApp();
});

function cacheDom() {
    dom.welcomeScreen = document.getElementById('welcome-screen');
    dom.quizScreen = document.getElementById('quiz-screen');
    dom.reviewScreen = document.getElementById('review-screen');
    dom.resultsScreen = document.getElementById('results-screen');
    dom.configSummary = document.getElementById('config-summary');
    dom.startBtn = document.getElementById('start-btn');
    dom.prevBtn = document.getElementById('prev-btn');
    dom.nextBtn = document.getElementById('next-btn');
    dom.reviewBtn = document.getElementById('review-btn');
    dom.submitBtn = document.getElementById('submit-btn');
    dom.finalSubmitBtn = document.getElementById('final-submit-btn');
    dom.editAnswersBtn = document.getElementById('edit-answers-btn');
    dom.retryBtn = document.getElementById('retry-btn');
    dom.printBtn = document.getElementById('print-btn');
    dom.questionContainer = document.getElementById('question-container');
    dom.progressText = document.getElementById('progress-text');
    dom.progressFill = document.getElementById('progress-fill');
    dom.reviewList = document.getElementById('review-list');
    dom.resultSummary = document.getElementById('result-summary');
    dom.scoreBreakdown = document.getElementById('score-breakdown');
    dom.strengthsWeaknesses = document.getElementById('strengths-weaknesses');
    dom.explanations = document.getElementById('explanations');
    dom.timer = document.getElementById('timer');
    dom.categoryChart = document.getElementById('category-chart');
}

function attachEventListeners() {
    dom.startBtn?.addEventListener('click', startAssessment);
    dom.prevBtn?.addEventListener('click', () => navigateQuestion(-1));
    dom.nextBtn?.addEventListener('click', () => navigateQuestion(1));
    dom.reviewBtn?.addEventListener('click', showReview);
    dom.submitBtn?.addEventListener('click', () => {
        if (state.config?.allowReview) {
            showReview();
        } else {
            finalizeAssessment();
        }
    });
    dom.finalSubmitBtn?.addEventListener('click', () => finalizeAssessment());
    dom.editAnswersBtn?.addEventListener('click', returnToQuestions);
    dom.retryBtn?.addEventListener('click', resetAssessment);
    dom.printBtn?.addEventListener('click', () => window.print());

    dom.questionContainer?.addEventListener('change', handleAnswerChange);
    dom.reviewList?.addEventListener('click', handleReviewNavigation);
}

async function initializeApp() {
    try {
        const [config, questions] = await Promise.all([
            fetch('config.json').then(res => {
                if (!res.ok) throw new Error('Failed to load config.json');
                return res.json();
            }),
            fetch('questions.json').then(res => {
                if (!res.ok) throw new Error('Failed to load questions.json');
                return res.json();
            })
        ]);

        state.config = config;
        state.questions = questions;
        renderConfigSummary();
        configureUiFromSettings();
    } catch (error) {
        console.error('Failed to initialize application', error);
        dom.configSummary.innerHTML = '<p class="error">Unable to load configuration or questions. Please refresh the page.</p>';
        dom.startBtn.disabled = true;
    }
}

function renderConfigSummary() {
    if (!state.config) return;

    const counts = state.config.questionCounts || {};
    const items = Object.keys(counts).map(category => {
        const requested = counts[category];
        const available = (state.questions?.[category] || []).length;
        const note = available < requested
            ? `Only ${available} available`
            : `${requested} of ${available} available`;
        return `<li><strong>${formatCategory(category)}</strong>: ${note}</li>`;
    });

    dom.configSummary.innerHTML = `
        <div class="config-card">
            <h3>Assessment Settings</h3>
            <ul>${items.join('')}</ul>
            <p>Display mode: <strong>${formatDisplayMode(state.config.displayMode)}</strong></p>
            <p>Passing score: <strong>${state.config.passingScore}%</strong></p>
            ${state.config.timeLimitMinutes ? `<p>Time limit: <strong>${state.config.timeLimitMinutes} minutes</strong></p>` : '<p>No time limit</p>'}
            ${state.config.allowReview ? '<p>Review enabled before submission</p>' : '<p>Review disabled</p>'}
        </div>
    `;
}

function configureUiFromSettings() {
    if (!state.config) return;
    dom.reviewBtn?.classList.toggle('hidden', !state.config.allowReview);
    dom.reviewScreen?.classList.toggle('hidden', !state.config.allowReview);
    dom.submitBtn.textContent = state.config.allowReview ? 'Submit' : 'Submit Assessment';
    dom.timer.textContent = '';
    dom.timer.setAttribute('aria-hidden', 'true');
}

function startAssessment() {
    if (!state.config || !state.questions) return;

    prepareSelectedQuestions();

    if (!state.selectedQuestions.length) {
        dom.configSummary.innerHTML = '<p class="error">No questions available with the current configuration.</p>';
        return;
    }

    state.answers = new Map();
    state.currentIndex = 0;
    state.isComplete = false;
    state.autoSubmitted = false;

    switchView('quiz');
    renderQuestions();
    updateNavigationState();
    updateProgress();
    startTimer();
}

function prepareSelectedQuestions() {
    const selection = [];
    const counts = state.config.questionCounts || {};

    Object.keys(counts).forEach(category => {
        const requested = counts[category];
        const pool = [...(state.questions[category] || [])];
        if (!pool.length) return;

        shuffleArray(pool);
        const sampleSize = Math.min(requested, pool.length);

        for (let i = 0; i < sampleSize; i += 1) {
            const question = cloneQuestionWithCategory(pool[i], category);
            selection.push(question);
        }
    });

    if (state.config.shuffleQuestions) {
        shuffleArray(selection);
    }

    state.selectedQuestions = selection;
}

function cloneQuestionWithCategory(question, category) {
    const cloned = {
        id: question.id,
        question: question.question,
        options: [...question.options],
        correctAnswer: question.correctAnswer,
        difficulty: question.difficulty,
        explanation: question.explanation,
        category
    };

    if (state.config.shuffleOptions) {
        const optionPairs = cloned.options.map((option, index) => ({ option, index }));
        shuffleArray(optionPairs);
        cloned.options = optionPairs.map(pair => pair.option);
        cloned.correctAnswer = optionPairs.findIndex(pair => pair.index === question.correctAnswer);
    }

    return cloned;
}

function renderQuestions() {
    const total = state.selectedQuestions.length;
    if (!total) return;

    if (state.config.displayMode === 'all-at-once') {
        const markup = state.selectedQuestions
            .map((question, index) => createQuestionMarkup(question, index))
            .join('');
        dom.questionContainer.innerHTML = markup;
    } else {
        const question = state.selectedQuestions[state.currentIndex];
        dom.questionContainer.innerHTML = createQuestionMarkup(question, state.currentIndex);
    }
}

function createQuestionMarkup(question, index) {
    const selectedIndex = state.answers.has(question.id) ? state.answers.get(question.id) : null;
    const optionsMarkup = question.options
        .map((optionText, optionIndex) => {
            const inputId = `${question.id}-${optionIndex}`;
            const isSelected = selectedIndex === optionIndex;
            return `
                <div class="option${isSelected ? ' selected' : ''}" data-question-id="${question.id}" data-option-index="${optionIndex}">
                    <input type="radio" id="${inputId}" name="${question.id}" value="${optionIndex}" ${isSelected ? 'checked' : ''} />
                    <label for="${inputId}">${optionText}</label>
                </div>
            `;
        })
        .join('');

    return `
        <article class="question-card" data-question-id="${question.id}" data-index="${index}">
            <header class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    <p class="question-text">${question.question}</p>
                </div>
                <div class="question-meta">
                    <span class="badge category">${formatCategory(question.category)}</span>
                    <span class="badge difficulty ${question.difficulty}">${formatDifficulty(question.difficulty)}</span>
                </div>
            </header>
            <div class="option-list">
                ${optionsMarkup}
            </div>
        </article>
    `;
}

function handleAnswerChange(event) {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;

    const questionId = input.name;
    const selectedOption = Number(input.value);

    state.answers.set(questionId, selectedOption);

    if (state.config.displayMode === 'all-at-once') {
        highlightSelectedOption(questionId);
    } else {
        renderQuestions();
    }

    updateProgress();
}

function highlightSelectedOption(questionId) {
    const questionCard = dom.questionContainer.querySelector(`[data-question-id="${questionId}"]`);
    if (!questionCard) return;

    questionCard.querySelectorAll('.option').forEach(optionEl => {
        const optionIndex = Number(optionEl.dataset.optionIndex);
        if (optionIndex === state.answers.get(questionId)) {
            optionEl.classList.add('selected');
        } else {
            optionEl.classList.remove('selected');
        }
    });
}

function navigateQuestion(direction) {
    if (state.config.displayMode === 'all-at-once') return;

    const total = state.selectedQuestions.length;
    state.currentIndex = Math.max(0, Math.min(total - 1, state.currentIndex + direction));
    renderQuestions();
    updateNavigationState();
    updateProgress();
}

function updateNavigationState() {
    const total = state.selectedQuestions.length;
    const isAllAtOnce = state.config.displayMode === 'all-at-once';

    if (isAllAtOnce) {
        dom.prevBtn.classList.add('hidden');
        dom.nextBtn.classList.add('hidden');
    } else {
        dom.prevBtn.classList.remove('hidden');
        dom.nextBtn.classList.remove('hidden');
        dom.prevBtn.disabled = state.currentIndex === 0;
        dom.nextBtn.disabled = state.currentIndex === total - 1;
    }
}

function showReview() {
    if (!state.config.allowReview) {
        finalizeAssessment();
        return;
    }

    renderReviewList();
    switchView('review');
}

function renderReviewList() {
    const items = state.selectedQuestions.map((question, index) => {
        const answer = state.answers.get(question.id);
        const statusClass = typeof answer === 'number' ? 'answered' : 'missing';
        const statusText = typeof answer === 'number' ? 'Answered' : 'Unanswered';

        return `
            <article class="review-item ${statusClass}">
                <div>
                    <p><strong>Question ${index + 1}</strong> · ${formatCategory(question.category)}</p>
                    <p>${question.question}</p>
                    <p class="status">Status: ${statusText}</p>
                </div>
                <button type="button" class="secondary-btn review-jump" data-index="${index}">
                    Go to Question
                </button>
            </article>
        `;
    });

    dom.reviewList.innerHTML = items.join('');
}

function handleReviewNavigation(event) {
    const button = event.target.closest('.review-jump');
    if (!button) return;

    const index = Number(button.dataset.index);
    state.currentIndex = index;
    switchView('quiz');
    renderQuestions();
    updateNavigationState();
    updateProgress();
}

function returnToQuestions() {
    switchView('quiz');
}

function finalizeAssessment(autoSubmitted = false) {
    if (!state.selectedQuestions.length || state.isComplete) return;

    state.isComplete = true;
    state.autoSubmitted = autoSubmitted;
    stopTimer();

    const results = computeResults();
    renderResults(results);
    switchView('results');
}

function computeResults() {
    const totalsByCategory = new Map();
    let correctCount = 0;

    state.selectedQuestions.forEach(question => {
        const userAnswer = state.answers.get(question.id);
        const isCorrect = typeof userAnswer === 'number' && userAnswer === question.correctAnswer;

        if (isCorrect) {
            correctCount += 1;
        }

        const entry = totalsByCategory.get(question.category) || { correct: 0, total: 0 };
        entry.total += 1;
        if (isCorrect) entry.correct += 1;
        totalsByCategory.set(question.category, entry);
    });

    const total = state.selectedQuestions.length;
    const percentage = total ? Math.round((correctCount / total) * 100) : 0;
    const categoryBreakdown = Array.from(totalsByCategory.entries()).map(([category, stats]) => ({
        category,
        correct: stats.correct,
        total: stats.total,
        percentage: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
    }));

    return {
        total,
        correct: correctCount,
        percentage,
        categoryBreakdown
    };
}

function renderResults(results) {
    const passed = results.percentage >= state.config.passingScore;
    const timeNote = state.autoSubmitted ? ' (submitted automatically when time expired)' : '';

    dom.resultSummary.textContent = `You scored ${results.percentage}% (${results.correct}/${results.total})${timeNote}. ${passed ? 'You passed!' : 'Keep practicing and try again.'}`;

    renderScoreBreakdown(results.categoryBreakdown);
    renderStrengthsAndWeaknesses(results.categoryBreakdown);
    renderExplanations();
    renderCategoryChart(results.categoryBreakdown);
}

function renderScoreBreakdown(breakdown) {
    const items = breakdown.map(({ category, correct, total, percentage }) => `
        <div class="score-item">
            <div class="score-item-header">
                <span>${formatCategory(category)}</span>
                <span>${percentage}%</span>
            </div>
            <div class="score-item-progress">
                <div class="score-item-fill" style="width:${percentage}%"></div>
            </div>
            <p>${correct} of ${total} correct</p>
        </div>
    `);

    dom.scoreBreakdown.innerHTML = items.join('');
}

function renderStrengthsAndWeaknesses(breakdown) {
    const strengths = breakdown.filter(item => item.percentage >= state.config.strengthThreshold);
    const weaknesses = breakdown.filter(item => item.percentage <= state.config.weaknessThreshold);

    const strengthsContent = strengths.length
        ? `<ul>${strengths.map(item => `<li>${formatCategory(item.category)} (${item.percentage}%)</li>`).join('')}</ul>`
        : '<p>No categories above the strength threshold yet.</p>';

    const weaknessesContent = weaknesses.length
        ? `<ul>${weaknesses.map(item => `<li>${formatCategory(item.category)} (${item.percentage}%)</li>`).join('')}</ul>`
        : '<p>No categories below the weakness threshold! 🎉</p>';

    dom.strengthsWeaknesses.innerHTML = `
        <div class="panel strengths">
            <h3>Strength Areas</h3>
            ${strengthsContent}
        </div>
        <div class="panel weaknesses">
            <h3>Focus Areas</h3>
            ${weaknessesContent}
        </div>
    `;
}

function renderExplanations() {
    const cards = state.selectedQuestions.map((question, index) => {
        const userAnswerIndex = state.answers.get(question.id);
        const userAnswerText = typeof userAnswerIndex === 'number' ? question.options[userAnswerIndex] : 'Unanswered';
        const isCorrect = typeof userAnswerIndex === 'number' && userAnswerIndex === question.correctAnswer;
        const correctText = question.options[question.correctAnswer];

        return `
            <article class="explanation-card ${isCorrect ? 'correct' : 'incorrect'}">
                <h4>Question ${index + 1}: ${question.question}</h4>
                <p><strong>Your answer:</strong> ${userAnswerText}</p>
                <p><strong>Correct answer:</strong> ${correctText}</p>
                <p><em>${question.explanation}</em></p>
            </article>
        `;
    });

    dom.explanations.innerHTML = cards.join('');
}

function renderCategoryChart(breakdown) {
    if (!dom.categoryChart) return;

    const ctx = dom.categoryChart.getContext('2d');

    if (state.chart) {
        state.chart.destroy();
    }

    state.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: breakdown.map(item => formatCategory(item.category)),
            datasets: [
                {
                    label: 'Score (%)',
                    data: breakdown.map(item => item.percentage),
                    backgroundColor: 'rgba(74, 108, 247, 0.7)',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => `${value}%`
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateProgress() {
    const total = state.selectedQuestions.length;
    const answered = state.answers.size;

    if (!total) return;

    if (state.config.displayMode === 'all-at-once') {
        dom.progressText.textContent = `Answered ${answered} of ${total} questions`;
    } else {
        dom.progressText.textContent = `Question ${state.currentIndex + 1} of ${total} · Answered ${answered}`;
    }

    const percentage = Math.round((answered / total) * 100);
    dom.progressFill.style.width = `${percentage}%`;
}

function startTimer() {
    stopTimer();

    if (!state.config.timeLimitMinutes) {
        dom.timer.textContent = '';
        dom.timer.setAttribute('aria-hidden', 'true');
        return;
    }

    state.remainingSeconds = state.config.timeLimitMinutes * 60;
    dom.timer.setAttribute('aria-hidden', 'false');
    dom.timer.textContent = formatTime(state.remainingSeconds);

    state.timerInterval = window.setInterval(() => {
        state.remainingSeconds -= 1;
        dom.timer.textContent = formatTime(Math.max(state.remainingSeconds, 0));

        if (state.remainingSeconds <= 0) {
            stopTimer();
            finalizeAssessment(true);
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function resetAssessment() {
    stopTimer();
    state.selectedQuestions = [];
    state.answers = new Map();
    state.currentIndex = 0;
    state.isComplete = false;
    state.autoSubmitted = false;

    dom.questionContainer.innerHTML = '';
    dom.reviewList.innerHTML = '';
    dom.scoreBreakdown.innerHTML = '';
    dom.strengthsWeaknesses.innerHTML = '';
    dom.explanations.innerHTML = '';
    dom.progressText.textContent = '';
    dom.progressFill.style.width = '0%';
    dom.timer.textContent = '';
    dom.timer.setAttribute('aria-hidden', 'true');

    if (state.chart) {
        state.chart.destroy();
        state.chart = null;
    }

    renderConfigSummary();
    configureUiFromSettings();
    switchView('welcome');
}

function switchView(view) {
    const views = {
        welcome: dom.welcomeScreen,
        quiz: dom.quizScreen,
        review: dom.reviewScreen,
        results: dom.resultsScreen
    };

    Object.values(views).forEach(element => {
        if (element) element.classList.add('hidden');
    });

    const active = views[view];
    if (active) {
        active.classList.remove('hidden');
    }
}

function formatCategory(categoryKey) {
    return categoryKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

function formatDisplayMode(mode) {
    if (mode === 'all-at-once') return 'All questions at once';
    return 'One question at a time';
}

function formatDifficulty(difficulty) {
    return difficulty
        ? difficulty.replace(/\b\w/g, char => char.toUpperCase())
        : 'Unknown';
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
