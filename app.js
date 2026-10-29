'use strict';

const ACTIVE_SESSION_KEY = 'ds-quiz:active-session:v1';
const HISTORY_STORAGE_KEY = 'ds-quiz:attempts:v1';
const ADMIN_STORAGE_KEY = 'ds-quiz:admin-questions:v1';
const DEFAULT_HISTORY_LIMIT = 20;
const TIMER_WARNING_SECONDS = [300, 60];
const SWIPE_MIN_DISTANCE = 40;

const state = {
    config: null,
    selectedPreset: null,
    activeQuestionCounts: null,
    questions: {},
    selectedQuestions: [],
    currentIndex: 0,
    answers: new Map(),
    timerInterval: null,
    remainingSeconds: 0,
    chart: null,
    isComplete: false,
    autoSubmitted: false,
    startedAt: null,
    timerWarningsShown: new Set(),
    history: [],
    historyAvailable: true,
    announceTimeout: null,
    adminMode: false,
    adminQuestions: []
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
    dom.welcomeHeading = document.getElementById('welcome-heading');
    dom.quizHeading = document.getElementById('quiz-heading');
    dom.reviewHeading = document.getElementById('review-heading');
    dom.resultsHeading = document.getElementById('results-heading');
    dom.configSummary = document.getElementById('config-summary');
    dom.lengthSelector = document.getElementById('length-selector');
    dom.startBtn = document.getElementById('start-btn');
    dom.resumeBtn = document.getElementById('resume-btn');
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
    dom.progressBar = document.getElementById('progress-bar');
    dom.progressFill = document.getElementById('progress-fill');
    dom.reviewList = document.getElementById('review-list');
    dom.resultSummary = document.getElementById('result-summary');
    dom.scoreBreakdown = document.getElementById('score-breakdown');
    dom.strengthsWeaknesses = document.getElementById('strengths-weaknesses');
    dom.explanations = document.getElementById('explanations');
    dom.timer = document.getElementById('timer');
    dom.categoryChart = document.getElementById('category-chart');
    dom.chartData = document.getElementById('chart-data');
    dom.historySection = document.getElementById('history-section');
    dom.historySummary = document.getElementById('history-summary');
    dom.historyBody = document.getElementById('history-body');
    dom.clearHistoryBtn = document.getElementById('clear-history-btn');
    dom.historyStats = document.getElementById('history-stats');
    dom.historyDetails = document.getElementById('history-details');
    dom.historyDetailsSummary = document.getElementById('history-details-summary');
    dom.adminPanel = document.getElementById('admin-panel');
    dom.adminPreset = document.getElementById('admin-preset');
    dom.addQuestionForm = document.getElementById('add-question-form');
    dom.adminOptions = document.getElementById('admin-options');
    dom.adminCategory = document.getElementById('admin-category');
    dom.adminList = document.getElementById('admin-list');
    dom.adminCounts = document.getElementById('admin-counts');
    dom.adminClear = document.getElementById('admin-clear');
    dom.adminClose = document.getElementById('admin-close');
    dom.announcer = document.getElementById('sr-announcer');
}

function attachEventListeners() {
    dom.startBtn?.addEventListener('click', startAssessment);
    dom.resumeBtn?.addEventListener('click', resumeAssessment);
    dom.lengthSelector?.addEventListener('change', handleLengthChange);
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
    dom.clearHistoryBtn?.addEventListener('click', clearHistory);

    dom.questionContainer?.addEventListener('change', handleAnswerChange);
    dom.reviewList?.addEventListener('click', handleReviewNavigation);

    attachSwipeNavigation();

    dom.addQuestionForm?.addEventListener('submit', handleAdminQuestionSubmit);
    dom.adminClose?.addEventListener('click', closeAdminPanel);
    dom.adminClear?.addEventListener('click', removeAllAdminQuestions);
    dom.adminCategory?.addEventListener('change', renderAdminSummary);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state.adminMode) {
            closeAdminPanel();
        }
    });
}

