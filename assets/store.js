/* 四级提分台 · 状态、计划、错题与间隔复习 */
(function () {
  'use strict';

  const Data = window.CET4Data;
  const Checker = window.CET4Checker;
  const STORAGE_KEY = 'cet4_score_booster_v1';
  const VERSION = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const REVIEW_AFTER_ERROR_MS = 10 * 60 * 1000;
  const MASTER_GAP_DAYS = { 1: 3, 2: 7, 3: 14, 4: 30, 5: 30 };

  const MODULE_LABELS = {
    vocab: '语境词',
    listening: '听力',
    reading: '阅读',
    writing: '写作',
    translation: '翻译',
    syntax: '长句结构'
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function toISODate(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseISODate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  function startOfDay(date) {
    const d = date ? new Date(date.getTime()) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }
  function daysBetween(start, end) {
    return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
  }
  function uid(prefix) {
    const raw = (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : (Date.now().toString(36) + Math.random().toString(36).slice(2));
    return (prefix || 'id') + '_' + raw.slice(0, 14);
  }
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function formatDateCN(value) {
    let d;
    if (value instanceof Date) d = value;
    else if (typeof value === 'string') {
      d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISODate(value) : new Date(value);
    } else {
      d = new Date(value);
    }
    if (!d || isNaN(d.getTime())) return '—';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function formatWeekday(value) {
    const d = value instanceof Date ? value : new Date(value);
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  }
  function formatDateTime(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return formatDateCN(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function formatDue(ts) {
    if (!ts) return '—';
    const now = Date.now();
    if (ts <= now) return '现在可复习';
    const diff = ts - now;
    if (diff < 60 * 60 * 1000) return Math.max(1, Math.ceil(diff / 60000)) + ' 分钟后';
    const today = startOfDay(new Date());
    const dueDay = startOfDay(new Date(ts));
    const dayDiff = daysBetween(today, dueDay);
    if (dayDiff === 0) return '今天 ' + pad(new Date(ts).getHours()) + ':' + pad(new Date(ts).getMinutes());
    if (dayDiff === 1) return '明天 ' + pad(new Date(ts).getHours()) + ':' + pad(new Date(ts).getMinutes());
    return formatDateCN(new Date(ts)) + ' ' + pad(new Date(ts).getHours()) + ':' + pad(new Date(ts).getMinutes());
  }

  function defaultState() {
    const today = new Date();
    return {
      version: VERSION,
      createdAt: new Date().toISOString(),
      profile: {
        onboarded: false,
        examDate: toISODate(addDays(today, 30)),
        dailyMinutes: 50,
        target: 550,
        pastExam: 'none',
        selfWeak: [],
        planStartDate: toISODate(today),
        diagnostic: null
      },
      seenVocab: {},
      attempts: [],
      errors: [],
      reviewItems: [],
      planDone: {},
      dayAssignments: {},
      customMaterials: {
        vocabulary: [],
        listeningSets: [],
        readingSets: [],
        writingTasks: [],
        translationTasks: []
      },
      drafts: {},
      outputSessions: [],
      trueExamRecords: [],
      realTraining: { attempts: [], state: {}, watch: {}, vocab: {}, paused: null, pausedListening: null, listeningAttempts: [], fillAttempts: [], outputDrafts: {}, outputAttempts: [], matchAttempts: [] },
      settings: {
        showPinyin: true,
        reducedMotion: false
      }
    };
  }

  function hydrate(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const state = Object.assign({}, base, raw);
    state.profile = Object.assign({}, base.profile, raw.profile || {});
    state.customMaterials = Object.assign({}, base.customMaterials, raw.customMaterials || {});
    state.settings = Object.assign({}, base.settings, raw.settings || {});
    state.seenVocab = raw.seenVocab && typeof raw.seenVocab === 'object' ? raw.seenVocab : {};
    state.attempts = Array.isArray(raw.attempts) ? raw.attempts.slice(-6000) : [];
    state.errors = Array.isArray(raw.errors) ? raw.errors : [];
    state.reviewItems = Array.isArray(raw.reviewItems) ? raw.reviewItems : [];
    state.planDone = raw.planDone && typeof raw.planDone === 'object' ? raw.planDone : {};
    state.dayAssignments = raw.dayAssignments && typeof raw.dayAssignments === 'object' ? raw.dayAssignments : {};
    state.drafts = raw.drafts && typeof raw.drafts === 'object' ? raw.drafts : {};
    state.outputSessions = Array.isArray(raw.outputSessions) ? raw.outputSessions.slice(-500) : [];
    state.trueExamRecords = Array.isArray(raw.trueExamRecords) ? raw.trueExamRecords.slice(-100) : [];
    if (!raw.realTraining || typeof raw.realTraining !== 'object') {
      state.realTraining = { attempts: [], state: {}, watch: {} };
    } else {
      state.realTraining = {
        attempts: Array.isArray(raw.realTraining.attempts) ? raw.realTraining.attempts.slice(-3000) : [],
        state: raw.realTraining.state && typeof raw.realTraining.state === 'object' ? raw.realTraining.state : {},
        watch: raw.realTraining.watch && typeof raw.realTraining.watch === 'object' ? raw.realTraining.watch : {},
        vocab: raw.realTraining.vocab && typeof raw.realTraining.vocab === 'object' ? raw.realTraining.vocab : {},
        paused: raw.realTraining.paused && typeof raw.realTraining.paused === 'object' ? raw.realTraining.paused : null,
        pausedListening: raw.realTraining.pausedListening && typeof raw.realTraining.pausedListening === 'object' ? raw.realTraining.pausedListening : null,
        fillAttempts: Array.isArray(raw.realTraining.fillAttempts) ? raw.realTraining.fillAttempts : [],
        outputDrafts: raw.realTraining.outputDrafts && typeof raw.realTraining.outputDrafts === 'object' ? raw.realTraining.outputDrafts : {},
        outputAttempts: Array.isArray(raw.realTraining.outputAttempts) ? raw.realTraining.outputAttempts : [],
        matchAttempts: Array.isArray(raw.realTraining.matchAttempts) ? raw.realTraining.matchAttempts : [],
        listeningAttempts: Array.isArray(raw.realTraining.listeningAttempts) ? raw.realTraining.listeningAttempts : []
      };
    }
    ['vocabulary', 'listeningSets', 'readingSets', 'writingTasks', 'translationTasks'].forEach(function (key) {
      if (!Array.isArray(state.customMaterials[key])) state.customMaterials[key] = [];
    });
    if (!state.profile.examDate) state.profile.examDate = toISODate(addDays(new Date(), 30));
    if (!state.profile.planStartDate) state.profile.planStartDate = toISODate(new Date());
    return state;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return hydrate(JSON.parse(raw));
    } catch (err) {
      try { console.warn('读取本地进度失败', err); } catch (e) {}
      return defaultState();
    }
  }

  let state = loadState();
  let saveWarned = false;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      if (!saveWarned) {
        saveWarned = true;
        try { console.warn('保存进度失败', err); } catch (e) {}
      }
      return false;
    }
  }

  function content() {
    return {
      vocabulary: Data.VOCABULARY.concat(state.customMaterials.vocabulary || []),
      listeningSets: Data.LISTENING_SETS.concat(state.customMaterials.listeningSets || []),
      readingSets: Data.READING_SETS.concat(state.customMaterials.readingSets || []),
      writingTasks: Data.WRITING_TASKS.concat(state.customMaterials.writingTasks || []),
      translationTasks: Data.TRANSLATION_TASKS.concat(state.customMaterials.translationTasks || [])
    };
  }

  function findById(list, id) {
    return (list || []).find(function (x) { return x && x.id === id; }) || null;
  }

  function examDaysLeft() {
    const exam = parseISODate(state.profile.examDate);
    if (!exam) return 0;
    return Math.max(0, daysBetween(new Date(), exam));
  }

  function dayIndex(dateKey) {
    const start = parseISODate(state.profile.planStartDate) || startOfDay(new Date(state.createdAt));
    const target = parseISODate(dateKey || toISODate(new Date())) || new Date();
    return Math.max(0, daysBetween(start, target));
  }

  function getDiagnosticModuleRows() {
    const diag = state.profile.diagnostic;
    if (!diag || !diag.moduleScores) return [];
    return Object.keys(diag.moduleScores).map(function (key) {
      const item = diag.moduleScores[key];
      return {
        module: key,
        label: (Data.DIAGNOSTIC.skillLabels && Data.DIAGNOSTIC.skillLabels[key]) || MODULE_LABELS[key] || key,
        correct: item.correct,
        total: item.total,
        ratio: item.total ? item.correct / item.total : 0
      };
    });
  }

  function weakModules() {
    const diag = state.profile.diagnostic;
    const rows = getDiagnosticModuleRows();
    const base = rows.slice().sort(function (a, b) {
      if (a.ratio !== b.ratio) return a.ratio - b.ratio;
      const order = ['listening', 'reading', 'vocab', 'syntax', 'writing', 'translation'];
      return order.indexOf(a.module) - order.indexOf(b.module);
    });
    if (!diag) {
      const self = state.profile.selfWeak || [];
      const result = [];
      if (self.indexOf('listening') !== -1) result.push('listening');
      if (self.indexOf('reading') !== -1) result.push('reading');
      if (self.indexOf('writing') !== -1) result.push('writing');
      if (self.indexOf('translation') !== -1) result.push('translation');
      if (self.indexOf('vocab') !== -1) result.push('vocab');
      ['listening', 'reading', 'writing', 'translation', 'vocab', 'syntax'].forEach(function (m) {
        if (result.indexOf(m) === -1) result.push(m);
      });
      return result;
    }
    return base.map(function (x) { return x.module; });
  }

  function primaryModule() {
    const scores = (state.profile.diagnostic && state.profile.diagnostic.moduleScores) || {};
    const selfWeak = state.profile.selfWeak || [];
    function scoreFor(module) {
      let base;
      if (scores[module] && scores[module].total) base = scores[module].correct / scores[module].total;
      else base = 0.5;
      if (selfWeak.indexOf(module) !== -1) base -= 0.16;
      const rows = state.attempts.filter(function (a) {
        return a.module === module && (a.source === 'practice' || a.source === 'timed') && a.correct !== null && a.modality !== 'text-fallback';
      }).slice(-10);
      if (rows.length) {
        const performance = rows.filter(function (a) { return a.correct; }).length / rows.length;
        const weight = Math.min(0.62, rows.length / 10 * 0.62);
        base = base * (1 - weight) + performance * weight;
      }
      const repeat = state.errors.filter(function (e) {
        return e.module === module && !e.archived && (e.wrongCount || 1) >= 2;
      }).length;
      base -= Math.min(0.2, repeat * 0.045);
      return base;
    }
    const listening = scoreFor('listening');
    const reading = scoreFor('reading');
    if (Math.abs(listening - reading) < 0.001) {
      if (selfWeak.indexOf('listening') !== -1) return 'listening';
      if (selfWeak.indexOf('reading') !== -1) return 'reading';
      return 'listening';
    }
    return listening < reading ? 'listening' : 'reading';
  }

  function pickListeningSet(index) {
    const sets = content().listeningSets;
    if (!sets.length) return null;
    return sets[index % sets.length];
  }
  function pickReadingSet(index) {
    const sets = content().readingSets;
    if (!sets.length) return null;
    return sets[index % sets.length];
  }
  function pickOutput(index) {
    const writing = content().writingTasks;
    const translation = content().translationTasks;
    if (!writing.length && !translation.length) return { kind: null, task: null };
    const scores = (state.profile.diagnostic && state.profile.diagnostic.moduleScores) || {};
    let weakOut = index % 2 === 0 ? 'writing' : 'translation';
    if (scores.writing && scores.translation) {
      const wr = scores.writing.correct / Math.max(1, scores.writing.total);
      const tr = scores.translation.correct / Math.max(1, scores.translation.total);
      if (wr < tr) weakOut = 'writing';
      else if (tr < wr) weakOut = 'translation';
    } else if (!writing.length) {
      weakOut = 'translation';
    } else if (!translation.length) {
      weakOut = 'writing';
    }
    const kind = weakOut === 'writing' && writing.length ? 'writing' : (translation.length ? 'translation' : 'writing');
    const tasks = kind === 'writing' ? writing : translation;
    if (!tasks.length) return { kind: null, task: null };
    return { kind: kind, task: tasks[Math.floor(index / 2) % tasks.length] };
  }
  function pickVocab(count) {
    const all = content().vocabulary;
    if (!all.length) return [];
    const seen = state.seenVocab || {};
    const unseen = all.filter(function (v) { return !seen[v.id]; });
    const seenSorted = all.filter(function (v) { return !!seen[v.id]; }).sort(function (a, b) {
      const av = seen[a.id] ? new Date(seen[a.id].lastSeenAt || 0).getTime() : 0;
      const bv = seen[b.id] ? new Date(seen[b.id].lastSeenAt || 0).getTime() : 0;
      return av - bv;
    });
    const daysLeft = examDaysLeft();
    let pool;
    if (daysLeft <= 7 && seenSorted.length) {
      // 冲刺期不再无限加新词：优先把见过的词放回新语境。
      pool = seenSorted.concat(unseen);
    } else {
      pool = unseen.length >= count ? unseen : seenSorted.concat(unseen);
    }
    return pool.slice(0, count).map(function (x) { return x.id; });
  }

  function createAssignment(dateKey) {
    const idx = dayIndex(dateKey);
    const readingSet = pickReadingSet(idx);
    const listeningSet = pickListeningSet(idx);
    const output = pickOutput(idx);
    const vocabularyIds = pickVocab(state.profile.dailyMinutes >= 45 ? 3 : 2);
    const daysLeft = examDaysLeft();
    const highTarget = Number(state.profile.target) >= 550;
    const timed = (idx >= 3 && idx % 4 === 3) || (highTarget && idx >= 2 && idx % 3 === 2) || (daysLeft <= 14 && idx >= 1) || daysLeft <= 7;
    const primary = primaryModule();
    return {
      date: dateKey,
      generatedAt: new Date().toISOString(),
      vocabIds: vocabularyIds,
      listeningSetId: listeningSet ? listeningSet.id : null,
      readingSetId: readingSet ? readingSet.id : null,
      outputKind: output.kind,
      outputTaskId: output.task ? output.task.id : null,
      primaryModule: primary,
      readingTimed: timed
    };
  }

  function ensureDayAssignment(dateKey) {
    const key = dateKey || toISODate(new Date());
    if (!state.dayAssignments[key]) {
      state.dayAssignments[key] = createAssignment(key);
      save();
    }
    return state.dayAssignments[key];
  }

  function getPlanDone(dateKey) {
    return state.planDone[dateKey] || {};
  }

  function markPlanTaskDone(dateKey, taskId) {
    const key = dateKey || toISODate(new Date());
    if (!state.planDone[key]) state.planDone[key] = {};
    state.planDone[key][taskId] = new Date().toISOString();
    save();
  }

  function makeVocabQuestion(card) {
    return {
      id: 'vocab:' + card.id,
      questionKey: 'vocab:' + card.id,
      module: 'vocab',
      stem: card.question.stem,
      options: card.question.options.slice(),
      answer: card.question.answer,
      explain: card.question.explain,
      sentence: card.sentence,
      sentenceCn: card.sentenceCn,
      word: card.word,
      contextMeaning: card.contextMeaning,
      sourceLabel: '备考常用词示例 · 原创语境',
      transfer: deepClone(card.transfer)
    };
  }

  function makeListeningQuestion(set, question) {
    return {
      id: 'listening:' + set.id + ':' + question.id,
      questionKey: 'listening:' + set.id + ':' + question.id,
      module: 'listening',
      stem: question.stem,
      options: question.options.slice(),
      answer: question.answer,
      explain: question.explain,
      optionNotes: (question.optionNotes || []).slice(),
      evidenceIndex: question.evidenceIndex,
      keyPhrase: question.keyPhrase || '',
      script: deepClone(set.script),
      questionAudio: question.stem,
      setTitle: set.title,
      sourceLabel: set.source || '原创模拟听力 · 合成语音',
      transfer: null
    };
  }

  function makeReadingQuestion(set, question) {
    const sentences = [];
    (set.paragraphs || []).forEach(function (p) {
      (p.sentences || []).forEach(function (s) { sentences.push(s.text); });
    });
    return {
      id: 'reading:' + set.id + ':' + question.id,
      questionKey: 'reading:' + set.id + ':' + question.id,
      module: 'reading',
      stem: question.stem,
      options: question.options.slice(),
      answer: question.answer,
      explain: question.explain,
      optionNotes: (question.optionNotes || []).slice(),
      keywordTip: question.keywordTip || '',
      paraphrase: question.paraphrase || '',
      evidenceId: question.evidenceId || null,
      passage: sentences,
      paragraphs: deepClone(set.paragraphs || []),
      setTitle: set.title,
      sourceLabel: set.source || '原创模拟阅读 · 非真题',
      sourcePage: question.page || null,
      sourceSetId: set.id,
      sourceQuestionId: question.id,
      isReal: !!set.isReal,
      skills: question.skills || null,
      hints: question.hints || null,
      breakdown: question.breakdown || null,
      vocabFocus: question.vocabFocus || [],
      analysisSource: question.analysisSource || '',
      transfer: question.transfer ? deepClone(question.transfer) : null
    };
  }

  function transferForModule(module, seed) {
    const bank = Data.TRANSFER_BANK[module] || [];
    if (!bank.length) return null;
    const item = bank[Math.abs(seed || 0) % bank.length];
    const copy = deepClone(item);
    copy.module = module;
    return copy;
  }

  function buildTransfer(module, question, existingCount) {
    if (question && question.transfer) return deepClone(question.transfer);
    const bank = Data.TRANSFER_BANK[module] || [];
    if (bank.length) {
      const chosen = deepClone(bank[existingCount % bank.length]);
      chosen.module = module;
      return chosen;
    }
    if (module === 'writing' || module === 'translation') {
      return deepClone(Data.OUTPUT_TRANSFERS[module]);
    }
    return null;
  }

  function findErrorByQuestionKey(questionKey) {
    return state.errors.find(function (e) { return e.questionKey === questionKey && !e.archived; }) || null;
  }

  function recordAttempt(attempt) {
    const row = Object.assign({
      id: uid('a'),
      ts: new Date().toISOString(),
      module: 'reading',
      source: 'practice',
      correct: false,
      seconds: 0
    }, attempt);
    state.attempts.push(row);
    if (state.attempts.length > 6000) state.attempts = state.attempts.slice(-6000);
    save();
    return row;
  }

  function normalizeQuestionSnapshot(question) {
    const copy = deepClone(question || {});
    copy.options = (copy.options || []).map(function (x) { return String(x); });
    return copy;
  }

  function recordError(input) {
    const question = normalizeQuestionSnapshot(input.question);
    const questionKey = question.questionKey || question.id || uid('q');
    const existing = findErrorByQuestionKey(questionKey);
    const now = new Date().toISOString();
    let error;
    if (existing) {
      existing.wrongCount = (existing.wrongCount || 1) + 1;
      existing.lastWrongAt = now;
      existing.userAnswer = input.userAnswer;
      existing.question = question;
      existing.reasons = Array.from(new Set((existing.reasons || []).concat(input.reasons || [])));
      existing.updatedAt = now;
      existing.source = input.source || existing.source;
      error = existing;
    } else {
      const similarCount = state.errors.filter(function (e) { return e.module === input.module; }).length;
      error = {
        id: uid('err'),
        kind: input.kind || 'objective',
        module: input.module,
        questionKey: questionKey,
        question: question,
        transfer: buildTransfer(input.module, question, similarCount),
        userAnswer: input.userAnswer,
        reasons: Array.from(new Set(input.reasons || [])),
        wrongCount: 1,
        createdAt: now,
        lastWrongAt: now,
        updatedAt: now,
        source: input.source || 'practice',
        archived: false
      };
      error.reviewKey = 'error:' + error.id;
      state.errors.push(error);
    }
    const item = ensureReviewItem(error.reviewKey, 'error', error.id, Date.now() + REVIEW_AFTER_ERROR_MS);
    item.stage = 0;
    item.lastOutcome = '';
    item.dueAt = Date.now() + REVIEW_AFTER_ERROR_MS;
    save();
    return error;
  }

  function ensureReviewItem(key, kind, refId, dueAt) {
    let item = state.reviewItems.find(function (x) { return x.key === key; });
    if (!item) {
      item = {
        key: key,
        kind: kind,
        refId: refId,
        stage: 0,
        dueAt: dueAt,
        passCount: 0,
        failCount: 0,
        lastOutcome: '',
        lastReviewedAt: null,
        createdAt: new Date().toISOString(),
        history: []
      };
      state.reviewItems.push(item);
      save();
    } else if (dueAt && (!item.dueAt || dueAt < item.dueAt) && !item.lastReviewedAt) {
      item.dueAt = dueAt;
    }
    return item;
  }

  function updateErrorReasons(errorId, reasons) {
    const error = state.errors.find(function (e) { return e.id === errorId; });
    if (!error) return null;
    error.reasons = Array.from(new Set(reasons || []));
    error.updatedAt = new Date().toISOString();
    save();
    return error;
  }

  function recordVocabExposure(card, correct) {
    const now = new Date().toISOString();
    const prev = state.seenVocab[card.id] || {};
    state.seenVocab[card.id] = {
      firstSeenAt: prev.firstSeenAt || now,
      lastSeenAt: now,
      exposures: (prev.exposures || 0) + 1,
      lastResult: correct ? 'correct' : 'wrong'
    };
    if (correct) {
      const key = 'vocab:' + card.id;
      const existing = state.reviewItems.find(function (x) { return x.key === key; });
      if (!existing) {
        ensureReviewItem(key, 'vocab', card.id, Date.now() + DAY_MS);
      }
    }
    save();
  }

  function getErrorByReviewKey(key) {
    if (!key || key.indexOf('error:') !== 0) return null;
    const id = key.slice(6);
    return state.errors.find(function (e) { return e.id === id; }) || null;
  }
  function getVocabByReviewKey(key) {
    if (!key || key.indexOf('vocab:') !== 0) return null;
    const id = key.slice(6);
    return findById(content().vocabulary, id);
  }

  function getReviewItemView(item) {
    if (!item) return null;
    if (item.kind === 'error') {
      const error = state.errors.find(function (e) { return e.id === item.refId; });
      if (!error) return null;
      return { item: item, kind: 'error', error: error, title: error.question.setTitle || (error.module === 'vocab' ? error.question.word : error.question.stem), module: error.module };
    }
    if (item.kind === 'vocab') {
      const card = findById(content().vocabulary, item.refId);
      if (!card) return null;
      return { item: item, kind: 'vocab', card: card, title: card.word, module: 'vocab' };
    }
    return null;
  }

  function dueReviewViews(now) {
    const t = now || Date.now();
    return state.reviewItems
      .filter(function (item) { return item.dueAt <= t && getReviewItemView(item); })
      .sort(function (a, b) { return a.dueAt - b.dueAt; })
      .map(getReviewItemView);
  }

  function upcomingReviewCount(days) {
    const until = Date.now() + (days || 7) * DAY_MS;
    return state.reviewItems.filter(function (x) { return x.dueAt > Date.now() && x.dueAt <= until; }).length;
  }

  function recordReviewOutcome(key, success, meta) {
    const item = state.reviewItems.find(function (x) { return x.key === key; });
    if (!item) return null;
    const now = Date.now();
    item.lastReviewedAt = new Date(now).toISOString();
    item.lastOutcome = success ? 'pass' : 'fail';
    item.history = item.history || [];
    item.history.push({ at: new Date(now).toISOString(), success: !!success, meta: meta || {} });
    if (item.history.length > 20) item.history = item.history.slice(-20);
    if (success) {
      item.stage = Math.min((item.stage || 0) + 1, 5);
      item.passCount = (item.passCount || 0) + 1;
      const gap = MASTER_GAP_DAYS[item.stage] || 30;
      item.dueAt = now + gap * DAY_MS;
      item.failCount = item.failCount || 0;
    } else {
      item.stage = 0;
      item.failCount = (item.failCount || 0) + 1;
      item.dueAt = now + DAY_MS;
    }
    const error = item.kind === 'error' ? state.errors.find(function (e) { return e.id === item.refId; }) : null;
    if (error) error.lastReviewedAt = new Date(now).toISOString();
    save();
    return item;
  }

  function getReviewItemForKey(key) {
    return state.reviewItems.find(function (x) { return x.key === key; }) || null;
  }

  function errorStatus(error) {
    const item = error ? getReviewItemForKey(error.reviewKey) : null;
    if (!item) return { label: '待安排', tone: 'muted' };
    if (item.lastOutcome === 'pass' && (item.passCount || 0) >= 2) return { label: '已通过 ' + item.passCount + ' 次复习', tone: 'good' };
    if (item.lastOutcome === 'pass') return { label: '复习中 · 已通过 1 次', tone: 'mid' };
    if (item.dueAt <= Date.now()) return { label: '待复习', tone: 'warn' };
    return { label: formatDue(item.dueAt), tone: 'muted' };
  }

  function planTaskListFor(dateKey) {
    const key = dateKey || toISODate(new Date());
    const assignment = ensureDayAssignment(key);
    const contentNow = content();
    const due = dueReviewViews();
    const tasks = [];
    const done = getPlanDone(key);

    if (due.length) {
      tasks.push({
        id: 'review',
        type: 'review',
        tag: '回炉',
        title: '到期错题回炉',
        desc: '到期 ' + due.length + ' 个，本批最多复习 3 个：先重做原题，再换句/换篇检验。',
        minutes: 8,
        done: !!done.review && due.length === 0,
        reviewCount: due.length
      });
    }

    const vocabCards = (assignment.vocabIds || []).map(function (id) { return findById(contentNow.vocabulary, id); }).filter(Boolean);
    if (vocabCards.length) {
      tasks.push({
        id: 'vocab:' + vocabCards.map(function (x) { return x.id; }).join(','),
        type: 'vocab',
        tag: '语境',
        title: '语境词 · ' + vocabCards.length + ' 个',
        desc: '先判断词在句中的意思，再看搭配和同义替换；不要只背中文释义。',
        minutes: 8,
        done: !!done['vocab:' + vocabCards.map(function (x) { return x.id; }).join(',')]
      });
    }

    const primary = assignment.primaryModule === 'reading' ? 'reading' : 'listening';
    const secondary = primary === 'reading' ? 'listening' : 'reading';
    const order = [primary, secondary];

    order.forEach(function (module, index) {
      if (module === 'listening') {
        const set = findById(contentNow.listeningSets, assignment.listeningSetId);
        if (!set) return;
        const id = 'listening:' + set.id;
        tasks.push({
          id: id,
          type: 'listening',
          tag: index === 0 ? '主攻' : '巩固',
          title: set.title,
          desc: '先预读选项，再听录音；提交后才看原文和依据。',
          minutes: 11,
          done: !!done[id],
          contentId: set.id
        });
      } else {
        const set = findById(contentNow.readingSets, assignment.readingSetId);
        if (!set) return;
        const timed = !!assignment.readingTimed;
        const id = 'reading:' + set.id + ':' + (timed ? 'timed' : 'practice');
        tasks.push({
          id: id,
          type: 'reading',
          tag: timed ? '检验' : (index === 0 ? '主攻' : '巩固'),
          title: timed ? '限时阅读检验 · ' + set.title : set.title,
          desc: timed ? '计时完成，整组提交后才看解析；先保证有依据，再追求速度。' : '先点出原文依据，再选答案；解析会对照正确选项的改写。',
          minutes: timed ? 12 : 11,
          done: !!done[id],
          contentId: set.id,
          timed: timed
        });
      }
    });

    const outputKind = assignment.outputKind;
    const outputTask = outputKind === 'writing'
      ? findById(contentNow.writingTasks, assignment.outputTaskId)
      : findById(contentNow.translationTasks, assignment.outputTaskId);
    if (outputTask) {
      const id = 'output:' + outputKind + ':' + outputTask.id;
      tasks.push({
        id: id,
        type: 'output',
        tag: '输出',
        title: outputTask.title,
        desc: outputKind === 'writing' ? '先练句子，再连成段；按题目要点自检，不追求生僻词。' : '先找主干，再补修饰；参考译文不止一种。',
        minutes: outputKind === 'writing' ? 12 : (outputTask.timeMinutes || 12),
        done: !!done[id],
        outputKind: outputKind,
        contentId: outputTask.id
      });
    }

    const budget = Number(state.profile.dailyMinutes) || 50;
    const priority = tasks.slice().sort(function (a, b) {
      const rank = { review: 0, vocab: 1, listening: 2, reading: 2, output: 3 };
      const primaryRank = a.type === primary ? 0 : 1;
      const bPrimaryRank = b.type === primary ? 0 : 1;
      return (rank[a.type] - rank[b.type]) || (primaryRank - bPrimaryRank);
    });
    const chosen = [];
    let total = 0;
    priority.forEach(function (task) {
      if (chosen.length < 2 || total + task.minutes <= budget + 2) {
        if (task.type !== 'review' || task.reviewCount > 0) {
          chosen.push(task);
          total += task.minutes;
        }
      }
    });
    const finalTasks = tasks.filter(function (t) { return chosen.some(function (c) { return c.id === t.id; }); });
    const doneCount = finalTasks.filter(function (t) { return t.done; }).length;
    const remaining = finalTasks.filter(function (t) { return !t.done; }).reduce(function (n, t) { return n + t.minutes; }, 0);
    const next = finalTasks.find(function (t) { return !t.done; }) || null;
    return {
      date: key,
      assignment: assignment,
      tasks: finalTasks,
      totalMinutes: total,
      remainingMinutes: remaining,
      doneCount: doneCount,
      next: next,
      dueCount: due.length,
      primaryModule: primary
    };
  }

  function planTaskForId(taskId) {
    const plan = planTaskListFor();
    return plan.tasks.find(function (t) { return t.id === taskId; }) || null;
  }

  function selectReviewBatch(limit) {
    const due = dueReviewViews();
    const max = limit || 3;
    return due.slice(0, max);
  }

  function computeDiagnostic(answers) {
    const byModule = {};
    const rows = Data.DIAGNOSTIC.questions.map(function (q, i) {
      const answerRow = answers[i] || {};
      const chosen = typeof answerRow.answer === 'number' ? answerRow.answer : null;
      const correct = chosen === q.answer;
      if (!byModule[q.module]) byModule[q.module] = { correct: 0, total: 0 };
      byModule[q.module].total += 1;
      if (correct) byModule[q.module].correct += 1;
      return {
        id: q.id,
        module: q.module,
        chosen: chosen,
        correct: correct,
        seconds: Number(answerRow.seconds) || 0
      };
    });
    const readingTimes = rows.filter(function (r) { return r.module === 'reading'; }).map(function (r) { return r.seconds; }).filter(function (x) { return x > 0; });
    const avgSeconds = readingTimes.length ? Math.round(readingTimes.reduce(function (a, b) { return a + b; }, 0) / readingTimes.length) : 0;
    let speedLabel = '样本不足，训练中继续观察';
    if (avgSeconds && avgSeconds <= 55) speedLabel = '初步节奏尚可（题量很少，不能据此判断考试速度）';
    else if (avgSeconds) speedLabel = '阅读每题约 ' + avgSeconds + ' 秒，后续需要限时训练';
    const order = ['listening', 'reading', 'vocab', 'syntax', 'writing', 'translation'];
    const priorities = Object.keys(byModule).sort(function (a, b) {
      const ar = byModule[a].total ? byModule[a].correct / byModule[a].total : 0;
      const br = byModule[b].total ? byModule[b].correct / byModule[b].total : 0;
      if (ar !== br) return ar - br;
      return order.indexOf(a) - order.indexOf(b);
    });
    return {
      completedAt: new Date().toISOString(),
      answers: rows,
      moduleScores: byModule,
      priorities: priorities,
      speed: { averageReadingSeconds: avgSeconds, label: speedLabel },
      note: '样本仅 9 题，只用于初步分配训练，不代表真实考试分数。'
    };
  }

  function finishOnboarding(result) {
    state.profile.onboarded = true;
    state.profile.diagnostic = result || null;
    state.profile.planStartDate = toISODate(new Date());
    ensureDayAssignment(toISODate(new Date()));
    save();
  }

  function resetOnboarding() {
    state.profile.onboarded = false;
    state.profile.diagnostic = null;
    save();
  }

  function moduleStats() {
    const modules = ['vocab', 'listening', 'reading'];
    const result = {};
    modules.forEach(function (module) {
      const rows = state.attempts.filter(function (a) {
        return a.module === module && (a.source === 'practice' || a.source === 'timed') && a.correct !== null && a.modality !== 'text-fallback';
      });
      const correct = rows.filter(function (a) { return a.correct === true; }).length;
      const times = rows.map(function (a) { return Number(a.seconds) || 0; }).filter(function (x) { return x > 0 && x < 600; });
      const avg = times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0;
      let trend = null;
      if (rows.length >= 8) {
        const half = Math.floor(rows.length / 2);
        const earlier = rows.slice(0, half);
        const recent = rows.slice(-half);
        const e = earlier.filter(function (a) { return a.correct; }).length / Math.max(1, earlier.length);
        const r = recent.filter(function (a) { return a.correct; }).length / Math.max(1, recent.length);
        trend = { earlier: e, recent: r, diff: r - e, sample: rows.length };
      }
      result[module] = { attempts: rows.length, correct: correct, accuracy: rows.length ? correct / rows.length : null, avgSeconds: avg, trend: trend };
    });
    return result;
  }

  function reviewStats() {
    const items = state.reviewItems.filter(function (x) { return getReviewItemView(x); });
    const attempted = items.filter(function (x) { return (x.passCount || 0) + (x.failCount || 0) > 0 || x.lastReviewedAt; });
    const passed = attempted.filter(function (x) { return x.lastOutcome === 'pass'; });
    const mastered = items.filter(function (x) { return (x.passCount || 0) >= 2 && x.lastOutcome === 'pass'; });
    return {
      total: items.length,
      attempted: attempted.length,
      passed: passed.length,
      mastered: mastered.length,
      due: dueReviewViews().length,
      upcoming7: upcomingReviewCount(7),
      passRate: attempted.length ? passed.length / attempted.length : null
    };
  }

  function reasonStats() {
    const counts = {};
    state.errors.forEach(function (e) {
      (e.reasons || []).forEach(function (r) { counts[r] = (counts[r] || 0) + 1; });
    });
    return Object.keys(counts).map(function (key) {
      return { key: key, count: counts[key], label: (Data.REASONS[key] && Data.REASONS[key].label) || key, help: (Data.REASONS[key] && Data.REASONS[key].help) || '' };
    }).sort(function (a, b) { return b.count - a.count; });
  }

  function repeatErrors() {
    return state.errors.filter(function (e) { return (e.wrongCount || 1) >= 2; }).slice().sort(function (a, b) { return (b.wrongCount || 0) - (a.wrongCount || 0); });
  }

  function outputStats() {
    const rows = state.outputSessions || [];
    return {
      writing: rows.filter(function (x) { return x.module === 'writing'; }).length,
      translation: rows.filter(function (x) { return x.module === 'translation'; }).length,
      needsWork: rows.filter(function (x) { return x.selfRating === 'needs_work'; }).length
    };
  }

  function getRecentActivity(days) {
    const from = Date.now() - (days || 7) * DAY_MS;
    return state.attempts.filter(function (a) { return new Date(a.ts).getTime() >= from; });
  }

  function recordTrueExam(input) {
    const row = Object.assign({
      id: uid('real'),
      ts: new Date().toISOString(),
      examId: '',
      examTitle: '',
      modeId: 'full',
      modeLabel: '整套模考',
      correct: 0,
      total: 0,
      answered: 0,
      durationSeconds: 0
    }, input);
    state.trueExamRecords.push(row);
    if (state.trueExamRecords.length > 100) state.trueExamRecords = state.trueExamRecords.slice(-100);
    save();
    return row;
  }

  function recordOutput(input) {
    const row = {
      id: uid('out'),
      module: input.module,
      taskId: input.taskId,
      ts: new Date().toISOString(),
      words: input.words || 0,
      seconds: input.seconds || 0,
      selfRating: input.selfRating || 'neutral',
      feedback: input.feedback || {},
      text: input.text || ''
    };
    state.outputSessions.push(row);
    if (state.outputSessions.length > 500) state.outputSessions = state.outputSessions.slice(-500);
    save();
    return row;
  }

  function saveDraft(key, value) {
    state.drafts[key] = { value: value, updatedAt: new Date().toISOString() };
    save();
  }
  function getDraft(key) {
    return state.drafts[key] ? state.drafts[key].value : '';
  }

  function exportProgress() {
    return Object.assign({}, deepClone(state), {
      exportType: 'cet4-score-booster-progress',
      exportVersion: VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: Data.CONTENT_META.version
    });
  }

  function importProgress(payload) {
    if (!payload || typeof payload !== 'object') return { ok: false, message: '文件不是有效 JSON 对象。' };
    if (payload.exportType && payload.exportType !== 'cet4-score-booster-progress') {
      return { ok: false, message: '这不是本应用导出的进度文件。' };
    }
    if (!payload.profile || typeof payload.profile !== 'object') {
      return { ok: false, message: '文件缺少 profile，无法识别为学习进度。' };
    }
    const next = hydrate(payload);
    next.profile.onboarded = !!next.profile.onboarded;
    state = next;
    save();
    return { ok: true, message: '进度已导入。', stats: { attempts: state.attempts.length, errors: state.errors.length, reviews: state.reviewItems.length } };
  }

  function exportMaterialTemplate() {
    return {
      type: 'cet4-material-pack',
      version: 1,
      note: '只导入你有权使用的材料。词汇需提供 question 和 transfer；听力和阅读需至少 1 题。内置检查不会把导入材料称为真题。',
      vocabulary: [
        {
          word: 'allocate',
          phonetic: '/ˈæləkeɪt/',
          pos: 'v.',
          sentence: 'The school will allocate more funds to mental health services.',
          sentenceCn: '学校将向心理健康服务拨出更多资金。',
          contextMeaning: '分配，拨出',
          otherMeanings: [{ pos: 'n.', meaning: 'allocation 分配' }],
          collocations: ['allocate funds / time', 'allocate sth to sb/sth'],
          confusion: 'allocate 强调按计划分配资源，不等于 give。',
          example: 'Half of the budget was allocated to staff training.',
          exampleCn: '一半预算被分配给员工培训。',
          exampleNote: 'be allocated to = 被分配给。',
          examLink: '原文 allocate funds to ... → 选项常用 set aside money for ... 改写。',
          question: {
            stem: '在原句中，allocate 最接近的意思是：',
            options: ['分配', '借出', '节省', '筹集'],
            answer: 0,
            explain: 'allocate more funds to services = 向服务拨出更多资金。'
          },
          transfer: {
            stem: '新语境：Please allocate enough time for revision. 这里 allocate 的意思是：',
            options: ['安排/分配', '借出', '减少', '记录'],
            answer: 0,
            explain: 'allocate time = 安排时间。'
          }
        }
      ],
      listening: [
        {
          title: '示例听力：办公室调整',
          scenario: '对话',
          script: [
            { speaker: 'W', text: 'The meeting has been moved from Monday to Wednesday because the main room is being painted.' },
            { speaker: 'M', text: 'Thanks. Will it still start at ten?' },
            { speaker: 'W', text: 'Yes, and it will end an hour earlier than usual.' }
          ],
          questions: [
            {
              stem: 'Why has the meeting been moved?',
              options: ['The main room is being painted.', 'The manager is away.', 'A public holiday falls on Monday.', 'The meeting will be shorter.'],
              answer: 0,
              evidenceIndex: 0,
              explain: '女士说 because the main room is being painted，原因是粉刷主会议室。',
              optionNotes: ['A 对：because 后给出原因。', 'B 错：没有提到经理。', 'C 错：没有提到假期。', 'D 错：会议提前结束是另一个变化，不是改期的原因。']
            }
          ]
        }
      ],
      reading: [
        {
          title: '示例阅读：短时休息',
          paragraphs: [
            'Students often assume that the longer they study without a break, the more they will learn.',
            'However, attention usually begins to fall after about forty-five minutes.',
            'A short break can help restore focus, but a break that lasts too long may be difficult to end.'
          ],
          questions: [
            {
              stem: 'According to the passage, what can a short break do?',
              options: ['Help restore focus.', 'Make attention fall faster.', 'Replace all study time.', 'Remove the need for revision.'],
              answer: 0,
              evidence: 'A short break can help restore focus',
              explain: '第三句直接说 a short break can help restore focus；but 后提醒休息不能过长。',
              optionNotes: ['A 对：原文原词复现。', 'B 错：与原文相反。', 'C 错：原文只说帮助恢复注意力，不是替代学习。', 'D 错：没有说不需要复习。']
            }
          ]
        }
      ]
    };
  }

  function safeString(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max || 2000);
  }
  function safeOptions(value) {
    if (!Array.isArray(value)) return null;
    const opts = value.map(function (x) { return safeString(x, 500); }).filter(Boolean);
    if (opts.length < 2 || opts.length > 6) return null;
    return opts;
  }
  function validAnswer(answer, options) {
    const n = Number(answer);
    return Number.isInteger(n) && n >= 0 && n < options.length ? n : null;
  }
  function splitSentences(text) {
    const clean = safeString(text, 6000).replace(/\s+/g, ' ');
    const parts = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    return parts.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function slugId(text, prefix, index) {
    const base = safeString(text, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'item';
    return prefix + '-' + base + '-' + index + '-' + Date.now().toString(36).slice(-4);
  }

  function importMaterials(pack) {
    if (!pack || typeof pack !== 'object') return { ok: false, message: '材料文件不是有效对象。' };
    if (pack.type && pack.type !== 'cet4-material-pack') return { ok: false, message: '材料文件类型不对，应为 cet4-material-pack。' };
    const result = { ok: false, message: '', counts: { vocabulary: 0, listening: 0, reading: 0 }, warnings: [] };
    const vocabIn = Array.isArray(pack.vocabulary) ? pack.vocabulary.slice(0, 100) : [];
    const listenIn = Array.isArray(pack.listening) ? pack.listening.slice(0, 30) : [];
    const readIn = Array.isArray(pack.reading) ? pack.reading.slice(0, 30) : [];
    if (!vocabIn.length && !listenIn.length && !readIn.length) {
      return { ok: false, message: '没有找到 vocabulary / listening / reading 材料。' };
    }

    vocabIn.forEach(function (raw) {
      try {
        const word = safeString(raw.word, 80);
        const sentence = safeString(raw.sentence, 600);
        const q = raw.question || {};
        const t = raw.transfer || {};
        const options = safeOptions(q.options);
        const transferOptions = safeOptions(t.options);
        const answer = options ? validAnswer(q.answer, options) : null;
        const transferAnswer = transferOptions ? validAnswer(t.answer, transferOptions) : null;
        if (!word || !sentence || !options || answer === null || !safeString(q.stem, 300) || !transferOptions || transferAnswer === null || !safeString(t.stem, 300)) {
          result.warnings.push('跳过一条词汇材料：word / sentence / question / transfer 不完整。');
          return;
        }
        const id = slugId(word, 'custom-vocab', result.counts.vocabulary + 1);
        state.customMaterials.vocabulary.push({
          id: id,
          word: word,
          phonetic: safeString(raw.phonetic, 40),
          pos: safeString(raw.pos, 20) || 'v.',
          tags: ['导入材料'],
          sentence: sentence,
          sentenceCn: safeString(raw.sentenceCn, 600),
          contextMeaning: safeString(raw.contextMeaning, 300),
          otherMeanings: Array.isArray(raw.otherMeanings) ? raw.otherMeanings.slice(0, 5).map(function (x) { return { pos: safeString(x.pos, 20), meaning: safeString(x.meaning, 200) }; }) : [],
          collocations: Array.isArray(raw.collocations) ? raw.collocations.slice(0, 8).map(function (x) { return safeString(x, 200); }) : [],
          confusion: safeString(raw.confusion, 600),
          example: safeString(raw.example, 600) || sentence,
          exampleCn: safeString(raw.exampleCn, 600),
          exampleNote: safeString(raw.exampleNote, 600),
          examLink: safeString(raw.examLink, 600),
          question: { stem: safeString(q.stem, 300), options: options, answer: answer, explain: safeString(q.explain, 600) },
          transfer: { stem: safeString(t.stem, 300), options: transferOptions, answer: transferAnswer, explain: safeString(t.explain, 600) },
          sourceLabel: '导入材料 · 请自行核对来源'
        });
        result.counts.vocabulary += 1;
      } catch (err) {
        result.warnings.push('一条词汇材料格式异常，已跳过。');
      }
    });

    listenIn.forEach(function (raw) {
      try {
        const script = Array.isArray(raw.script) ? raw.script.slice(0, 40).map(function (line) {
          return { speaker: line.speaker === 'M' ? 'M' : 'W', text: safeString(line.text, 800) };
        }).filter(function (line) { return line.text; }) : [];
        if (!script.length || !Array.isArray(raw.questions) || !raw.questions.length) {
          result.warnings.push('跳过一组听力：script 或 questions 为空。');
          return;
        }
        const questions = [];
        raw.questions.slice(0, 10).forEach(function (q, qi) {
          const options = safeOptions(q.options);
          const answer = options ? validAnswer(q.answer, options) : null;
          if (!options || answer === null || !safeString(q.stem, 300)) return;
          questions.push({
            id: 'cq' + (qi + 1),
            stem: safeString(q.stem, 300),
            options: options,
            answer: answer,
            evidenceIndex: Number.isInteger(Number(q.evidenceIndex)) ? Math.max(0, Math.min(script.length - 1, Number(q.evidenceIndex))) : 0,
            keyPhrase: safeString(q.keyPhrase, 100),
            explain: safeString(q.explain, 800),
            optionNotes: Array.isArray(q.optionNotes) ? q.optionNotes.slice(0, 6).map(function (x) { return safeString(x, 400); }) : []
          });
        });
        if (!questions.length) {
          result.warnings.push('跳过一组听力：没有有效题目。');
          return;
        }
        state.customMaterials.listeningSets.push({
          id: slugId(raw.title || 'listening', 'custom-listening', result.counts.listening + 1),
          title: safeString(raw.title, 100) || '导入听力',
          scenario: safeString(raw.scenario, 60) || '导入材料',
          source: '导入材料 · 合成语音 · 请自行核对来源',
          sourceLabel: '导入材料',
          tip: safeString(raw.tip, 300) || '先预读选项，再听关键信息。',
          synthesized: true,
          script: script,
          questions: questions
        });
        result.counts.listening += 1;
      } catch (err) {
        result.warnings.push('一组听力材料格式异常，已跳过。');
      }
    });

    readIn.forEach(function (raw) {
      try {
        const paragraphs = [];
        const sourceParagraphs = Array.isArray(raw.paragraphs) ? raw.paragraphs : (raw.text ? [raw.text] : []);
        sourceParagraphs.slice(0, 12).forEach(function (text, pi) {
          const sentences = splitSentences(text).map(function (s, si) {
            return { id: 'cp' + (pi + 1) + 's' + (si + 1), text: s };
          });
          if (sentences.length) paragraphs.push({ id: 'cp' + (pi + 1), sentences: sentences });
        });
        if (!paragraphs.length || !Array.isArray(raw.questions) || !raw.questions.length) {
          result.warnings.push('跳过一篇阅读：paragraphs 或 questions 为空。');
          return;
        }
        const allSentences = [];
        paragraphs.forEach(function (p) { p.sentences.forEach(function (s) { allSentences.push(s); }); });
        const questions = [];
        raw.questions.slice(0, 10).forEach(function (q, qi) {
          const options = safeOptions(q.options);
          const answer = options ? validAnswer(q.answer, options) : null;
          if (!options || answer === null || !safeString(q.stem, 300)) return;
          let evidenceId = null;
          if (q.evidence) {
            const needle = safeString(q.evidence, 500).toLowerCase();
            const hit = allSentences.find(function (s) { return s.text.toLowerCase().indexOf(needle) !== -1 || needle.indexOf(s.text.toLowerCase()) !== -1; });
            if (hit) evidenceId = hit.id;
          }
          questions.push({
            id: 'cq' + (qi + 1),
            stem: safeString(q.stem, 300),
            options: options,
            answer: answer,
            evidenceId: evidenceId,
            keywordTip: safeString(q.keywordTip, 300),
            explain: safeString(q.explain, 800),
            paraphrase: safeString(q.paraphrase, 500),
            optionNotes: Array.isArray(q.optionNotes) ? q.optionNotes.slice(0, 6).map(function (x) { return safeString(x, 400); }) : []
          });
        });
        if (!questions.length) {
          result.warnings.push('跳过一篇阅读：没有有效题目。');
          return;
        }
        state.customMaterials.readingSets.push({
          id: slugId(raw.title || 'reading', 'custom-reading', result.counts.reading + 1),
          title: safeString(raw.title, 100) || '导入阅读',
          source: '导入材料 · 请自行核对来源',
          sourceLabel: '导入材料',
          level: '自定义',
          estimatedMinutes: Number(raw.estimatedMinutes) > 0 ? Number(raw.estimatedMinutes) : 8,
          paragraphs: paragraphs,
          questions: questions
        });
        result.counts.reading += 1;
      } catch (err) {
        result.warnings.push('一篇阅读材料格式异常，已跳过。');
      }
    });

    if (!result.counts.vocabulary && !result.counts.listening && !result.counts.reading) {
      return { ok: false, message: '没有成功导入的材料。', warnings: result.warnings };
    }
    save();
    result.ok = true;
    result.message = '导入成功：词汇 ' + result.counts.vocabulary + ' 条，听力 ' + result.counts.listening + ' 组，阅读 ' + result.counts.reading + ' 篇。';
    return result;
  }

  function resetAll() {
    state = defaultState();
    save();
    return state;
  }

  function getContentCounts() {
    const c = content();
    return {
      vocabulary: c.vocabulary.length,
      listening: c.listeningSets.length,
      reading: c.readingSets.length,
      writing: c.writingTasks.length,
      translation: c.translationTasks.length
    };
  }

  function updateProfile(patch) {
    Object.assign(state.profile, patch || {});
    save();
  }

  window.CET4Store = {
    get state() { return state; },
    setState(next) { state = hydrate(next); save(); },
    save,
    content,
    getContentCounts,
    findById,
    toISODate,
    parseISODate,
    formatDateCN,
    formatWeekday,
    formatDateTime,
    formatDue,
    startOfDay,
    addDays,
    examDaysLeft,
    dayIndex,
    weakModules,
    primaryModule,
    ensureDayAssignment,
    planTaskListFor,
    planTaskForId,
    markPlanTaskDone,
    getPlanDone,
    selectReviewBatch,
    dueReviewViews,
    upcomingReviewCount,
    makeVocabQuestion,
    makeListeningQuestion,
    makeReadingQuestion,
    recordAttempt,
    recordError,
    updateErrorReasons,
    recordVocabExposure,
    getErrorByReviewKey,
    getVocabByReviewKey,
    getReviewItemView,
    getReviewItemForKey,
    recordReviewOutcome,
    errorStatus,
    computeDiagnostic,
    finishOnboarding,
    resetOnboarding,
    getDiagnosticModuleRows,
    moduleStats,
    reviewStats,
    reasonStats,
    repeatErrors,
    outputStats,
    recordTrueExam,
    getRecentActivity,
    recordOutput,
    saveDraft,
    getDraft,
    exportProgress,
    importProgress,
    exportMaterialTemplate,
    importMaterials,
    resetAll,
    updateProfile,
    getReviewItemForErrorId(errorId) {
      const error = state.errors.find(function (e) { return e.id === errorId; });
      return error ? getReviewItemForKey(error.reviewKey) : null;
    },
    MODULE_LABELS,
    DAY_MS
  };
})();

