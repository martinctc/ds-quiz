#!/usr/bin/env node
/**
 * Validates questions.json and config.json.
 *
 * Run locally:  node scripts/validate-questions.mjs
 * Runs in CI:   .github/workflows/validate.yml
 *
 * Exit code 0 = valid, 1 = validation errors.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const DISPLAY_MODES = new Set(['one-at-a-time', 'all-at-once']);

const errors = [];
const warnings = [];

function loadJson(file, label) {
  try {
    const raw = readFileSync(resolve(ROOT, file), 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`${label}: unable to read or parse (${error.message})`);
    return null;
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const questions = loadJson('questions.json', 'questions.json');
const config = loadJson('config.json', 'config.json');

let totalQuestions = 0;
const seenIds = new Set();

if (questions !== null) {
  if (!isPlainObject(questions)) {
    errors.push('questions.json: top level must be an object keyed by category');
  } else {
    const categories = Object.keys(questions);
    if (categories.length === 0) {
      errors.push('questions.json: no categories found');
    }

    for (const category of categories) {
      const list = questions[category];
      if (!Array.isArray(list)) {
        errors.push(`questions.json: category "${category}" must be an array`);
        continue;
      }
      if (list.length === 0) {
        warnings.push(`questions.json: category "${category}" is empty`);
      }

      list.forEach((question, index) => {
        const where = `questions.json -> ${category}[${index}]`;

        if (!isPlainObject(question)) {
          errors.push(`${where}: must be an object`);
          return;
        }
        totalQuestions += 1;

        if (!isNonEmptyString(question.id)) {
          errors.push(`${where}: "id" must be a non-empty string`);
        } else if (seenIds.has(question.id)) {
          errors.push(`${where}: duplicate id "${question.id}"`);
        } else {
          seenIds.add(question.id);
        }

        if (!isNonEmptyString(question.question)) {
          errors.push(`${where}: "question" must be a non-empty string`);
        }

        if (!Array.isArray(question.options) || question.options.length !== 4) {
          errors.push(`${where}: "options" must be an array of exactly 4 strings`);
        } else {
          question.options.forEach((option, optionIndex) => {
            if (!isNonEmptyString(option)) {
              errors.push(`${where}: option ${optionIndex} must be a non-empty string`);
            }
          });
          const normalised = question.options
            .filter(isNonEmptyString)
            .map((option) => option.trim().toLowerCase());
          if (new Set(normalised).size !== normalised.length) {
            warnings.push(`${where}: duplicate option text`);
          }
        }

        if (
          !Number.isInteger(question.correctAnswer) ||
          question.correctAnswer < 0 ||
          question.correctAnswer > 3
        ) {
          errors.push(`${where}: "correctAnswer" must be an integer between 0 and 3`);
        }

        if (!isNonEmptyString(question.explanation)) {
          errors.push(`${where}: "explanation" must be a non-empty string`);
        }

        if (!DIFFICULTIES.has(question.difficulty)) {
          errors.push(
            `${where}: "difficulty" must be one of ${[...DIFFICULTIES].join(', ')}`
          );
        }

        if (question.tags !== undefined) {
          if (
            !Array.isArray(question.tags) ||
            question.tags.some((tag) => !isNonEmptyString(tag))
          ) {
            errors.push(`${where}: "tags" must be an array of non-empty strings`);
          }
        }

        if (question.bloomLevel !== undefined && !isNonEmptyString(question.bloomLevel)) {
          errors.push(`${where}: "bloomLevel" must be a non-empty string`);
        }
      });
    }

    if (config !== null) {
      validateConfig(config, questions);
    }
  }
}

function validateConfig(cfg, bank) {
  if (!isPlainObject(cfg)) {
    errors.push('config.json: top level must be an object');
    return;
  }

  if (cfg.presets !== undefined) {
    validatePresets(cfg, bank);
  } else {
    validateQuestionCounts(cfg, bank);
  }

  if (!DISPLAY_MODES.has(cfg.displayMode)) {
    errors.push(
      `config.json: "displayMode" must be one of ${[...DISPLAY_MODES].join(', ')}`
    );
  }

  for (const key of ['allowReview', 'shuffleQuestions', 'shuffleOptions']) {
    if (typeof cfg[key] !== 'boolean') {
      errors.push(`config.json: "${key}" must be a boolean`);
    }
  }

  for (const key of ['passingScore', 'strengthThreshold', 'weaknessThreshold']) {
    if (typeof cfg[key] !== 'number' || cfg[key] < 0 || cfg[key] > 100) {
      errors.push(`config.json: "${key}" must be a number between 0 and 100`);
    }
  }

  if (cfg.timeLimitMinutes !== null && cfg.timeLimitMinutes !== undefined) {
    if (!Number.isInteger(cfg.timeLimitMinutes) || cfg.timeLimitMinutes < 1) {
      errors.push(
        'config.json: "timeLimitMinutes" must be a positive integer or null'
      );
    }
  }
}

function validatePresets(cfg, bank) {
  const presets = cfg.presets;
  if (!isPlainObject(presets)) {
    errors.push('config.json: "presets" must be an object');
    return;
  }

  const entries = Object.entries(presets);
  if (entries.length === 0) {
    errors.push('config.json: "presets" must contain at least one preset');
    return;
  }

  if (typeof cfg.defaultPreset !== 'string' || !(cfg.defaultPreset in presets)) {
    errors.push(
      'config.json: "defaultPreset" must reference a key in "presets"'
    );
  }

  for (const [key, preset] of entries) {
    const where = `config.json: presets["${key}"]`;

    if (!isPlainObject(preset)) {
      errors.push(`${where} must be an object`);
      continue;
    }

    if (!isNonEmptyString(preset.label)) {
      errors.push(`${where}.label must be a non-empty string`);
    }

    if (
      !Number.isInteger(preset.questionsPerCategory) ||
      preset.questionsPerCategory < 1
    ) {
      errors.push(`${where}.questionsPerCategory must be a positive integer`);
    } else {
      for (const category of Object.keys(bank)) {
        const available = Array.isArray(bank[category]) ? bank[category].length : 0;
        if (preset.questionsPerCategory > available) {
          errors.push(
            `${where}.questionsPerCategory (${preset.questionsPerCategory}) exceeds available questions in "${category}" (${available})`
          );
        } else if (preset.questionsPerCategory === available) {
          warnings.push(
            `${where}.questionsPerCategory samples every available question in "${category}", so that category is not randomised`
          );
        }
      }
    }

    if (preset.timeLimitMinutes !== undefined && preset.timeLimitMinutes !== null) {
      if (
        !Number.isInteger(preset.timeLimitMinutes) ||
        preset.timeLimitMinutes < 1
      ) {
        errors.push(
          `${where}.timeLimitMinutes must be a positive integer or null`
        );
      }
    }
  }
}

function validateQuestionCounts(cfg, bank) {
  const counts = cfg.questionCounts;
  if (!isPlainObject(counts)) {
    errors.push(
      'config.json: either "presets" or "questionCounts" must be provided'
    );
    return;
  }

  const entries = Object.entries(counts);
  if (entries.length === 0) {
    errors.push('config.json: "questionCounts" must contain at least one category');
  }

  for (const [category, count] of entries) {
    if (!(category in bank)) {
      errors.push(
        `config.json: questionCounts references unknown category "${category}"`
      );
      continue;
    }
    if (!Number.isInteger(count) || count < 1) {
      errors.push(
        `config.json: questionCounts["${category}"] must be a positive integer`
      );
      continue;
    }
    const available = Array.isArray(bank[category]) ? bank[category].length : 0;
    if (count > available) {
      errors.push(
        `config.json: questionCounts["${category}"] (${count}) exceeds available questions (${available})`
      );
    } else if (count === available) {
      warnings.push(
        `config.json: "${category}" samples every available question, so that category is not randomised`
      );
    }
  }

  const unlisted = Object.keys(bank).filter((category) => !(category in counts));
  if (unlisted.length > 0) {
    warnings.push(
      `config.json: categories present but not sampled: ${unlisted.join(', ')}`
    );
  }
}

const categoryCount = isPlainObject(questions) ? Object.keys(questions).length : 0;
console.log(
  `Checked ${totalQuestions} question(s) across ${categoryCount} category(ies).`
);

for (const warning of warnings) {
  console.warn(`WARN  ${warning}`);
}
for (const error of errors) {
  console.error(`ERROR ${error}`);
}

if (errors.length > 0) {
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log('questions.json and config.json are valid.');