// Touch swipes change questions in one-at-a-time mode. The mode is checked when
// the gesture ends rather than when the listener is attached, because this runs
// before config.json has loaded.
function attachSwipeNavigation() {
    if (!dom.questionContainer) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    dom.questionContainer.addEventListener('touchstart', event => {
        const touch = event.changedTouches?.[0];
        if (!touch || state.config?.displayMode === 'all-at-once') {
            tracking = false;
            return;
        }
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    dom.questionContainer.addEventListener('touchend', event => {
        if (!tracking) return;
        tracking = false;

        const touch = event.changedTouches?.[0];
        if (!touch || state.config?.displayMode === 'all-at-once') return;

        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        // Ignore mostly-vertical gestures so page scrolling still works.
        if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return;
        if (Math.abs(deltaX) < Math.abs(deltaY)) return;

        navigateQuestion(deltaX < 0 ? 1 : -1);
    }, { passive: true });
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
        state.selectedPreset = config.defaultPreset || (config.presets ? Object.keys(config.presets)[0] : null);
        loadAdminQuestions();
        loadHistory();
        renderLengthSelector();
        renderConfigSummary();
        renderHistory();
        configureUiFromSettings();
        updateResumeButton();
        initializeAdminMode();
    } catch (error) {
        console.error('Failed to initialize application', error);
        dom.configSummary.innerHTML = '<p class="error">Unable to load configuration or questions. Please refresh the page.</p>';
        dom.startBtn.disabled = true;
    }
}

/* ---------------------------------------------------------------------------
 * Question-bank admin tools (?admin=1)
 * Additions live in localStorage only. They never touch questions.json.
 * ------------------------------------------------------------------------- */

function isAdminRequested() {
    try {
        return new URLSearchParams(window.location.search).get('admin') === '1';
    } catch (error) {
        return false;
    }
}

function initializeAdminMode() {
    state.adminMode = isAdminRequested();

    if (!dom.adminPanel) return;

    dom.adminPanel.hidden = !state.adminMode;
    dom.adminPanel.setAttribute('aria-hidden', String(!state.adminMode));
    document.body.classList.toggle('admin-active', state.adminMode);

    if (!state.adminMode) return;

    renderAdminCategories();
    renderAdminSummary();
}

function closeAdminPanel(options = {}) {
    if (!dom.adminPanel) return;

    state.adminMode = false;
    dom.adminPanel.hidden = true;
    dom.adminPanel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-active');

    if (!options.silent) {
        focusElement(dom.welcomeHeading);
        announce('Admin panel closed.');
    }
}

function loadAdminQuestions() {
    let stored = [];

    try {
        const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        stored = Array.isArray(parsed) ? parsed.filter(isValidAdminQuestion) : [];
    } catch (error) {
        console.warn('Unable to read custom questions', error);
        stored = [];
    }

    state.adminQuestions = stored;
    stored.forEach(mergeAdminQuestion);
}

function mergeAdminQuestion(question) {
    const bucket = state.questions[question.category];
    if (!Array.isArray(bucket)) return;
    if (bucket.some(existing => existing.id === question.id)) return;
    bucket.push(question);
}

function persistAdminQuestions() {
    try {
        window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state.adminQuestions));
    } catch (error) {
        console.warn('Unable to save custom questions', error);
    }
}

function isValidAdminQuestion(question) {
    return Boolean(question)
        && typeof question === 'object'
        && typeof question.id === 'string'
        && typeof question.question === 'string'
        && question.question.trim().length > 0
        && Array.isArray(question.options)
        && question.options.length === 4
        && question.options.every(option => typeof option === 'string' && option.trim().length > 0)
        && Number.isInteger(question.correctAnswer)
        && question.correctAnswer >= 0
        && question.correctAnswer < 4
        && typeof question.category === 'string'
        && typeof question.explanation === 'string';
}

function renderAdminOptions() {
    if (!dom.adminOptions || dom.adminOptions.childElementCount > 0) return;

    dom.adminOptions.innerHTML = [0, 1, 2, 3].map(index => {
        const letter = String.fromCharCode(65 + index);
        return `
            <div class="admin-option-row">
                <input type="radio" id="admin-correct-${index}" name="correct" value="${index}" ${index === 0 ? 'checked' : ''} aria-label="Option ${letter} is the correct answer" />
                <input type="text" id="admin-option-${index}" name="option${index}" aria-label="Option ${letter} text" placeholder="Option ${letter}" required />
            </div>
        `;
    }).join('');
}

function renderAdminCategories() {
    if (!dom.adminCategory) return;

    const categories = Object.keys(state.questions || {});
    const current = dom.adminCategory.value;

    dom.adminCategory.innerHTML = categories
        .map(category => `<option value="${escapeAttribute(category)}">${escapeHtml(formatCategory(category))}</option>`)
        .join('');

    if (categories.includes(current)) {
        dom.adminCategory.value = current;
    }
}

function renderAdminSummary() {
    if (dom.adminPreset) {
        dom.adminPreset.textContent = getActivePreset()?.label || 'none';
    }

    renderAdminOptions();
    renderAdminQuestionsList();
    renderAdminCounts();
}

