/* 四级提分台 · 学习流（learn flow）
 * ------------------------------------------------------------
 * 目标：打开就能做一篇真题，中途可断，做完带走具体收获，
 *       错的地方立刻在别的真题里用一次，并用真实对比说明进步。
 *
 * 只消费 window.CET4ReadingBanks（2024.06 / 2024.12 第1套阅读 C，共 20 题），
 * 每题自带 hints（三级提示）、explain、paraphrase、optionNotes、breakdown、
 * vocabFocus、transferQuestionId —— 本模块只负责把它们组织成"愿学、学得进"的流程。
 *
 * 状态独立存 localStorage：cet4_learn_v1，不与主应用进度互相污染。
 */
(function () {
  'use strict';

  const KEY = 'cet4_learn_v1';

  /* ============================ 内容元信息 ============================ */

  const THEMES = {
    psych: { label: '心理', note: '情绪 · 自我 · 人际' },
    health: { label: '健康', note: '身体 · 衰老 · 大脑' },
    env: { label: '环境', note: '自然 · 气候 · 城市' },
    society: { label: '社会', note: '职业 · 性别 · 教育' }
  };

  // 四篇真题的主题归属（人工判定，按文章主旨）
  const PASSAGE_THEME = {
    'p1': 'psych',
    'p2': 'health',
    'p2412p1': 'env',
    'p2412p2': 'society'
  };

  const PASSAGE_TITLE = {
    'p1': '自我价值与取悦他人',
    'p2': '衰老与大脑可塑性',
    'p2412p1': '人与自然的联系',
    'p2412p2': '工程领域的女性'
  };

  /* ============================ 存储 ============================ */

  function defaults() {
    return {
      theme: null,          // 主题偏好，null = 全部
      attempts: {},         // qid -> [{ mode, ok, hints, sec, at }]
      progress: null,       // { pid, bankId, mode, idx, answers, at }
      finished: {},         // pid -> 最后一次完成时间
      today: null,          // { date, pid, correct, total, at }
      pref: { sound: true }
    };
  }

  let state = defaults();

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      const base = defaults();
      return {
        theme: parsed.theme || null,
        attempts: parsed.attempts || {},
        progress: parsed.progress || null,
        finished: parsed.finished || {},
        today: parsed.today || null,
        pref: Object.assign(base.pref, parsed.pref || {})
      };
    } catch (e) {
      return defaults();
    }
  }

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式忽略 */ }
  }

  /* ============================ 数据访问 ============================ */

  function banks() { return window.CET4ReadingBanks || []; }

  function questionsOf(bank, pid) {
    return (bank.questions || []).filter(function (q) { return q.passageId === pid; })
      .sort(function (a, b) { return a.number - b.number; });
  }

  function wordCount(passage) {
    let n = 0;
    (passage.sentences || []).forEach(function (s) {
      n += String(s.text || '').split(/\s+/).filter(Boolean).length;
    });
    return n;
  }

  /** 全部可练的篇目卡片 */
  function cards() {
    const out = [];
    banks().forEach(function (bank) {
      (bank.paragraphs || []).forEach(function (passage) {
        const qs = questionsOf(bank, passage.id);
        if (!qs.length) return;
        out.push({
          bank: bank,
          passage: passage,
          qs: qs,
          theme: PASSAGE_THEME[passage.id] || 'society',
          title: PASSAGE_TITLE[passage.id] || passage.label,
          words: wordCount(passage)
        });
      });
    });
    return out;
  }

  function findCard(pid) {
    const list = cards();
    for (let i = 0; i < list.length; i++) if (list[i].passage.id === pid) return list[i];
    return null;
  }

  function findQuestion(qid) {
    const bs = banks();
    for (let i = 0; i < bs.length; i++) {
      const qs = bs[i].questions || [];
      for (let j = 0; j < qs.length; j++) {
        if (qs[j].id === qid) {
          let passage = null;
          (bs[i].paragraphs || []).forEach(function (p) { if (p.id === qs[j].passageId) passage = p; });
          return { bank: bs[i], q: qs[j], passage: passage };
        }
      }
    }
    return null;
  }

  function sentenceText(q, question) {
    const pid = question.passageId;
    let text = '';
    const bs = banks();
    for (let i = 0; i < bs.length; i++) {
      const ps = bs[i].paragraphs || [];
      for (let j = 0; j < ps.length; j++) {
        if (ps[j].id !== pid) continue;
        (ps[j].sentences || []).forEach(function (s) {
          if (s.id === question.evidenceId) text = s.text;
        });
      }
    }
    return text;
  }

  function attemptedBefore(qid) {
    const arr = state.attempts[qid] || [];
    return arr.length ? arr[arr.length - 1] : null;
  }

  function isFinished(pid) { return !!state.finished[pid]; }

  function todayDone() {
    return state.today && state.today.date === isoToday();
  }

  function isoToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ============================ 推荐 ============================ */

  /** 下一篇：优先未做过的、符合主题偏好的 */
  function pickNext(excludePid) {
    const list = cards().filter(function (c) { return c.passage.id !== excludePid; });
    if (!list.length) return null;

    const themed = state.theme ? list.filter(function (c) { return c.theme === state.theme; }) : list;
    const pool = themed.length ? themed : list;

    const fresh = pool.filter(function (c) { return !isFinished(c.passage.id); });
    if (fresh.length) {
      // 同一主题里先挑题量小的，更容易完成
      fresh.sort(function (a, b) { return a.qs.length - b.qs.length; });
      return fresh[0];
    }
    // 全做过：挑最久没做的
    pool.sort(function (a, b) {
      return (state.finished[a.passage.id] || 0) - (state.finished[b.passage.id] || 0);
    });
    return pool[0];
  }

  /* ============================ 视图状态 ============================ */

  const view = {
    page: 'home',
    pid: null,
    bankId: null,
    idx: 0,
    mode: 'learn',
    answers: {},      // qid -> { pick, ok, hints }
    hintShown: 0,
    pick: null,
    submitted: false,
    timerStart: 0,
    transferQid: null,
    harvest: null
  };

  let root = null;
  let timerHandle = null;

  function clearTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  /* ============================ 小工具 ============================ */

  const esc = (window.CET4App && window.CET4App.esc) || function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function letters(i) { return ['A', 'B', 'C', 'D', 'E'][i] || ''; }

  function fmtSec(s) {
    if (s == null) return '';
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  const ICON = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0012 3z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></svg>'
  };

  /* ============================ 音效 ============================ */

  let audioCtx = null;

  function beep(kind) {
    if (!state.pref.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      if (kind === 'good') { osc.frequency.setValueAtTime(660, now); osc.frequency.setValueAtTime(880, now + 0.08); }
      else if (kind === 'bad') { osc.frequency.setValueAtTime(320, now); osc.frequency.linearRampToValueAtTime(240, now + 0.16); }
      else { osc.frequency.setValueAtTime(520, now); }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) { /* 静默失败 */ }
  }

  /* ============================ 渲染入口 ============================ */

  function shell(content, active) {
    const core = window.__CET4_APP_CORE__;
    const body = '<div class="lr">' + content + '</div>';
    if (core && core.pageShell) return core.pageShell(active || 'today', body);
    return body;
  }

  function paint(html) {
    if (!root) root = document.getElementById('app');
    if (!root) return;
    root.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function render() {
    clearTimer();
    if (view.page === 'read') return renderRead();
    if (view.page === 'harvest') return renderHarvest();
    if (view.page === 'transfer') return renderTransfer();
    if (view.page === 'done') return renderDone();
    return renderHome();
  }

  /* ============================ 首页 ============================ */

  function renderHome() {
    const all = cards();
    const next = pickNext(null);
    const prog = state.progress;
    const progCard = prog ? findCard(prog.pid) : null;
    const done = todayDone();

    let html = '';

    // 主卡片
    if (next) {
      const theme = THEMES[next.theme] || { label: '', note: '' };
      html += '<div class="lr-start"><div class="lr-start-card">' +
        '<span class="lr-eyebrow">今天 · 约 10 分钟 · 一篇真题</span>' +
        '<h1 class="lr-h1">读一篇，<br>带走三样东西。</h1>' +
        '<p class="lr-start-sub">不用先设置。打开就做一篇，中途关掉，下次从断的地方接着来。</p>' +
        '<button type="button" class="lr-cta" data-lr-action="start" data-pid="' + esc(next.passage.id) + '" data-bank="' + esc(next.bank.id) + '">' +
          '开始这一篇 ' + ICON.arrow +
        '</button>' +
        '<p class="lr-cta-meta">' +
          '<span>' + esc(next.bank.year) + ' 第' + esc(next.bank.set) + '套 · ' + esc(next.passage.label) + '</span>' +
          '<span>' + esc(theme.label) + ' · ' + esc(next.title) + '</span>' +
          '<span>' + next.qs.length + ' 题 · 约 ' + next.words + ' 词</span>' +
        '</p>' +
      '</div>';

      // 主题 chips
      html += '<div class="lr-themes"><span class="lr-themes-label">想换个主题</span>' +
        '<button type="button" class="lr-chip" data-lr-action="theme" data-theme="" aria-pressed="' + (state.theme ? 'false' : 'true') + '">全部<small>' + all.length + '</small></button>';
      Object.keys(THEMES).forEach(function (key) {
        const count = all.filter(function (c) { return c.theme === key; }).length;
        if (!count) return;
        html += '<button type="button" class="lr-chip" data-lr-action="theme" data-theme="' + key + '" aria-pressed="' + (state.theme === key ? 'true' : 'false') + '">' +
          esc(THEMES[key].label) + '<small>' + count + '</small></button>';
      });
      html += '</div>';

      // 继续上次
      if (prog && progCard) {
        const answered = Object.keys(prog.answers || {}).length;
        html += '<div class="lr-resume">' +
          '<span>上次做到 <b>' + esc(progCard.title) + '</b> 第 ' + (answered + 1) + ' 题</span>' +
          '<button type="button" class="lr-inline-btn" data-lr-action="resume">接着做 ' + ICON.arrow + '</button>' +
        '</div>';
      }

      // 今天已完成
      if (done) {
        html += '<div class="lr-resume" style="background:var(--green-soft);border-color:#c7dcc9">' +
          '<span class="lr-done-badge">' + ICON.check + ' 今天已经完成 1 篇</span>' +
          '<span>再练一篇也不亏，但今天该拿的东西已经拿到了。</span>' +
          '<button type="button" class="lr-inline-btn" data-lr-action="start" data-pid="' + esc(next.passage.id) + '" data-bank="' + esc(next.bank.id) + '">再练一篇</button>' +
        '</div>';
      }

      html += '</div>';
    } else {
      html += '<div class="lr-start"><div class="lr-card"><h1 class="lr-h1">题库还没准备好</h1><p class="lr-muted">没有读到可练的真题数据，请确认 assets/reading-banks.js 已加载。</p></div></div>';
    }

    paint(shell(html, 'today'));
  }

  /* ============================ 开始一篇 ============================ */

  function startPassage(pid, bankId) {
    const card = findCard(pid);
    if (!card) return;
    view.page = 'read';
    view.pid = pid;
    view.bankId = bankId || card.bank.id;
    view.idx = 0;
    view.answers = {};
    view.pick = null;
    view.submitted = false;
    view.hintShown = 0;
    view.timerStart = Date.now();
    view.mode = state.pref.mode || 'learn';
    state.progress = {
      pid: pid,
      bankId: view.bankId,
      mode: view.mode,
      idx: 0,
      answers: {},
      at: Date.now()
    };
    save();
    render();
  }

  function resumePassage() {
    const prog = state.progress;
    if (!prog) return;
    const card = findCard(prog.pid);
    if (!card) { state.progress = null; save(); render(); return; }
    view.page = 'read';
    view.pid = prog.pid;
    view.bankId = prog.bankId || card.bank.id;
    view.mode = prog.mode || 'learn';
    view.answers = prog.answers || {};
    view.idx = Math.min(prog.idx || 0, card.qs.length - 1);
    view.pick = null;
    view.submitted = false;
    view.hintShown = 0;
    view.timerStart = Date.now();
    render();
  }

  /* ============================ 阅读页 ============================ */

  function renderRead() {
    const card = findCard(view.pid);
    if (!card) { view.page = 'home'; return renderHome(); }
    const qs = card.qs;
    const q = qs[view.idx];
    const answered = view.answers[q.id];
    const record = answered || null;
    const isLast = view.idx === qs.length - 1;

    const theme = THEMES[card.theme] || { label: '' };
    const answeredCount = Object.keys(view.answers).length;
    const pct = Math.round((answeredCount / qs.length) * 100);

    // 证据句（仅答完后显示）
    const evidence = record ? sentenceText(card, q) : '';

    let html = '';
    html += '<div class="lr-read">';

    // 顶栏
    html += '<div class="lr-bar">' +
      '<button type="button" class="lr-bar-back" data-lr-action="quit">' + ICON.back + ' 退出</button>' +
      '<span class="lr-bar-src">' + esc(card.bank.year) + ' 第' + esc(card.bank.set) + '套 · ' + esc(theme.label) + '</span>' +
      '<span class="lr-bar-count">' + (view.idx + 1) + ' / ' + qs.length + '</span>' +
      '<div class="lr-bar-right">' +
        '<div class="lr-mode" role="group" aria-label="练习模式">' +
          '<button type="button" data-lr-action="mode" data-mode="learn" aria-pressed="' + (view.mode === 'learn' ? 'true' : 'false') + '">学习</button>' +
          '<button type="button" data-lr-action="mode" data-mode="exam" aria-pressed="' + (view.mode === 'exam' ? 'true' : 'false') + '">检验</button>' +
        '</div>' +
        '<button type="button" class="lr-sound" data-lr-action="sound" data-on="' + (state.pref.sound ? 'true' : 'false') + '" aria-label="' + (state.pref.sound ? '关闭音效' : '开启音效') + '">' +
          (state.pref.sound ? ICON.sound : ICON.soundOff) +
        '</button>' +
      '</div>' +
    '</div>';

    html += '<div class="lr-progress-track"><div class="lr-progress-fill" style="width:' + pct + '%"></div></div>';

    // 文章
    html += renderArticle(card, evidence);

    // 题目
    html += renderQuestionCard(card, q, record, qs.length);

    // 底部操作
    html += '<div class="lr-actions" style="margin-top:16px">' + renderQuestionActions(q, record, isLast) + '</div>';

    html += '</div>';
    paint(shell(html, 'today'));

    // 检验模式计时
    if (view.mode === 'exam' && !record) {
      const el = document.getElementById('lr-timer');
      if (el) {
        timerHandle = setInterval(function () {
          const now = document.getElementById('lr-timer');
          if (!now) { clearTimer(); return; }
          now.textContent = fmtSec(Math.round((Date.now() - view.timerStart) / 1000));
        }, 1000);
      }
    }
  }

  function renderArticle(card, evidenceText) {
    const sentences = card.passage.sentences || [];
    let body = '';
    body += '<div class="lr-para"><span class="lr-para-label">' + esc(card.passage.label) + ' · ' + card.words + ' words</span>';
    sentences.forEach(function (s) {
      const isEv = evidenceText && s.text === evidenceText;
      body += '<p class="' + (isEv ? 'is-evidence' : '') + '">' + esc(s.text) + '</p>';
    });
    body += '</div>';

    return '<article class="lr-article" data-open="true" id="lr-article">' +
      '<button type="button" class="lr-article-head" data-lr-action="toggle-article">' +
        '<span class="lr-article-title">' + esc(card.title) + '</span>' +
        '<span class="lr-article-badge">' + card.qs.length + ' 题 · ' + card.words + ' 词</span>' +
        '<span class="lr-article-caret">' + ICON.chevron + '</span>' +
      '</button>' +
      '<div class="lr-article-body">' + body + '</div>' +
    '</article>';
  }

  function renderQuestionCard(card, q, record, total) {
    const submitted = !!record;
    const picked = record ? record.pick : view.pick;
    const correct = record ? record.ok : null;

    let html = '<div class="lr-q lr-card">';

    // 题干
    html += '<div class="lr-q-head">' +
      '<span class="lr-q-num">Q' + esc(q.number) + '</span>' +
      '<h2 class="lr-q-stem">' + esc(q.stem) + '</h2>' +
      (view.mode === 'exam' && !submitted ? '<span class="lr-tag"><span id="lr-timer">0:00</span></span>' : '') +
    '</div>';

    // 选项
    html += '<div class="lr-options">';
    (q.options || []).forEach(function (opt, i) {
      let cls = 'lr-opt';
      let extra = '';
      if (submitted) {
        if (i === q.answer) cls += ' is-correct';
        else if (i === picked) cls += ' is-wrong';
        else cls += ' is-dim';
        // 学习模式：给出错项的针对性说明
        if (view.mode === 'learn' && picked !== q.answer && i === picked && q.optionNotes && q.optionNotes[i]) {
          extra = '<span class="lr-opt-note">' + esc(q.optionNotes[i]) + '</span>';
        }
      }
      html += '<button type="button" class="' + cls + '" data-lr-action="pick" data-index="' + i + '"' +
        (submitted ? ' disabled' : '') +
        ' aria-pressed="' + (picked === i ? 'true' : 'false') + '">' +
        '<span class="lr-opt-letter">' + letters(i) + '</span>' +
        '<span>' + esc(opt) + extra + '</span>' +
      '</button>';
    });
    html += '</div>';

    // 提示区（学习模式、未作答）
    if (!submitted && view.mode === 'learn' && view.hintShown > 0 && q.hints) {
      const keys = ['keyword', 'structure', 'location'];
      const labels = { keyword: '先抓关键词', structure: '看句子结构', location: '定位到原文哪句' };
      html += '<div class="lr-hints">';
      for (let i = 0; i < view.hintShown && i < keys.length; i++) {
        const k = keys[i];
        if (!q.hints[k]) continue;
        html += '<div class="lr-hint"><b>' + esc(labels[k]) + '</b>' + esc(q.hints[k]) + '</div>';
      }
      html += '</div>';
    }

    // 反馈（已作答）
    if (submitted) {
      html += renderFeedback(card, q, record);
    }

    html += '</div>';
    return html;
  }

  function renderFeedback(card, q, record) {
    if (view.mode === 'exam') {
      // 检验模式：不透露解析，只确认已记录
      return '<div class="lr-feedback" data-tone="neutral">' +
        '<div class="lr-feedback-title">' + ICON.check + ' 已记录</div>' +
        '<p>检验模式下先不说对错。整组做完一起看，才知道哪些是真会了。</p>' +
      '</div>';
    }

    const ok = record.ok;
    const evidence = sentenceText(card, q);
    let html = '<div class="lr-feedback" data-tone="' + (ok ? 'good' : 'bad') + '">';

    if (ok) {
      html += '<div class="lr-feedback-title">' + ICON.check + ' 对了' + (record.hints ? '（用了 ' + record.hints + ' 条提示）' : '') + '</div>';
      html += '<p>' + esc(q.explain || '') + '</p>';
      if (evidence) {
        html += '<div class="lr-evidence"><span>答案就在这一句</span>' + esc(evidence) + '</div>';
      }
      if (q.paraphrase) {
        html += '<p class="lr-takeaway-line"><b>同义替换</b><span>' + esc(q.paraphrase) + '</span></p>';
      }
    } else {
      const right = letters(q.answer);
      html += '<div class="lr-feedback-title">' + ICON.close + ' 这次没对上' + (record.hints ? '（用了 ' + record.hints + ' 条提示）' : '') + '</div>';
      html += '<p>正确答案是 <strong>' + right + '</strong>。' + esc(q.explain || '') + '</p>';
      if (evidence) {
        html += '<div class="lr-evidence"><span>证据句</span>' + esc(evidence) + '</div>';
      }
      if (q.paraphrase) {
        html += '<p class="lr-takeaway-line"><b>同义替换</b><span>' + esc(q.paraphrase) + '</span></p>';
      }
      // 只看你选的那一项为什么错，不一次性塞满
      if (q.optionNotes && q.optionNotes[record.pick]) {
        html += '<p class="lr-takeaway-line"><b>你选的 ' + letters(record.pick) + '</b><span>' + esc(q.optionNotes[record.pick]) + '</span></p>';
      }
    }

    // 词：每题最多两个，答错时优先给
    if (q.vocabFocus && q.vocabFocus.length) {
      const v = q.vocabFocus[0];
      html += '<p class="lr-takeaway-line"><b>顺带记</b><span><strong>' + esc(v.term) + '</strong> ' + esc(v.meaning || '') + '</span></p>';
    }

    html += '</div>';
    return html;
  }

  function renderQuestionActions(q, record, isLast) {
    const submitted = !!record;

    if (!submitted) {
      let html = '';
      if (view.mode === 'learn' && q.hints) {
        const used = view.hintShown;
        const total = ['keyword', 'structure', 'location'].filter(function (k) { return q.hints[k]; }).length;
        if (used < total) {
          html += '<button type="button" class="lr-btn lr-btn-hint" data-lr-action="hint">' + ICON.bulb + ' 卡住了？给一点提示' +
            (used ? '（' + used + '/' + total + '）' : '') + '</button>';
        }
      }
      html += '<button type="button" class="lr-btn" data-lr-action="submit"' + (view.pick == null ? ' disabled' : '') + '>提交</button>';
      return html;
    }

    // 已作答
    let html = '';
    if (!isLast) {
      html += '<button type="button" class="lr-btn" data-lr-action="next">下一题 ' + ICON.arrow + '</button>';
    } else {
      html += '<button type="button" class="lr-btn" data-lr-action="finish">看这一组的收获 ' + ICON.arrow + '</button>';
    }
    if (view.mode === 'learn' && !record.ok) {
      html += '<button type="button" class="lr-btn lr-btn-quiet" data-lr-action="redeem">先加入待回炉</button>';
    }
    return html;
  }

  /* ============================ 交卷 / 收获 ============================ */

  function submitAnswer() {
    if (view.pick == null) return;
    const card = findCard(view.pid);
    if (!card) return;
    const q = card.qs[view.idx];
    if (view.answers[q.id]) return;

    const ok = view.pick === q.answer;
    const sec = Math.max(1, Math.round((Date.now() - view.timerStart) / 1000));

    view.answers[q.id] = { pick: view.pick, ok: ok, hints: view.hintShown, sec: sec, mode: view.mode };

    // 写入历史
    const arr = state.attempts[q.id] || (state.attempts[q.id] = []);
    arr.push({ mode: view.mode, ok: ok, hints: view.hintShown, sec: sec, at: Date.now() });
    if (arr.length > 8) arr.splice(0, arr.length - 8);

    // 进度
    if (state.progress) {
      state.progress.idx = view.idx;
      state.progress.answers = view.answers;
      state.progress.mode = view.mode;
      state.progress.at = Date.now();
    }
    save();

    beep(ok ? 'good' : 'bad');
    clearTimer();
    render();
  }

  function goNext() {
    const card = findCard(view.pid);
    if (!card) return;
    if (view.idx < card.qs.length - 1) {
      view.idx += 1;
      view.pick = null;
      view.hintShown = 0;
      view.timerStart = Date.now();
      if (state.progress) { state.progress.idx = view.idx; save(); }
      render();
    }
  }

  function finishPassage() {
    const card = findCard(view.pid);
    if (!card) return;

    const items = card.qs.map(function (q) {
      const rec = view.answers[q.id] || null;
      return { q: q, rec: rec, prev: attemptedBefore(q.id) };
    }).filter(function (x) { return x.rec; });

    const correct = items.filter(function (x) { return x.rec.ok; }).length;
    const total = items.length;
    const indep = items.filter(function (x) { return x.rec.ok && !x.rec.hints; }).length;
    const examItems = items.filter(function (x) { return x.rec.mode === 'exam'; });
    const examCorrect = examItems.filter(function (x) { return x.rec.ok; }).length;

    // 变化清单：和上一次同题记录比
    const changes = [];
    items.forEach(function (x) {
      const prev = (state.attempts[x.q.id] || []).slice(0, -1).pop(); // 本次记录已入栈，取上一条
      if (!prev) return;
      const tag = 'Q' + x.q.number;
      if (!prev.ok && x.rec.ok) {
        changes.push({ text: tag + ' 这次做对了，上次是错的' + (prev.hints ? '，而且上次用了 ' + prev.hints + ' 条提示' : ''), kind: 'up' });
      } else if (prev.hints && !x.rec.hints && x.rec.ok) {
        changes.push({ text: tag + ' 这次没看提示就自己找对了', kind: 'up' });
      } else if (!prev.ok && !x.rec.ok) {
        changes.push({ text: tag + ' 还在同一个点上，记下来下次专攻这道', kind: 'hold' });
      }
    });

    view.harvest = {
      pid: card.passage.id,
      card: card,
      items: items,
      correct: correct,
      total: total,
      indep: indep,
      examTotal: examItems.length,
      examCorrect: examCorrect,
      changes: changes.slice(0, 4)
    };

    // 标记完成
    state.finished[card.passage.id] = Date.now();
    state.today = { date: isoToday(), pid: card.passage.id, correct: correct, total: total, at: Date.now() };
    state.progress = null;
    save();

    view.page = 'harvest';
    view.transferQid = null;
    beep('good');
    render();
  }

  function renderHarvest() {
    const h = view.harvest;
    if (!h) { view.page = 'home'; return renderHome(); }
    const card = h.card;

    // 精选三样：优先从错题里取
    const wrongItems = h.items.filter(function (x) { return !x.rec.ok; });
    const srcPool = wrongItems.length ? wrongItems.concat(h.items) : h.items;

    // 1) 词
    const words = [];
    srcPool.forEach(function (x) {
      (x.q.vocabFocus || []).forEach(function (v) {
        if (words.length >= 2) return;
        if (words.some(function (w) { return w.term === v.term; })) return;
        words.push({ term: v.term, meaning: v.meaning, note: v.note, q: x.q });
      });
    });

    // 2) 难句
    let sentence = null;
    for (let i = 0; i < srcPool.length; i++) {
      const b = srcPool[i].q.breakdown;
      if (b && (b.plain || b.mainClause)) { sentence = { b: b, q: srcPool[i].q }; break; }
    }

    // 3) 同义替换
    let para = null;
    for (let i = 0; i < srcPool.length; i++) {
      if (srcPool[i].q.paraphrase) { para = { text: srcPool[i].q.paraphrase, q: srcPool[i].q }; break; }
    }

    let html = '<div class="lr-harvest">';
    html += '<span class="lr-eyebrow">' + esc(card.bank.year) + ' 第' + esc(card.bank.set) + '套 · ' + esc(card.title) + '</span>';
    html += '<h1 class="lr-h1">你带走了三样东西。</h1>';
    html += '<p class="lr-muted">不是"做完了"，是这三样现在属于你了。</p>';

    html += '<div class="lr-takeaways">';

    if (words.length) {
      html += '<article class="lr-takeaway"><span class="lr-takeaway-num">1</span><div class="lr-takeaway-body">' +
        '<span class="lr-takeaway-kind">词 / 短语</span>' +
        words.map(function (w) {
          return '<p class="lr-takeaway-term">' + esc(w.term) + '</p><p class="lr-takeaway-text">' + esc(w.meaning || '') + '</p>' +
            (w.note ? '<span class="lr-takeaway-src">' + esc(w.note) + '</span>' : '');
        }).join('') +
      '</div></article>';
    }

    if (sentence) {
      html += '<article class="lr-takeaway"><span class="lr-takeaway-num">2</span><div class="lr-takeaway-body">' +
        '<span class="lr-takeaway-kind">一个长难句</span>' +
        '<p class="lr-takeaway-text">' + esc(sentence.b.plain || '') + '</p>' +
        (sentence.b.mainClause ? '<span class="lr-takeaway-src">主干：' + esc(sentence.b.mainClause) + '</span>' : '') +
      '</div></article>';
    }

    if (para) {
      html += '<article class="lr-takeaway"><span class="lr-takeaway-num">3</span><div class="lr-takeaway-body">' +
        '<span class="lr-takeaway-kind">一种同义替换</span>' +
        '<p class="lr-takeaway-text">' + esc(para.text) + '</p>' +
      '</div></article>';
    }

    html += '</div>';

    // 表现
    html += '<div class="lr-score">' +
      '<div class="lr-score-cell"><b>' + h.correct + '/' + h.total + '</b><span>这一组做对</span></div>' +
      '<div class="lr-score-cell"><b>' + h.indep + '</b><span>没看提示就选对</span></div>' +
      (h.examTotal ? '<div class="lr-score-cell"><b>' + h.examCorrect + '/' + h.examTotal + '</b><span>检验模式（没提示）</span></div>' : '') +
    '</div>';

    if (h.changes.length) {
      html += '<ul class="lr-changes">' + h.changes.map(function (c) {
        return '<li data-kind="' + esc(c.kind) + '">' + esc(c.text) + '</li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="lr-muted">这是你第一次做这一组，还没有可比的旧记录。下次再做同一组，就能看到具体变化。</p>';
    }

    // 动作
    html += '<div class="lr-harvest-actions">';
    const t = pickTransfer(h);
    if (t) {
      html += '<button type="button" class="lr-btn" data-lr-action="transfer">马上用一次 ' + ICON.arrow + '</button>';
    }
    html += '<button type="button" class="lr-btn lr-btn-quiet" data-lr-action="done">今天到这</button>';
    html += '</div>';

    html += '</div>';
    paint(shell(html, 'today'));
  }

  /* ============================ 同类补练 ============================ */

  function pickTransfer(h) {
    const selfIds = h.items.map(function (x) { return x.q.id; });

    // 1) 错题自带的跨套推荐
    const wrongs = h.items.filter(function (x) { return !x.rec.ok; });
    for (let i = 0; i < wrongs.length; i++) {
      const tid = wrongs[i].q.transferQuestionId;
      if (!tid) continue;
      const found = findQuestion(tid);
      if (found && selfIds.indexOf(tid) < 0) return found;
    }

    // 2) 按考点匹配：同 skill、不同套、没做过
    const skills = wrongs.map(function (x) { return x.q.skills && x.q.skills.primary; }).filter(Boolean);
    const bs = banks();
    for (let s = 0; s < skills.length; s++) {
      for (let i = 0; i < bs.length; i++) {
        const qs = bs[i].questions || [];
        for (let j = 0; j < qs.length; j++) {
          const q = qs[j];
          if (selfIds.indexOf(q.id) >= 0) continue;
          if (!q.skills || q.skills.primary !== skills[s]) continue;
          if (attemptedBefore(q.id)) continue;
          const found = findQuestion(q.id);
          if (found) return found;
        }
      }
    }
    return null;
  }

  function renderTransfer() {
    const t = view.transferQid ? findQuestion(view.transferQid) : null;
    if (!t || !t.passage) { view.page = 'harvest'; return renderHarvest(); }

    const card = cards().filter(function (c) { return c.passage.id === t.passage.id; })[0];
    const q = t.q;
    const record = view.answers[q.id] || null;

    let html = '<div class="lr-read">';
    html += '<div class="lr-bar">' +
      '<button type="button" class="lr-bar-back" data-lr-action="back-harvest">' + ICON.back + ' 回到收获</button>' +
      '<span class="lr-bar-src">' + esc(t.bank.year) + ' 第' + esc(t.bank.set) + '套 · 另一套卷</span>' +
      '<div class="lr-bar-right"><span class="lr-tag">同类考点</span></div>' +
    '</div>';

    html += '<div class="lr-transfer-note">' +
      ICON.spark +
      '<span>刚在上一组卡住的考点，正好在这一套里有同类型的题。现在做，趁热。</span>' +
    '</div>';

    if (card) html += renderArticle(card, record ? sentenceText(card, q) : '');
    html += renderQuestionCard(card || { qs: [q] }, q, record, 1);
    html += '</div>';

    paint(shell(html, 'today'));
  }

  function submitTransfer() {
    const t = findQuestion(view.transferQid);
    if (!t || view.pick == null) return;
    const q = t.q;
    if (view.answers[q.id]) return;

    const ok = view.pick === q.answer;
    view.answers[q.id] = { pick: view.pick, ok: ok, hints: view.hintShown, sec: 0, mode: 'learn' };

    const arr = state.attempts[q.id] || (state.attempts[q.id] = []);
    arr.push({ mode: 'learn', ok: ok, hints: 0, at: Date.now() });
    if (arr.length > 8) arr.splice(0, arr.length - 8);
    save();

    beep(ok ? 'good' : 'bad');
    render();
  }

  /* ============================ 结束页 ============================ */

  function renderDone() {
    const t = state.today;
    const finishedCount = Object.keys(state.finished || {}).length;
    const totalCards = cards().length;
    const attempted = Object.keys(state.attempts || {}).length;

    let html = '<div class="lr-done-wrap">';
    html += '<div class="lr-done-mark">' + ICON.check + '</div>';
    html += '<h1 class="lr-done-title">今天到这儿。</h1>';
    html += '<p class="lr-done-line">' +
      (t ? '这一组 ' + t.correct + '/' + t.total + '。' : '') +
      '该拿的三样东西已经收进收获页；不看打卡天数，也不逼你明天必须来。' +
    '</p>';

    html += '<div class="lr-done-stats">' +
      '<div><b>' + (t ? t.correct + '/' + t.total : '—') + '</b><span>今天这一组</span></div>' +
      '<div><b>' + finishedCount + '/' + totalCards + '</b><span>做过的篇目</span></div>' +
      '<div><b>' + attempted + '</b><span>累计真题作答</span></div>' +
    '</div>';

    html += '<div class="lr-done-actions">';
    const next = pickNext(view.harvest ? view.harvest.pid : null);
    if (next) {
      html += '<button type="button" class="lr-btn" data-lr-action="start" data-pid="' + esc(next.passage.id) + '" data-bank="' + esc(next.bank.id) + '">再来一篇 ' + ICON.arrow + '</button>';
    }
    html += '<button type="button" class="lr-btn lr-btn-quiet" data-lr-action="home">先结束</button>';
    html += '</div>';

    html += '</div>';
    paint(shell(html, 'today'));
  }

  /* ============================ 事件 ============================ */

  function onClick(event) {
    const el = event.target.closest ? event.target.closest('[data-lr-action]') : null;
    if (!el) return;
    const action = el.getAttribute('data-lr-action');
    event.preventDefault();
    event.stopPropagation();

    if (action === 'start') {
      startPassage(el.getAttribute('data-pid'), el.getAttribute('data-bank'));
      return;
    }

    if (action === 'resume') { resumePassage(); return; }

    if (action === 'theme') {
      const key = el.getAttribute('data-theme');
      state.theme = key || null;
      save();
      renderHome();
      return;
    }

    if (action === 'quit') {
      // 保存进度后回首页
      if (state.progress) { state.progress.idx = view.idx; state.progress.answers = view.answers; state.progress.at = Date.now(); save(); }
      view.page = 'home';
      render();
      return;
    }

    if (action === 'mode') {
      view.mode = el.getAttribute('data-mode');
      if (state.progress) { state.progress.mode = view.mode; save(); }
      render();
      return;
    }

    if (action === 'sound') {
      state.pref.sound = !state.pref.sound;
      save();
      render();
      return;
    }

    if (action === 'toggle-article') {
      const art = document.getElementById('lr-article');
      if (art) art.setAttribute('data-open', art.getAttribute('data-open') === 'true' ? 'false' : 'true');
      return;
    }

    if (action === 'pick') {
      const idx = Number(el.getAttribute('data-index'));
      if (view.page === 'transfer') { view.pick = idx; renderTransfer(); }
      else { view.pick = idx; render(); }
      return;
    }

    if (action === 'hint') {
      view.hintShown += 1;
      render();
      return;
    }

    if (action === 'submit') {
      if (view.page === 'transfer') submitTransfer();
      else submitAnswer();
      return;
    }

    if (action === 'next') { goNext(); return; }

    if (action === 'finish') { finishPassage(); return; }

    if (action === 'redeem') {
      // 仅作提示：错题已进历史，主应用错题本可见
      if (window.CET4App && window.CET4App.toast) window.CET4App.toast('已记下这道题，下次同类题会再遇到它。');
      el.parentNode && el.parentNode.removeChild(el);
      return;
    }

    if (action === 'transfer') {
      const h = view.harvest;
      const t = h ? pickTransfer(h) : null;
      if (!t) return;
      view.transferQid = t.q.id;
      view.pick = null;
      view.hintShown = 0;
      view.page = 'transfer';
      render();
      return;
    }

    if (action === 'back-harvest') {
      view.page = 'harvest';
      view.pick = null;
      render();
      return;
    }

    if (action === 'done') {
      view.page = 'done';
      render();
      return;
    }

    if (action === 'home') {
      view.page = 'home';
      render();
      return;
    }
  }

  document.addEventListener('click', onClick, true);

  /* ============================ 对外接口 ============================ */

  window.CET4Learn = {
    mount: function (target) {
      root = target || document.getElementById('app');
      state = load();
      view.page = 'home';
      view.harvest = null;
      render();
      return true;
    },
    render: render,
    isActive: function () { return view.page !== 'home'; },
    exit: function () {
      clearTimer();
      if (view.page !== 'home') {
        view.page = 'home';
        view.harvest = null;
      }
    },
    reload: function () { state = load(); },
    _debug: function () { return { state: state, view: view }; }
  };
})();