function renderAdminQuestionsList() {
    if (!dom.adminList) return;

    if (!state.adminQuestions.length) {
        dom.adminList.innerHTML = '<p class="admin-empty">No custom questions added yet.</p>';
    } else {
        dom.adminList.innerHTML = `
            <ul class="admin-list">
                ${state.adminQuestions.map(question => `
                    <li>
                        <span>${escapeHtml(question.question)}</span>
                        <span class="admin-list-meta">${escapeHtml(formatCategory(question.category))}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    if (dom.adminClear) {
        dom.adminClear.disabled = state.adminQuestions.length === 0;
    }
}

function renderAdminCounts() {
    if (!dom.adminCounts) return;

    const rows = Object.entries(state.questions || {})
        .map(([category, list]) => `
            <li>
                <span>${escapeHtml(formatCategory(category))}</span>
                <span class="admin-count-value">${Array.isArray(list) ? list.length : 0}</span>
            </li>
        `)
        .join('');

    dom.adminCounts.innerHTML = `<ul class="admin-counts">${rows}</ul>`;
}

function handleAdminQuestionSubmit(event) {
    event.preventDefault();
    if (!state.adminMode || !dom.addQuestionForm) return;

    const form = dom.addQuestionForm;
    const options = [0, 1, 2, 3].map(index => form.elements[`option${index}`]?.value.trim() || '');
    const correctInput = form.querySelector('input[name="correct"]:checked');
    const category = form.elements.category?.value;
    const questionText = form.elements.question?.value.trim() || '';
    const explanation = form.elements.explanation?.value.trim() || '';

    if (options.some(option => !option) || !questionText || !explanation || !category) {
        announce('Please complete every field before adding the question.');
        return;
    }

    if (!Array.isArray(state.questions[category])) {
        announce('Choose a valid category.');
        return;
    }

    const question = {
        id: `admin-${Date.now()}-${state.adminQuestions.length + 1}`,
        question: questionText,
        options,
        correctAnswer: Number(correctInput?.value ?? 0),
        explanation,
        category,
        difficulty: form.elements.difficulty?.value || 'medium',
        source: 'admin'
    };

    state.adminQuestions.push(question);
    mergeAdminQuestion(question);
    persistAdminQuestions();

    // Counts and preset summaries can change when a category gains questions.
    state.activeQuestionCounts = null;
    renderLengthSelector();
    renderConfigSummary();
    renderAdminSummary();

    form.reset();
    announce(`Question added to ${formatCategory(category)}.`);
}

function removeAllAdminQuestions() {
    if (!state.adminMode || state.adminQuestions.length === 0) return;

    const confirmed = window.confirm('Remove every question added from this browser? questions.json is not affected.');
    if (!confirmed) return;

    state.adminQuestions.forEach(question => {
        const bucket = state.questions[question.category];
        if (Array.isArray(bucket)) {
            const index = bucket.findIndex(entry => entry.id === question.id);
            if (index !== -1) bucket.splice(index, 1);
        }
    });

    state.adminQuestions = [];

    try {
        window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to clear custom questions', error);
    }

    state.activeQuestionCounts = null;
    renderLengthSelector();
    renderConfigSummary();
    renderAdminSummary();
    announce('Custom questions removed.');
}

function getActivePreset() {
    const presets = state.config?.presets;
    if (!presets) return null;
    return presets[state.selectedPreset]
        || presets[state.config.defaultPreset]
        || Object.values(presets)[0]
        || null;
}

function distributeQuestionCounts(totalQuestions, categories) {
    if (!categories.length) return {};

    const base = Math.floor(totalQuestions / categories.length);
    const remainder = totalQuestions % categories.length;
    const shuffled = [...categories];
    shuffleArray(shuffled);

    const counts = {};
    shuffled.forEach((category, index) => {
        counts[category] = base + (index < remainder ? 1 : 0);
    });

    const ordered = {};
    categories.forEach(category => {
        ordered[category] = counts[category];
    });
    return ordered;
}

function buildQuestionCounts() {
    if (state.activeQuestionCounts) {
        return state.activeQuestionCounts;
    }

    const preset = getActivePreset();
    const categories = Object.keys(state.questions || {});
    let counts;

    if (!preset) {
        counts = state.config?.questionCounts || {};
    } else if (Number.isInteger(preset.totalQuestions)) {
        counts = distributeQuestionCounts(preset.totalQuestions, categories);
    } else {
        counts = {};
        categories.forEach(category => {
            counts[category] = preset.questionsPerCategory;
        });
    }

    state.activeQuestionCounts = counts;
    return counts;
}

function getTimeLimit() {
    const preset = getActivePreset();
    if (preset && Number.isInteger(preset.timeLimitMinutes)) {
        return preset.timeLimitMinutes;
    }
    return state.config?.timeLimitMinutes ?? null;
}

function renderLengthSelector() {
    if (!dom.lengthSelector) return;

    const presets = state.config?.presets;
    if (!presets) {
        dom.lengthSelector.classList.add('hidden');
        return;
    }

    const counts = buildQuestionCounts();
    const categoryCount = Object.keys(counts).length;

    dom.lengthSelector.innerHTML = Object.entries(presets).map(([key, preset]) => {
        const isSelected = key === state.selectedPreset;
        const total = Number.isInteger(preset.totalQuestions)
            ? preset.totalQuestions
            : preset.questionsPerCategory * categoryCount;
        const timeLabel = preset.timeLimitMinutes ? ` · ~${preset.timeLimitMinutes} min` : '';
        return `
            <label class="length-option${isSelected ? ' selected' : ''}">
                <input type="radio" name="length-preset" value="${key}" ${isSelected ? 'checked' : ''} />
                <span class="length-copy">
                    <strong>${preset.label}</strong>
                    <span class="length-meta">${total} questions${timeLabel}</span>
                </span>
            </label>
        `;
    }).join('');
}

function handleLengthChange(event) {
    const input = event.target.closest('input[name="length-preset"]');
    if (!input) return;

    state.selectedPreset = input.value;
    state.activeQuestionCounts = null;
    updateLengthSelectionStyles();
    renderConfigSummary();
    configureUiFromSettings();
}

function updateLengthSelectionStyles() {
    if (!dom.lengthSelector) return;

    dom.lengthSelector.querySelectorAll('.length-option').forEach(label => {
        const input = label.querySelector('input[name="length-preset"]');
        label.classList.toggle('selected', input?.value === state.selectedPreset);
    });
}

function renderConfigSummary() {
    if (!state.config) return;

    const counts = buildQuestionCounts();
    const items = Object.keys(counts).map(category => {
        const requested = counts[category];
        const available = (state.questions?.[category] || []).length;
        const note = available < requested
            ? `Only ${available} available`
            : `${requested} of ${available} available`;
        return `<li><strong>${formatCategory(category)}</strong>: ${note}</li>`;
    });

    const timeLimit = getTimeLimit();
    dom.configSummary.innerHTML = `
        <div class="config-card">
            <h3>Assessment Settings</h3>
            <ul>${items.join('')}</ul>
            <p>Display mode: <strong>${formatDisplayMode(state.config.displayMode)}</strong></p>
            <p>Passing score: <strong>${state.config.passingScore}%</strong></p>
            ${timeLimit ? `<p>Time limit: <strong>${timeLimit} minutes</strong></p>` : '<p>No time limit</p>'}
            ${state.config.allowReview ? '<p>Review enabled before submission</p>' : '<p>Review disabled</p>'}
        </div>
    `;
}

function configureUiFromSettings() {
    if (!state.config) return;
    dom.reviewBtn?.classList.toggle('hidden', !state.config.allowReview);
    if (!state.config.allowReview) {
        dom.reviewScreen?.classList.add('hidden');
    }
    dom.submitBtn.textContent = state.config.allowReview ? 'Submit' : 'Submit Assessment';
    dom.timer.textContent = '';
    dom.timer.setAttribute('aria-hidden', 'true');
}

function updateResumeButton() {
    if (!dom.resumeBtn) return;

    const session = loadSession();
    if (session) {
        dom.resumeBtn.classList.remove('hidden');
        dom.resumeBtn.textContent = `Resume Assessment (${session.currentIndex + 1}/${session.selectedQuestions.length})`;
    } else {
        dom.resumeBtn.classList.add('hidden');
    }
}

function startAssessment() {
    if (!state.config || !state.questions) return;

    if (state.adminMode) {
        closeAdminPanel({ silent: true });
    }

    clearSession();
    updateResumeButton();
    prepareSelectedQuestions();

    if (!state.selectedQuestions.length) {
        dom.configSummary.innerHTML = '<p class="error">No questions available with the current configuration.</p>';
        return;
    }

    state.answers = new Map();
    state.currentIndex = 0;
    state.isComplete = false;
    state.autoSubmitted = false;
    state.startedAt = Date.now();
    state.timerWarningsShown = new Set();

    switchView('quiz');
    renderQuestions();
    updateNavigationState();
    updateProgress();
    startTimer();
    saveSession();
    focusCurrentQuestion();
    announce('Assessment started. Question 1 of ' + state.selectedQuestions.length + '.');
}

function prepareSelectedQuestions() {
    const selection = [];
    const counts = buildQuestionCounts();

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
    const questionTextId = `question-text-${question.id}`;
    const optionsMarkup = question.options
        .map((optionText, optionIndex) => {
            const inputId = `${question.id}-${optionIndex}`;
            const isSelected = selectedIndex === optionIndex;
            return `
                <label class="option${isSelected ? ' selected' : ''}" data-question-id="${question.id}" data-option-index="${optionIndex}">
                    <input type="radio" id="${inputId}" name="${question.id}" value="${optionIndex}" ${isSelected ? 'checked' : ''} />
                    <span>${optionText}</span>
                </label>
            `;
        })
        .join('');

    return `
        <article class="question-card" data-question-id="${question.id}" data-index="${index}" aria-labelledby="${questionTextId}">
            <header class="question-header">
                <div>
                    <p class="question-number">Question ${index + 1}</p>
                    <p class="question-text" id="${questionTextId}" tabindex="-1">${question.question}</p>
                </div>
                <div class="question-meta">
                    <span class="badge category">${formatCategory(question.category)}</span>
                    <span class="badge difficulty ${question.difficulty}">${formatDifficulty(question.difficulty)}</span>
                </div>
            </header>
            <div class="option-list" role="radiogroup" aria-labelledby="${questionTextId}">
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
    highlightSelectedOption(questionId);
    updateProgress();
    saveSession();
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
    focusCurrentQuestion();
    saveSession();
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
    focusElement(dom.reviewHeading);
    announce('Review your answers. ' + state.answers.size + ' of ' + state.selectedQuestions.length + ' questions answered.');
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
    focusCurrentQuestion();
    saveSession();
}

function returnToQuestions() {
    switchView('quiz');
    focusCurrentQuestion();
}

function finalizeAssessment(autoSubmitted = false) {
    if (!state.selectedQuestions.length || state.isComplete) return;

    state.isComplete = true;
    state.autoSubmitted = autoSubmitted;
    stopTimer();
    clearSession();
    updateResumeButton();

    const results = computeResults();
    recordAttempt(results);
    renderResults(results);
    switchView('results');
    focusElement(dom.resultsHeading);
    const autoNote = results.autoSubmitted
        ? ' Time expired, so your answers were submitted automatically.'
        : '';
    announce(`Assessment complete. You scored ${results.percentage} percent.${autoNote}`);
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
    })).sort((a, b) => a.percentage - b.percentage);

    const preset = getActivePreset();
    const elapsedSeconds = state.startedAt
        ? Math.max(0, Math.round((Date.now() - state.startedAt) / 1000))
        : 0;

    return {
        total,
        correct: correctCount,
        percentage,
        categoryBreakdown,
        passed: percentage >= state.config.passingScore,
        presetKey: state.selectedPreset,
        presetLabel: preset?.label || 'Assessment',
        elapsedSeconds,
        autoSubmitted: state.autoSubmitted
    };
}

function renderResults(results) {
    const passed = results.passed;
    const timeNote = state.autoSubmitted ? ' (submitted automatically when time expired)' : '';
    const previous = state.config.showHistory !== false ? state.history[1] : null;

    const parts = [
        `You scored ${results.percentage}% (${results.correct}/${results.total})${timeNote}.`,
        passed ? 'You passed!' : 'Keep practicing and try again.'
    ];

    if (results.elapsedSeconds) {
        parts.push(`Time taken: ${formatDuration(results.elapsedSeconds)}.`);
    }

    if (previous) {
        parts.push(`Previous attempt: ${previous.percentage}% (${formatDelta(results.percentage - previous.percentage)}).`);
    }

    const sortedByScore = [...results.categoryBreakdown].sort((a, b) => b.percentage - a.percentage);
    const strongest = sortedByScore[0];
    const weakest = sortedByScore[sortedByScore.length - 1];
    if (strongest && weakest && results.categoryBreakdown.length > 1) {
        parts.push(
            `Strongest area: ${formatCategory(strongest.category)} (${strongest.percentage}%). ` +
            `Biggest opportunity: ${formatCategory(weakest.category)} (${weakest.percentage}%).`
        );
    }

    dom.resultSummary.textContent = parts.join(' ');

    renderScoreBreakdown(results.categoryBreakdown);
    renderStrengthsAndWeaknesses(results.categoryBreakdown);
    renderExplanations();
    renderChartData(results.categoryBreakdown);
    renderCategoryChart(results.categoryBreakdown);
}

function renderScoreBreakdown(breakdown) {
    const weakest = breakdown.length > 1 ? breakdown[0] : null;
    const items = breakdown.map(({ category, correct, total, percentage }) => `
        <div class="score-item${weakest && category === weakest.category ? ' focus' : ''}">
            <div class="score-item-header">
                <span>${formatCategory(category)}</span>
                <span>${percentage}%</span>
            </div>
            <div class="score-item-progress">
                <div class="score-item-fill" style="width:${percentage}%"></div>
            </div>
            <p>${correct} of ${total} correct${weakest && category === weakest.category ? ' · Highest opportunity' : ''}</p>
        </div>
    `);

    dom.scoreBreakdown.innerHTML = items.join('');
}

function renderStrengthsAndWeaknesses(breakdown) {
    const strengths = breakdown
        .filter(item => item.percentage >= state.config.strengthThreshold)
        .sort((a, b) => b.percentage - a.percentage);
    const weaknesses = breakdown
        .filter(item => item.percentage <= state.config.weaknessThreshold)
        .sort((a, b) => a.percentage - b.percentage);

    const strengthsContent = strengths.length
        ? `<p>You performed well in these areas:</p><ul>${strengths.map(item => `<li>${formatCategory(item.category)} (${item.percentage}%)</li>`).join('')}</ul>`
        : '<p>No categories above the strength threshold yet.</p>';

    const weaknessesContent = weaknesses.length
        ? `<p>Consider reviewing these areas to improve your next score:</p><ul>${weaknesses.map(item => `<li>${formatCategory(item.category)} (${item.percentage}%)</li>`).join('')}</ul>`
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
        const hasAnswer = typeof userAnswerIndex === 'number';
        const isCorrect = hasAnswer && userAnswerIndex === question.correctAnswer;

        const optionsMarkup = question.options.map((option, optionIndex) => {
            const isCorrectOption = optionIndex === question.correctAnswer;
            const isUserAnswer = hasAnswer && optionIndex === userAnswerIndex;
            const classes = ['explanation-option'];

            if (isCorrectOption) classes.push('correct-option');
            if (isUserAnswer && !isCorrectOption) classes.push('user-wrong');

            const badges = [];
            if (isCorrectOption) {
                badges.push('<span class="option-badge correct-badge">Correct answer</span>');
            }
            if (isUserAnswer) {
                badges.push('<span class="option-badge user-badge">Your answer</span>');
            }

            return `
                <li class="${classes.join(' ')}">
                    <span>${option}</span>
                    <span class="option-badges">${badges.join('')}</span>
                </li>
            `;
        }).join('');

        const answerNote = hasAnswer
            ? ''
            : '<p class="answer-note">You did not answer this question.</p>';

        return `
            <article class="explanation-card ${isCorrect ? 'correct' : 'incorrect'}">
                <h4>Question ${index + 1}: ${question.question}</h4>
                ${answerNote}
                <ul class="explanation-options">${optionsMarkup}</ul>
                <div class="why-correct">
                    <p class="why-label">Why this is correct</p>
                    <p>${question.explanation}</p>
                </div>
            </article>
        `;
    });

    dom.explanations.innerHTML = cards.join('');
}

function renderChartData(breakdown) {
    if (!dom.chartData) return;

    const rows = breakdown.map(item => `
        <tr>
            <th scope="row">${formatCategory(item.category)}</th>
            <td>${item.correct}</td>
            <td>${item.total}</td>
            <td>${item.percentage}%</td>
        </tr>
    `).join('');

    dom.chartData.innerHTML = `
        <table>
            <caption>Score by category</caption>
            <thead>
                <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Correct</th>
                    <th scope="col">Questions</th>
                    <th scope="col">Score</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function renderCategoryChart(breakdown) {
    if (!dom.categoryChart) return;

    const ctx = dom.categoryChart.getContext('2d');
    if (typeof Chart === 'undefined' || !ctx) {
        dom.categoryChart.classList.add('hidden');
        dom.chartData?.classList.remove('sr-only');
        return;
    }

    dom.categoryChart.classList.remove('hidden');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
                    backgroundColor: 'rgba(63, 95, 224, 0.7)',
                    borderRadius: 8
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            animation: reduceMotion ? false : undefined,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => `${value}%`
                    }
                },
                y: {
                    ticks: {
                        autoSkip: false
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

    if (dom.progressBar) {
        dom.progressBar.setAttribute('aria-valuenow', String(percentage));
        dom.progressBar.setAttribute('aria-valuetext', `${answered} of ${total} questions answered`);
    }
}

function startTimer(restoredSeconds = null) {
    stopTimer();

    const timeLimit = getTimeLimit();
    if (!timeLimit) {
        dom.timer.textContent = '';
        dom.timer.setAttribute('aria-hidden', 'true');
        return;
    }

    state.remainingSeconds = Number.isInteger(restoredSeconds) && restoredSeconds > 0
        ? restoredSeconds
        : timeLimit * 60;
    dom.timer.setAttribute('aria-hidden', 'false');
    updateTimerDisplay();

    state.timerInterval = window.setInterval(() => {
        state.remainingSeconds -= 1;
        updateTimerDisplay();
        saveSession();

        if (state.remainingSeconds <= 0) {
            stopTimer();
            finalizeAssessment(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const seconds = Math.max(state.remainingSeconds, 0);
    dom.timer.textContent = formatTime(seconds);
    dom.timer.classList.toggle('warning', seconds <= 60);

    TIMER_WARNING_SECONDS.forEach(threshold => {
        if (seconds <= threshold && !state.timerWarningsShown.has(threshold)) {
            state.timerWarningsShown.add(threshold);
            const minutes = Math.round(threshold / 60);
            announce(`${minutes} minute${minutes === 1 ? '' : 's'} remaining.`);
        }
    });
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

/* ---------------------------------------------------------------------------
 * Active session persistence
 * Saves progress to localStorage so an in-progress assessment can be resumed.
 * ------------------------------------------------------------------------- */

function loadSession() {
    try {
        const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!isValidSession(parsed)) {
            window.localStorage.removeItem(ACTIVE_SESSION_KEY);
            return null;
        }
        return parsed;
    } catch (error) {
        console.warn('Unable to read active session', error);
        return null;
    }
}

function isValidSession(session) {
    return Boolean(session)
        && typeof session === 'object'
        && Array.isArray(session.selectedQuestions)
        && session.selectedQuestions.length > 0
        && Array.isArray(session.answers)
        && session.answers.every(entry => Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'number')
        && Number.isInteger(session.currentIndex)
        && session.currentIndex >= 0
        && session.currentIndex < session.selectedQuestions.length;
}

function saveSession() {
    if (!state.selectedQuestions.length || state.isComplete) return;

    const session = {
        selectedPreset: state.selectedPreset,
        activeQuestionCounts: state.activeQuestionCounts,
        selectedQuestions: state.selectedQuestions,
        currentIndex: state.currentIndex,
        answers: Array.from(state.answers.entries()),
        startedAt: state.startedAt,
        remainingSeconds: state.remainingSeconds,
        savedAt: Date.now()
    };

    try {
        window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
        console.warn('Unable to save active session', error);
    }
}

function clearSession() {
    try {
        window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (error) {
        console.warn('Unable to clear active session', error);
    }
}

function resumeAssessment() {
    const session = loadSession();
    if (!session) {
        announce('No saved assessment found.');
        return;
    }

    if (state.adminMode) {
        closeAdminPanel({ silent: true });
    }

    state.selectedPreset = session.selectedPreset;
    state.activeQuestionCounts = session.activeQuestionCounts;
    state.selectedQuestions = session.selectedQuestions;
    state.currentIndex = session.currentIndex;
    state.answers = new Map(session.answers);
    state.startedAt = session.startedAt;
    state.isComplete = false;
    state.autoSubmitted = false;
    state.timerWarningsShown = new Set();

    switchView('quiz');
    renderQuestions();
    updateNavigationState();
    updateProgress();
    startTimer(session.remainingSeconds);
    saveSession();
    focusCurrentQuestion();
    announce('Assessment resumed. Question ' + (state.currentIndex + 1) + ' of ' + state.selectedQuestions.length + '.');
}

function resetAssessment() {
    clearSession();
    updateResumeButton();
    stopTimer();
    state.selectedQuestions = [];
    state.answers = new Map();
    state.currentIndex = 0;
    state.isComplete = false;
    state.autoSubmitted = false;
    state.startedAt = null;
    state.timerWarningsShown = new Set();

    dom.questionContainer.innerHTML = '';
    dom.reviewList.innerHTML = '';
    dom.scoreBreakdown.innerHTML = '';
    dom.strengthsWeaknesses.innerHTML = '';
    dom.explanations.innerHTML = '';
    dom.chartData.innerHTML = '';
    dom.chartData.classList.add('sr-only');
    dom.categoryChart.classList.remove('hidden');
    dom.progressText.textContent = '';
    dom.progressFill.style.width = '0%';
    dom.progressBar?.setAttribute('aria-valuenow', '0');
    dom.progressBar?.setAttribute('aria-valuetext', '0 of 0 questions answered');
    dom.timer.textContent = '';
    dom.timer.classList.remove('warning');
    dom.timer.setAttribute('aria-hidden', 'true');

    if (state.chart) {
        state.chart.destroy();
        state.chart = null;
    }

    state.activeQuestionCounts = null;
    renderLengthSelector();
    renderConfigSummary();
    renderHistory();
    configureUiFromSettings();
    switchView('welcome');
    focusElement(dom.welcomeHeading);
    announce('Ready for a new assessment.');
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

function focusElement(element) {
    if (!element || typeof element.focus !== 'function') return;
    element.focus({ preventScroll: false });
}

function focusCurrentQuestion() {
    const card = dom.questionContainer?.querySelector('.question-card');
    const text = card?.querySelector('.question-text');
    focusElement(text);
}

function announce(message) {
    if (!dom.announcer) return;

    dom.announcer.textContent = '';
    window.clearTimeout(state.announceTimeout);
    state.announceTimeout = window.setTimeout(() => {
        dom.announcer.textContent = message;
    }, 60);
}

function getHistoryLimit() {
    const limit = state.config?.historyLimit;
    return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_HISTORY_LIMIT;
}

function isHistoryEnabled() {
    return state.config?.showHistory !== false;
}

function isValidAttempt(attempt) {
    return Boolean(attempt)
        && typeof attempt === 'object'
        && typeof attempt.completedAt === 'string'
        && Number.isFinite(attempt.percentage)
        && attempt.percentage >= 0
        && attempt.percentage <= 100
        && Number.isInteger(attempt.total)
        && attempt.total > 0
        && Number.isInteger(attempt.correct)
        && attempt.correct >= 0
        && attempt.correct <= attempt.total;
}

function loadHistory() {
    if (!isHistoryEnabled()) {
        state.history = [];
        return;
    }

    try {
        const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) {
            state.history = [];
            return;
        }

        const parsed = JSON.parse(raw);
        state.history = Array.isArray(parsed)
            ? parsed.filter(isValidAttempt).slice(0, getHistoryLimit())
            : [];
    } catch (error) {
        console.warn('Unable to read attempt history', error);
        state.historyAvailable = false;
        state.history = [];
    }
}

function persistHistory() {
    if (!state.historyAvailable) return;

    try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
    } catch (error) {
        console.warn('Unable to save attempt history', error);
        state.historyAvailable = false;
    }
}

function recordAttempt(results) {
    if (!isHistoryEnabled()) return;

    const attempt = {
        completedAt: new Date().toISOString(),
        preset: results.presetLabel,
        presetKey: results.presetKey,
        total: results.total,
        correct: results.correct,
        percentage: results.percentage,
        passed: Boolean(results.passed),
        elapsedSeconds: results.elapsedSeconds,
        autoSubmitted: Boolean(results.autoSubmitted),
        categoryBreakdown: results.categoryBreakdown.map(item => ({
            category: item.category,
            correct: item.correct,
            total: item.total,
            percentage: item.percentage
        }))
    };

    state.history.unshift(attempt);
    state.history = state.history.slice(0, getHistoryLimit());
    persistHistory();
    renderHistory();
}

function clearHistory() {
    if (!state.history.length) return;

    const confirmed = window.confirm('Clear all saved attempts from this browser? This cannot be undone.');
    if (!confirmed) return;

    state.history = [];

    try {
        window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to clear attempt history', error);
    }

    renderHistory();
    focusElement(dom.welcomeHeading);
    announce('Attempt history cleared.');
}

function renderHistory() {
    if (!dom.historySection) return;

    if (!isHistoryEnabled() || state.history.length === 0) {
        dom.historySection.classList.add('hidden');
        return;
    }

    dom.historySection.classList.remove('hidden');

    const attempts = state.history;
    const best = attempts.reduce((max, attempt) => Math.max(max, attempt.percentage), 0);
    const latest = attempts[0];
    const previous = attempts[1];
    const delta = previous ? latest.percentage - previous.percentage : null;

    const summaryParts = [
        `${attempts.length} saved attempt${attempts.length === 1 ? '' : 's'}`,
        `Best ${best}%`,
        `Latest ${latest.percentage}%`
    ];

    if (delta !== null) {
        summaryParts.push(`${formatDelta(delta)} vs previous`);
    }

    dom.historySummary.textContent = `${summaryParts.join(' · ')}.`;

    renderHistoryStats(attempts, best, latest, delta);
    renderHistoryDetailsSummary(attempts);

    dom.historyBody.innerHTML = attempts.map(attempt => {
        const passed = typeof attempt.passed === 'boolean'
            ? attempt.passed
            : attempt.percentage >= (state.config?.passingScore ?? 0);

        return `
            <tr>
                <th scope="row">${escapeHtml(formatDate(attempt.completedAt))}</th>
                <td>${escapeHtml(attempt.preset || 'Assessment')}</td>
                <td>${attempt.correct}/${attempt.total} (${attempt.percentage}%)</td>
                <td><span class="result-pill ${passed ? 'pass' : 'fail'}">${passed ? 'Pass' : 'Below target'}</span></td>
                <td>${escapeHtml(formatDuration(attempt.elapsedSeconds))}</td>
            </tr>
        `;
    }).join('');
}

function renderHistoryStats(attempts, best, latest, delta) {
    if (!dom.historyStats) return;

    const deltaLabel = delta === null
        ? 'First attempt'
        : delta > 0
            ? `+${delta} pts`
            : delta < 0
                ? `${delta} pts`
                : 'No change';

    const deltaClass = delta === null ? '' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

    dom.historyStats.innerHTML = `
        <div class="history-stat">
            <span class="history-stat-label">Attempts</span>
            <span class="history-stat-value">${attempts.length}</span>
        </div>
        <div class="history-stat">
            <span class="history-stat-label">Best</span>
            <span class="history-stat-value">${best}%</span>
        </div>
        <div class="history-stat">
            <span class="history-stat-label">Latest</span>
            <span class="history-stat-value">${latest.percentage}%</span>
        </div>
        <div class="history-stat">
            <span class="history-stat-label">Change</span>
            <span class="history-stat-value ${deltaClass}">${deltaLabel}</span>
        </div>
    `;
}

function renderHistoryDetailsSummary(attempts) {
    if (!dom.historyDetails || !dom.historyDetailsSummary) return;

    dom.historyDetailsSummary.textContent = attempts.length === 1
        ? 'Show details for 1 attempt'
        : `Show details for all ${attempts.length} attempts`;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDuration(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—';

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (!minutes) return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatDelta(delta) {
    if (!Number.isFinite(delta) || delta === 0) return 'no change';
    return `${delta > 0 ? '+' : ''}${delta} points`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value);
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
