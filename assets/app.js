/* 四级提分台 · 主应用 */
(function () {
  'use strict';

  const Data = window.CET4Data;
  const Store = window.CET4Store;
  const Checker = window.CET4Checker;
  const root = document.getElementById('app');

  const view = {
    tab: 'today',
    session: null,
    errorFilter: 'all',
    libraryFilter: { level: 'CET4', year: 'all', status: 'all' }
  };
  let onboard = null;
  let timerHandle = null;
  let uiToastTimer = null;
  let draftTimer = null;
  let speechRun = 0;

  const ICONS = {
    today: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/></svg>',
    exam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/></svg>',
    train: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5M8 17h3"/></svg>',
    errors: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  const TAB_LABELS = {
    today: '练习',
    exam: '真题',
    train: '词本',
    errors: '错题本',
    progress: '进度',
    settings: '设置'
  };
  const MODULE_LABELS = {
    vocab: '语境词',
    listening: '听力',
    reading: '阅读',
    writing: '写作',
    translation: '翻译',
    syntax: '长句'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function nl2br(value) {
    return esc(value).replace(/\n/g, '<br>');
  }
  function formatClock(seconds) {
    const s = Math.max(0, Math.round(seconds || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function formatSecondsShort(seconds) {
    const s = Math.round(seconds || 0);
    if (!s) return '—';
    if (s < 60) return s + ' 秒';
    return Math.floor(s / 60) + ' 分 ' + (s % 60 ? (s % 60) + ' 秒' : '');
  }
  function moduleLabel(m) { return MODULE_LABELS[m] || m || ''; }
  function percent(n) { return Math.round((n || 0) * 100) + '%'; }
  function isoToday() { return Store.toISODate(new Date()); }
  function currentPlan() { return Store.planTaskListFor(isoToday()); }
  function optionLetters(index) { return ['A', 'B', 'C', 'D', 'E', 'F'][index] || String(index + 1); }

  function highlightTerm(text, term) {
    const safe = esc(text);
    if (!term) return safe;
    try {
      const pattern = esc(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return safe.replace(new RegExp('\\b(' + pattern + ')\\b', 'gi'), '<mark>$1</mark>');
    } catch (err) {
      return safe;
    }
  }

  function toast(message, kind) {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    host.innerHTML = '<div class="toast ' + (kind || '') + '">' + esc(message) + '</div>';
    if (uiToastTimer) clearTimeout(uiToastTimer);
    uiToastTimer = setTimeout(function () { host.innerHTML = ''; }, 3600);
  }

  function hideToast() {
    if (uiToastTimer) {
      clearTimeout(uiToastTimer);
      uiToastTimer = null;
    }
    const host = document.getElementById('toast-host');
    if (host) host.innerHTML = '';
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  function stopSpeech() {
    speechRun += 1;
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (err) {}
  }

  function englishVoices() {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices().filter(function (v) {
      return /^en(-|_|$)/i.test(v.lang || '');
    });
  }

  function guessVoice(kind) {
    const voices = englishVoices();
    if (!voices.length) return null;
    const male = voices.find(function (v) { return /(male|david|mark|george|guy|daniel|alex)/i.test(v.name); });
    const female = voices.find(function (v) { return /(female|zira|susan|samantha|karen|serena|aria|jenny)/i.test(v.name); });
    if (kind === 'M' && male) return male;
    if (kind === 'W' && female) return female;
    return voices[(kind === 'M' ? 1 : 0) % voices.length] || voices[0];
  }

  function speakParts(parts, callbacks) {
    callbacks = callbacks || {};
    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
      if (callbacks.onUnavailable) callbacks.onUnavailable();
      return false;
    }
    const voices = englishVoices();
    if (!voices.length) {
      if (callbacks.onUnavailable) callbacks.onUnavailable();
      return false;
    }
    stopSpeech();
    const run = speechRun;
    let errored = false;
    let finished = 0;
    synth.cancel();
    const safeParts = (parts || []).filter(function (p) { return p && p.text; });
    if (!safeParts.length) {
      if (callbacks.onDone) callbacks.onDone();
      return true;
    }
    safeParts.forEach(function (part, index) {
      const utter = new SpeechSynthesisUtterance(part.text);
      const voice = guessVoice(part.speaker);
      if (voice) utter.voice = voice;
      utter.lang = (voice && voice.lang) || 'en-US';
      utter.rate = part.rate || 0.91;
      utter.pitch = part.speaker === 'M' ? 0.86 : 1.05;
      utter.volume = 1;
      utter.onstart = function () {
        if (run !== speechRun) return;
        if (callbacks.onProgress) callbacks.onProgress(index + 1, safeParts.length);
      };
      utter.onend = function () {
        if (run !== speechRun) return;
        finished += 1;
        if (finished >= safeParts.length && !errored) {
          if (callbacks.onDone) callbacks.onDone();
        }
      };
      utter.onerror = function (event) {
        if (run !== speechRun) return;
        if (event && (event.error === 'interrupted' || event.error === 'canceled')) return;
        if (errored) return;
        errored = true;
        if (callbacks.onError) callbacks.onError(event && event.error ? event.error : 'speech-error');
      };
      try {
        synth.speak(utter);
      } catch (err) {
        if (!errored) {
          errored = true;
          if (callbacks.onError) callbacks.onError('speak-failed');
        }
      }
    });
    return true;
  }

  function speakText(text, speaker, callbacks) {
    return speakParts([{ text: String(text || ''), speaker: speaker || 'W' }], callbacks || {});
  }

  function speechUnavailableMessage() {
    return '当前浏览器没有可用的英语合成语音。可以改用文字稿继续，但这部分不计入听力正确率。';
  }

  function audioBadge() {
    return '<span class="badge badge-soft">合成语音 · 非真题录音</span>';
  }

  function navIcon(name) { return ICONS[name] || ''; }

  function appHeader(active) {
    const days = Store.examDaysLeft();
    const dayText = days === 0 ? '今天考试' : 'D-' + days;
    const nav = ['today', 'exam', 'train', 'errors', 'progress', 'settings'].map(function (tab) {
      return '<button type="button" class="top-nav-item ' + (active === tab ? 'active' : '') + '" data-nav="' + tab + '">' + TAB_LABELS[tab] + '</button>';
    }).join('');
    return '<header class="topbar">' +
      '<button type="button" class="brand" data-nav="today" aria-label="四级提分台首页">' +
        '<span class="brand-mark">C4</span>' +
        '<span class="brand-copy"><strong>四级提分台</strong><small>把认识变成会做</small></span>' +
      '</button>' +
      '<nav class="top-nav" aria-label="主导航">' + nav + '</nav>' +
      '<div class="topbar-right">' +
        
        '<button type="button" class="icon-button" data-nav="settings" aria-label="设置">' + navIcon('settings') + '</button>' +
      '</div>' +
    '</header>';
  }

  function bottomNav(active) {
    return '<nav class="bottom-nav" aria-label="移动端导航">' + ['today', 'exam', 'train', 'errors', 'progress', 'settings'].map(function (tab) {
      return '<button type="button" class="bottom-nav-item ' + (active === tab ? 'active' : '') + '" data-nav="' + tab + '">' +
        '<span class="bottom-icon">' + navIcon(tab) + '</span><span>' + TAB_LABELS[tab] + '</span></button>';
    }).join('') + '</nav>';
  }

  function pageShell(active, content) {
    return '<div class="app-shell">' + appHeader(active) + '<main class="page" id="main-content">' + content + '</main>' + bottomNav(active) + '</div>';
  }

  function sectionHeading(kicker, title, note) {
    return '<div class="section-heading"><div><span class="section-kicker">' + esc(kicker) + '</span><h2>' + esc(title) + '</h2></div>' + (note ? '<p>' + note + '</p>' : '') + '</div>';
  }

  function metricPill(label, value) {
    return '<span class="metric-pill"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></span>';
  }

  function radioOptions(name, options, config) {
    config = config || {};
    const selected = config.selected;
    const correct = config.correct;
    const user = config.user;
    const reveal = !!config.reveal;
    return '<div class="options" role="radiogroup">' + (options || []).map(function (option, index) {
      const isCorrect = reveal && index === correct;
      const isWrongPick = reveal && index === user && index !== correct;
      const cls = 'option' + (isCorrect ? ' is-correct' : '') + (isWrongPick ? ' is-wrong' : '');
      return '<label class="' + cls + '">' +
        '<input type="radio" name="' + esc(name) + '" value="' + index + '"' + (selected === index ? ' checked' : '') + (config.disabled || reveal ? ' disabled' : '') + '>' +
        '<span class="option-letter">' + optionLetters(index) + '</span>' +
        '<span class="option-text">' + esc(option) + '</span>' +
        (isCorrect ? '<span class="option-result">正确</span>' : (isWrongPick ? '<span class="option-result">你的选择</span>' : '')) +
      '</label>';
    }).join('') + '</div>';
  }

  function reasonChips(module, selected, errorId, options) {
    const group = (Data.REASON_GROUPS[module] || []).slice();
    if (options && options.extra && options.extra.length) {
      options.extra.forEach(function (key) { if (group.indexOf(key) === -1) group.push(key); });
    }
    return '<div class="reason-box"><div class="reason-title"><span>这道题为什么丢分？</span><small>可多选，之后能改</small></div><div class="reason-chips">' +
      group.map(function (key) {
        const reason = Data.REASONS[key];
        if (!reason) return '';
        const on = (selected || []).indexOf(key) !== -1;
        return '<button type="button" class="reason-chip' + (on ? ' selected' : '') + '" data-action="toggle-error-reason" data-error-id="' + esc(errorId) + '" data-reason="' + esc(key) + '" aria-pressed="' + on + '">' + esc(reason.label) + '</button>';
      }).join('') + '</div></div>';
  }

  function sourceDisclosure(text) {
    return '<p class="source-note">' + esc(text) + '</p>';
  }

  function emptyState(title, body, actionLabel, action) {
    return '<div class="empty-state"><div class="empty-mark">—</div><h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' + (actionLabel ? '<button type="button" class="btn btn-secondary" data-action="' + esc(action) + '">' + esc(actionLabel) + '</button>' : '') + '</div>';
  }

  function lastReasonHelp() {
    const reasons = Store.reasonStats();
    return reasons.length ? reasons[0] : null;
  }

  /* ============================== 首次使用 ============================== */
  function startOnboarding(step) {
    onboard = onboard || { step: 'form' };
    onboard.step = step || 'form';
    render();
    window.scrollTo(0, 0);
  }

  function onboardingFormHTML() {
    const p = Store.state.profile;
    const days = Math.max(1, Store.examDaysLeft() || 30);
    const weakOptions = [
      ['listening', '听力'],
      ['reading', '阅读'],
      ['writing', '写作'],
      ['translation', '翻译'],
      ['vocab', '词汇/语境'],
      ['speed', '做题速度']
    ];
    const pastOptions = [
      ['none', '没做过完整真题，只背过单词'],
      ['one', '做过 1–2 套，400 分以下'],
      ['few', '做过几套，约 400–500 分'],
      ['stable', '500 分以上或较稳定'],
      ['unsure', '说不清，以短测为准']
    ];
    return '<div class="onboarding-shell">' +
      '<div class="onboarding-top"><span class="brand-mark">C4</span><span class="onboarding-brand">四级提分台</span><span class="onboarding-meta">本机保存 · 无需账号</span></div>' +
      '<div class="onboarding-grid">' +
        '<section class="onboarding-hero">' +
          '<p class="eyebrow">30 天版本 · 先诊断，再安排</p>' +
          '<h1>把背过的词，<br><em>换成分数。</em></h1>' +
          '<p class="lead">你不是从零开始。问题更可能是：词在句子里认不出来、听不出同义替换、阅读找不到依据，或者写作翻译写不出完整句。先找出最漏分的一环，再每天做 40–60 分钟能完成的任务。</p>' +
          '<div class="flow-list">' +
            '<div><span>01</span><p><b>诊断薄弱点</b><br>9 道原创小题，只分配练习，不预测分数。</p></div>' +
            '<div><span>02</span><p><b>在题目里用出来</b><br>语境词、听力、阅读、写作、翻译都要求作答。</p></div>' +
            '<div><span>03</span><p><b>错因驱动复习</b><br>记录为什么错，当天与后续间隔回炉。</p></div>' +
          '</div>' +
          '<div class="onboarding-disclaimer"><strong>先说清楚</strong><p>' + esc(Data.DISCLAIMERS.materials) + ' ' + esc(Data.DISCLAIMERS.audio) + '</p></div>' +
        '</section>' +
        '<section class="intake-card">' +
          '<div class="intake-head"><span class="step-tag">首次使用</span><h2>先确认你的节奏</h2><p>这些参数会决定每天放几项任务，之后可以在设置里修改。</p></div>' +
          '<form id="onboarding-form" class="intake-form">' +
            '<label class="field"><span class="field-label">距离考试还有多少天？</span><span class="input-wrap"><input type="number" min="1" max="365" name="examDays" value="' + days + '" required><span class="input-suffix">天</span></span><small>按今天起算，之后可在设置里改考试日期。</small></label>' +
            '<label class="field"><span class="field-label">每天能稳定学习多少分钟？</span><span class="range-row"><input type="range" min="20" max="90" step="5" name="dailyMinutes" value="' + esc(p.dailyMinutes) + '" data-range="minutes"><output id="minutes-output">' + esc(p.dailyMinutes) + ' 分钟</output></span><small>建议 40–60 分钟。时间少时，任务会自动减量，不会堆课。</small></label>' +
            '<fieldset class="field"><legend class="field-label">你目前做四级真题的情况</legend><div class="choice-stack">' + pastOptions.map(function (item) {
              return '<label class="choice-line"><input type="radio" name="pastExam" value="' + item[0] + '"' + (p.pastExam === item[0] ? ' checked' : '') + '><span>' + esc(item[1]) + '</span></label>';
            }).join('') + '</div></fieldset>' +
            '<label class="field"><span class="field-label">这次的目标</span><select name="target">' + [425, 450, 500, 550, 600].map(function (n) {
              return '<option value="' + n + '"' + (Number(p.target) === n ? ' selected' : '') + '>' + n + '+</option>';
            }).join('') + '</select><small>目标只用于确定训练量，不承诺结果。</small></label>' +
            '<fieldset class="field"><legend class="field-label">凭感觉，哪部分最没把握？<span class="optional">可多选</span></legend><div class="chip-checks">' + weakOptions.map(function (item) {
              return '<label class="check-chip"><input type="checkbox" name="selfWeak" value="' + item[0] + '"' + ((p.selfWeak || []).indexOf(item[0]) !== -1 ? ' checked' : '') + '><span>' + esc(item[1]) + '</span></label>';
            }).join('') + '</div><small>没把握也没关系，短测会给出初步方向。</small></fieldset>' +
            '<button type="submit" class="btn btn-primary btn-block">保存并开始 9 题短测 ' + ICONS.arrow + '</button>' +
            '<p class="privacy-line">数据只保存在本机浏览器。短测约需 7–9 分钟。</p>' +
          '</form>' +
        '</section>' +
      '</div>' +
      '<footer class="onboarding-footer">' + esc(Data.DISCLAIMERS.score) + '</footer>' +
    '</div>';
  }

  function onboardingIntroHTML() {
    const p = Store.state.profile;
    return '<div class="onboarding-shell">' +
      '<div class="onboarding-top"><span class="brand-mark">C4</span><span class="onboarding-brand">四级提分台</span><span class="onboarding-meta">9 题初步诊断</span></div>' +
      '<div class="diagnostic-intro-card">' +
        '<p class="eyebrow">约 7–9 分钟 · 不计入练习正确率</p>' +
        '<h1>先看看是哪一环<br>在漏分。</h1>' +
        '<p class="lead">短测覆盖语境词义、长句结构、听力、阅读定位、写作句法和翻译表达。题量很小，只能用于安排先练哪几项，不能预测考试分数。</p>' +
        '<div class="diag-preview-grid">' +
          '<div><b>2</b><span>语境词义</span></div><div><b>1</b><span>长句结构</span></div><div><b>2</b><span>听力</span></div><div><b>2</b><span>阅读</span></div><div><b>1</b><span>写作句法</span></div><div><b>1</b><span>翻译</span></div>' +
        '</div>' +
        '<div class="notice-box"><strong>关于听力</strong><p>录音使用浏览器语音合成，是练习演示，不是真题录音。无法播放时可切换文字稿，但结果中的听力判断会标为不可靠。</p></div>' +
        '<div class="button-row"><button type="button" class="btn btn-primary btn-lg" data-action="diagnostic-start">开始短测 ' + ICONS.arrow + '</button><button type="button" class="btn btn-quiet" data-action="onboarding-edit">回去修改参数</button></div>' +
        '<button type="button" class="text-link-button" data-action="diagnostic-skip">这次先跳过短测，按保守计划开始</button>' +
        '<p class="privacy-line">你的考试日期：' + esc(p.examDate) + ' · 每天 ' + esc(p.dailyMinutes) + ' 分钟 · 目标 ' + esc(p.target) + '+</p>' +
      '</div>' +
      '<footer class="onboarding-footer">' + esc(Data.DISCLAIMERS.score) + '</footer>' +
    '</div>';
  }

  function diagnosticAudioHTML(q) {
    if (!q.audio) return '';
    if (onboard.audioFallback) {
      return '<div class="transcript-box"><div class="transcript-head"><strong>文字替代稿</strong><span class="badge badge-warn">本次不计入听力判断</span></div>' +
        Data.DIAGNOSTIC.listeningScript.map(function (line) {
          return '<p><b>' + esc(line.speaker) + ':</b> ' + esc(line.text) + '</p>';
        }).join('') + '</div>';
    }
    return '<div class="audio-panel"><div><span class="audio-label">' + audioBadge() + '</span><h3>听一段短对话</h3><p>对话和问题都会用合成语音读出，可重复播放。</p></div>' +
      '<div class="audio-actions"><button type="button" class="btn btn-secondary" data-action="diagnostic-audio">' + ICONS.play + ' 播放录音</button><button type="button" class="text-link-button" data-action="diagnostic-fallback">无法播放？用文字稿</button></div>' +
      '<p class="audio-status" id="diagnostic-audio-status" aria-live="polite"></p>' +
    '</div>';
  }

  function onboardingQuestionHTML() {
    const q = Data.DIAGNOSTIC.questions[onboard.index];
    if (!q) return '';
    const total = Data.DIAGNOSTIC.questions.length;
    return '<div class="onboarding-shell diagnostic-shell">' +
      '<div class="diagnostic-top"><button type="button" class="back-link" data-action="onboarding-edit">' + ICONS.back + ' 返回参数</button><span>短测 ' + (onboard.index + 1) + ' / ' + total + '</span></div>' +
      '<div class="diag-progress"><span style="width:' + Math.round((onboard.index / total) * 100) + '%"></span></div>' +
      '<main class="diagnostic-card">' +
        '<div class="diag-meta"><span class="eyebrow">初步诊断</span><span class="sample-tag">样本很小，只用于分配练习</span></div>' +
        (q.passage ? '<div class="mini-passage">' + q.passage.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' : '') +
        diagnosticAudioHTML(q) +
        '<h1 class="question-title">' + esc(q.stem) + '</h1>' +
        '<form id="diagnostic-form">' + radioOptions('answer', q.options, {}) +
          '<div class="diag-actions"><button type="submit" class="btn btn-primary">提交并继续 ' + ICONS.arrow + '</button><button type="submit" name="skip" value="1" class="text-link-button">不会，先跳过</button></div>' +
        '</form>' +
        '<p class="source-note">原创模拟小题，非真题。' + esc(Data.DISCLAIMERS.score) + '</p>' +
      '</main>' +
    '</div>';
  }

  function onboardingResultHTML() {
    const result = onboard.result;
    const order = ['listening', 'reading', 'vocab', 'syntax', 'writing', 'translation'];
    const rows = order.filter(function (m) { return result.moduleScores[m]; }).map(function (m) {
      const row = result.moduleScores[m];
      const ratio = row.total ? row.correct / row.total : 0;
      const isPriority = result.priorities.slice(0, 2).indexOf(m) !== -1;
      return '<div class="diag-result-row"><div><span class="diag-result-label">' + esc(Data.DIAGNOSTIC.skillLabels[m] || m) + '</span>' + (isPriority ? '<span class="priority-tag">优先练</span>' : '') + '</div><div class="mini-bar"><span style="width:' + Math.round(ratio * 100) + '%"></span></div><span class="diag-count">' + row.correct + '/' + row.total + '</span></div>';
    }).join('');
    const top = result.priorities.slice(0, 2).map(function (m) {
      return '<div class="focus-item"><span>' + esc(Data.DIAGNOSTIC.skillLabels[m] || m) + '</span><p>' + esc(Data.DIAGNOSTIC.help[m] || '') + '</p></div>';
    }).join('');
    return '<div class="onboarding-shell result-shell">' +
      '<div class="onboarding-top"><span class="brand-mark">C4</span><span class="onboarding-brand">四级提分台</span><span class="onboarding-meta">短测完成</span></div>' +
      '<div class="result-layout">' +
        '<section class="result-main">' +
          '<p class="eyebrow">初步画像 · 不是分数预测</p>' +
          '<h1>' + (result.priorities.length ? '先补最短的那块板。' : '先按保守顺序开始。') + '</h1>' +
          '<p class="lead">这 ' + Data.DIAGNOSTIC.questions.length + ' 道题只说明当前哪类任务更容易漏分。计划会在后续练习中按实际正确率和错因调整，不会用短测给你“预测分”。</p>' +
          '<div class="result-callout"><span>接下来优先</span>' + top + '</div>' +
          '<div class="diag-result-panel"><div class="panel-topline"><h2>短测表现</h2><span>样本量小</span></div>' + rows + '<div class="speed-row"><span>阅读节奏</span><b>' + esc(result.speed.label) + '</b></div>' +
            (onboard.audioFallback ? '<p class="inline-note warn">本次使用了文字稿替代合成语音，听力项不能作为可靠依据。</p>' : '') +
          '</div>' +
          '<div class="button-row"><button type="button" class="btn btn-primary btn-lg" data-action="onboarding-finish">生成今日计划 ' + ICONS.arrow + '</button><button type="button" class="btn btn-quiet" data-action="onboarding-edit">回去改参数</button></div>' +
          '<details class="review-details"><summary>查看短测答案与解释</summary><div class="review-details-body">' +
            Data.DIAGNOSTIC.questions.map(function (q, i) {
              const answer = result.answers[i];
              const chosen = answer && typeof answer.chosen === 'number' ? q.options[answer.chosen] : '未作答';
              return '<div class="diag-answer-row"><div class="diag-answer-head"><b>' + (i + 1) + '.</b><span>' + esc(q.stem) + '</span><span class="' + (answer && answer.correct ? 'text-good' : 'text-warn') + '">' + (answer && answer.correct ? '正确' : '错/跳过') + '</span></div><p>你的选择：' + esc(chosen) + '</p><p>正确答案：' + esc(q.options[q.answer]) + '</p><p class="explain">' + esc(q.explain) + '</p></div>';
            }).join('') +
          '</div></details>' +
          '<p class="source-note">' + esc(Data.DISCLAIMERS.score) + '</p>' +
        '</section>' +
        '<aside class="result-aside"><div class="aside-card"><h3>这次会怎么用</h3><ol class="why-list"><li><b>今天</b><p>先安排回炉与语境词，再练最弱的两类题，最后写一小段。</p></li><li><b>之后</b><p>每次错题记录原因；当天与后续几天按表现调整复习间隔。</p></li><li><b>不做什么</b><p>不展示打卡天数、浏览数量，也不给没有依据的预测分。</p></li></ol></div><div class="aside-card quiet"><h3>你的节奏</h3><p>距考试约 <b>' + esc(Store.examDaysLeft() || 30) + '</b> 天<br>每天 <b>' + esc(Store.state.profile.dailyMinutes) + '</b> 分钟<br>目标 <b>' + esc(Store.state.profile.target) + '+</b></p></div></aside>' +
      '</div>' +
    '</div>';
  }

  function renderOnboarding() {
    if (!onboard) onboard = { step: 'form' };
    if (onboard.step === 'form') root.innerHTML = onboardingFormHTML();
    else if (onboard.step === 'intro') root.innerHTML = onboardingIntroHTML();
    else if (onboard.step === 'test') root.innerHTML = onboardingQuestionHTML();
    else if (onboard.step === 'result') root.innerHTML = onboardingResultHTML();
    else root.innerHTML = onboardingFormHTML();
  }

  /* ============================== 首页 ============================== */
  function diagAsideHTML() {
    const diag = Store.state.profile.diagnostic;
    if (!diag) {
      return '<div class="aside-card"><div class="card-heading"><h3>你的自评</h3><span>没有短测</span></div>' +
        '<p class="aside-copy">你跳过了短测。当前计划只按自评和最保守顺序安排。以后可以补测。</p>' +
        '<div class="tag-wrap">' + (Store.state.profile.selfWeak || []).map(function (m) { return '<span class="badge">' + esc(MODULE_LABELS[m] || m) + '</span>'; }).join('') + '</div>' +
        '<button type="button" class="btn btn-quiet btn-block" data-action="retake-diagnostic">补做短测</button></div>';
    }
    const order = ['listening', 'reading', 'vocab', 'syntax', 'writing', 'translation'];
    const rows = order.filter(function (m) { return diag.moduleScores[m]; }).map(function (m) {
      const row = diag.moduleScores[m];
      const ratio = row.total ? row.correct / row.total : 0;
      const priority = (diag.priorities || []).slice(0, 2).indexOf(m) !== -1;
      return '<div class="diagnosis-row"><div class="diagnosis-label"><span>' + esc(Data.DIAGNOSTIC.skillLabels[m] || m) + '</span>' + (priority ? '<em>优先</em>' : '') + '</div><div class="mini-bar"><span style="width:' + Math.round(ratio * 100) + '%"></span></div><span class="diag-count">' + row.correct + '/' + row.total + '</span></div>';
    }).join('');
    return '<div class="aside-card"><div class="card-heading"><h3>短测画像</h3><span>仅 9 题</span></div>' + rows +
      '<p class="aside-note">只用于分配练习，不代表真实分数。样本小时，请以之后每道题的依据与错因为准。</p>' +
      '<div class="speed-line"><span>阅读节奏</span><b>' + esc(diag.speed.label) + '</b></div></div>';
  }

  function reviewAsideHTML(plan) {
    const rs = Store.reviewStats();
    const next = Store.state.reviewItems.slice().sort(function (a, b) { return a.dueAt - b.dueAt; })[0];
    return '<div class="aside-card review-aside"><div class="card-heading"><h3>错题回炉</h3><span>' + (rs.due ? '有到期' : '暂时清空') + '</span></div>' +
      '<div class="review-numbers"><div><b>' + rs.due + '</b><span>现在到期</span></div><div><b>' + rs.upcoming7 + '</b><span>7 天内</span></div></div>' +
      '<p class="aside-note">' + (rs.due ? '先重做原题，再换句/换篇检验。答案不会提前显示。' : '新错题会先排到约 10 分钟后，当天还有一次回炉机会。') + '</p>' +
      (next ? '<p class="next-due">下一次：' + esc(Store.formatDue(next.dueAt)) + '</p>' : '') +
      '<button type="button" class="btn btn-secondary btn-block" data-nav="errors">打开错题本</button></div>';
  }

  function whyPlanHTML(plan) {
    const primary = moduleLabel(plan.primaryModule);
    const secondary = primary === '听力' ? '阅读' : '听力';
    const out = plan.assignment && plan.assignment.outputKind === 'writing' ? '写作' : '翻译';
    return '<div class="aside-card why-card"><div class="card-heading"><h3>为什么这样排</h3><span>可解释</span></div><ol class="why-list">' +
      '<li><b>先回炉</b><p>' + (plan.dueCount ? '有 ' + plan.dueCount + ' 个到期项目，先处理更容易再次丢分的内容。' : '当前没有到期复习，先把新词放回句子里判断。') + '</p></li>' +
      '<li><b>主攻 ' + esc(primary) + '</b><p>短测和近期表现里更弱的一项给更长的时间；' + esc(secondary) + '保持手感。</p></li>' +
      '<li><b>每天一小段输出</b><p>今天安排' + esc(out) + '，先保证句子对，再谈“高级表达”。</p></li>' +
    '</ol></div>';
  }

  function taskRowHTML(task, index, nextId) {
    const done = !!task.done;
    const isNext = !done && task.id === nextId;
    const tagClass = task.type;
    return '<article class="task-row' + (done ? ' is-done' : '') + (isNext ? ' is-next' : '') + '">' +
      '<div class="task-number">' + String(index + 1).padStart(2, '0') + '</div>' +
      '<div class="task-body"><div class="task-topline"><span class="task-tag ' + esc(tagClass) + '">' + esc(task.tag) + '</span><span class="task-time">' + esc(task.minutes) + ' 分钟</span>' + (task.reviewCount ? '<span class="task-time">' + esc(task.reviewCount) + ' 个到期</span>' : '') + '</div>' +
        '<h3>' + esc(task.title) + '</h3><p>' + esc(task.desc) + '</p></div>' +
      '<div class="task-action">' + (done ? '<span class="done-mark">' + ICONS.check + ' 已完成</span>' : '<button type="button" class="btn btn-small ' + (isNext ? 'btn-primary' : 'btn-secondary') + '" data-action="start-task" data-task-id="' + esc(task.id) + '">' + (isNext ? '开始' : '打开') + '</button>') + '</div>' +
    '</article>';
  }

  function optionalRealPracticeHTML() {
    if (!window.CET4RealData) return '';
    const summary = realPracticeSummary();
    const watch = summary.watchItems || [];
    let label = '真题阅读短测 · 4 题 · 8 分钟';
    let action = '<button type="button" class="btn btn-secondary btn-small" data-action="start-real-diagnostic">做真题短测 ' + ICONS.arrow + '</button>';
    let copy = '先用已核对的 2024.06 阅读 C 篇判断从哪里丢分；提示、信心和用时都会记录。';
    if (watch.length) {
      const w = watch[0];
      const q = realQuestionById(w.questionId);
      if (q) {
        label = '待巩固 · 第 ' + q.number + ' 题 · 3 分钟';
        action = '<button type="button" class="btn btn-secondary btn-small" data-action="start-real-question" data-question-id="' + esc(q.id) + '">再做这道 ' + ICONS.arrow + '</button>';
        copy = '这题猜对/用了提示/做对但超时；独立做对后才会移出待巩固。';
      }
    } else if (summary.firstAttempts > 0) {
      label = '真题精练 · Passage One · 5 题';
      action = '<button type="button" class="btn btn-secondary btn-small" data-action="start-real-practice" data-set="real-p1" data-mode="practice">继续精练 ' + ICONS.arrow + '</button>';
      copy = '用另一篇真题继续练“依据 → 改写 → 干扰项”，不是重看解析。';
    }
    return '<div class="optional-real"><div class="optional-real-head"><span>有余力再做</span><em>可选，不计入最低完成量</em></div><div class="optional-real-body"><div><b>' + esc(label) + '</b><p>' + esc(copy) + '</p></div>' + action + '</div></div>';
  }

  function renderHome() {
    const plan = currentPlan();
    const today = new Date();
    const p = Store.state.profile;
    const completed = plan.doneCount;
    const totalTasks = plan.tasks.length;
    const progress = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
    const nextTask = plan.next;
    const dayNo = Store.dayIndex(isoToday()) + 1;
    const secondary = plan.primaryModule === 'listening' ? 'reading' : 'listening';
    const secondaryLabel = secondary === 'reading' ? '阅读' : '听力';
    const outputLabel = plan.assignment && plan.assignment.outputKind === 'writing' ? '写作' : '翻译';
    const doneAll = totalTasks > 0 && !nextTask;
    const reason = lastReasonHelp();
    const heroSub = doneAll
      ? '今天的计划已经完成。现在不需要再刷更多课；有到期复习就回炉，没有就休息。'
      : (plan.dueCount ? '先处理 ' + plan.dueCount + ' 个到期复习，再主攻' + moduleLabel(plan.primaryModule) + '，保持' + secondaryLabel + '手感，最后做一小段' + outputLabel + '。'
        : '今天没有到期复习。先把词放回句子，再主攻' + moduleLabel(plan.primaryModule) + '，保持' + secondaryLabel + '手感，最后做一小段' + outputLabel + '。');
    const taskList = plan.tasks.length ? plan.tasks.map(function (task, i) { return taskRowHTML(task, i, nextTask ? nextTask.id : ''); }).join('') : emptyState('今天没有可排的任务', '先检查材料是否已导入，或到设置里调整每日时间。', '', '');
    const doneNote = doneAll
      ? '<div class="finish-banner">' + ICONS.check + '<div><b>今日计划完成</b><p>' + (plan.dueCount ? '还有新的到期复习，别把它们留到明天。' : '不以打卡天数计效果；下一组任务会在明天按错因重排。') + '</p></div></div>'
      : '';
    const aside = '<aside class="dashboard-aside">' + diagAsideHTML() + trueExamAsideHTML() + reviewAsideHTML(plan) + whyPlanHTML(plan) + '</aside>';
    const content = '<div class="page-wrap home-page">' +
      '<section class="hero">' +
        '<div class="hero-copy"><p class="eyebrow">' + esc(Store.formatDateCN(today) + ' · ' + Store.formatWeekday(today) + ' · 第 ' + dayNo + ' 天') + '</p>' +
          '<h1>今天，只做能<br><em>换成分数</em>的练习。</h1>' +
          '<p class="lead">' + esc(heroSub) + '</p>' +
          '<div class="hero-chips">' + metricPill('预算', p.dailyMinutes + ' 分钟') + metricPill('已完成', completed + ' / ' + totalTasks) + metricPill('目标', p.target + '+') + '</div>' +
          '<div class="hero-actions">' + (nextTask
            ? '<button type="button" class="btn btn-primary btn-lg" data-action="start-task" data-task-id="' + esc(nextTask.id) + '">开始下一项 · ' + esc(nextTask.minutes) + ' 分钟 ' + ICONS.arrow + '</button>'
            : '<button type="button" class="btn btn-primary btn-lg" data-nav="train">去训练库加练一组 ' + ICONS.arrow + '</button>') +
            '<span class="hero-left">' + (plan.remainingMinutes ? '剩余约 ' + plan.remainingMinutes + ' 分钟 · 任务少而明确' : '今天的任务已完成') + '</span></div>' +
          '<div class="plan-progress"><div><span style="width:' + progress + '%"></span></div><small>' + completed + '/' + totalTasks + ' 项</small></div>' +
        '</div>' +
        '<div class="hero-side"><div class="countdown-block"><span class="countdown-label">距四级考试</span><strong>' + (Store.examDaysLeft() === 0 ? '今天' : Store.examDaysLeft()) + '</strong><span class="countdown-unit">' + (Store.examDaysLeft() === 0 ? '沉着应考' : '天') + '</span><p>不预测分数<br>只安排今天</p></div>' +
          '<div class="hero-side-note"><span>' + esc(reason ? '最近最常见错因：' + reason.label : '今天先建立可执行的节奏') + '</span><p>' + esc(reason ? reason.help : '完成后记录为什么错，系统会据此安排下一次回炉。') + '</p></div>' +
        '</div>' +
      '</section>' +
      '<div class="dashboard-grid"><section class="panel today-panel">' +
        '<div class="panel-topline"><div><span class="section-kicker">今日清单</span><h2>今天做什么</h2></div><div class="panel-meta"><b>约 ' + plan.totalMinutes + ' 分钟</b><span>' + totalTasks + ' 项</span></div></div>' +
        '<p class="plan-intro">按顺序做就行。时间不够时，至少完成“回炉”和主攻项。</p>' +
        doneNote + '<div class="task-list">' + taskList + '</div>' + optionalRealPracticeHTML() +
        (doneAll && plan.dueCount ? '<button type="button" class="btn btn-secondary btn-block" data-nav="errors">处理 ' + plan.dueCount + ' 个到期复习</button>' : '') +
        '<p class="source-note">任务量依据：每日 ' + esc(p.dailyMinutes) + ' 分钟、距考试 ' + Store.examDaysLeft() + ' 天、当前错因与复习到期情况。' + esc(Data.DISCLAIMERS.score) + '</p>' +
      '</section>' + aside + '</div>' +
      '<section class="bottom-note-grid"><div class="info-strip"><span class="info-mark">!</span><div><b>训练题是方法示例，不是真题</b><p>这里的语境词与训练题是原创模拟；真题在顶部「真题」入口：2024.06 原卷、真实 MP3、第三方答案。</p></div></div><div class="info-strip"><span class="info-mark">A</span><div><b>训练听力和真题听力分开</b><p>训练库使用浏览器合成语音；真题页使用本地真实录音，不把两者混在一起。</p></div></div></section>' +
      '<footer class="page-footer"><span>四级提分台 · 本地版</span><span>' + esc(Data.DISCLAIMERS.privacy) + '</span></footer>' +
    '</div>';
    root.innerHTML = pageShell('today', content);
  }

  /* ============================== 训练库 ============================== */
  function renderTraining() {
    const plan = currentPlan();
    const due = Store.dueReviewViews().length;
    const counts = Store.getContentCounts();
    const customCount = (Store.state.customMaterials.vocabulary.length || 0) + (Store.state.customMaterials.listeningSets.length || 0) + (Store.state.customMaterials.readingSets.length || 0);
    const libraryCards = [
      { key: 'vocab', kicker: '语境词', title: '把词放回句子', desc: '每个词先判断句中的意思，再看搭配、容易混淆的义项和同义替换。', meta: counts.vocabulary + ' 个词卡' },
      { key: 'listening', kicker: '听力', title: '先预读，再听依据', desc: '预读选项，听合成录音；提交后才显示原文、答案依据和错句重听。', meta: '2 组原创示例' },
      { key: 'reading', kicker: '阅读', title: '先点依据，再选答案', desc: '在原文点出一句依据，逐项看正确选项如何改写、干扰项错在哪。', meta: counts.reading + ' 篇原创模拟' },
      { key: 'timed-reading', kicker: '限时检验', title: '8 分钟阅读检验', desc: '整组完成后才看解析。检验定位与速度，不把练习正确率当分数。', meta: '限时 8 分钟' },
      { key: 'writing', kicker: '写作', title: '先写对句子，再连成段', desc: '给结构、例句和可替换表达；本地检查语法、拼写、要点和清晰度。', meta: counts.writing + ' 道微练习' },
      { key: 'translation', kicker: '翻译', title: '先找主干，再补修饰', desc: '按句意群检查遗漏和基础语法；参考译文不止一种。', meta: counts.translation + ' 段原创材料' }
    ];
    const content = '<div class="page-wrap">' +
      '<div class="page-heading-row"><div><p class="eyebrow">按需要加练，不影响今日计划</p><h1>训练库</h1><p class="lead">这里不是课程列表。每个入口都是一次可作答的训练；做完仍会记录用时、错因和复习安排。</p></div><div class="page-heading-aside"><span class="count-bubble">' + counts.vocabulary + '</span><p>语境词条<br>（含导入）</p></div></div>' +
      trueExamBannerHTML() +
      (due ? '<div class="due-strip"><div><span class="pulse-dot"></span><b>' + due + ' 个到期复习</b><p>先把会反复丢分的旧问题处理掉，再加练。</p></div><button type="button" class="btn btn-secondary" data-action="start-due-review">开始回炉</button></div>' : '') +
      '<div class="library-grid">' + libraryCards.map(function (card) {
        return '<article class="library-card"><div class="library-top"><span class="library-kicker">' + esc(card.kicker) + '</span><span class="library-meta">' + esc(card.meta) + '</span></div><h2>' + esc(card.title) + '</h2><p>' + esc(card.desc) + '</p><div class="library-footer"><button type="button" class="btn btn-secondary btn-small" data-action="start-library" data-library="' + esc(card.key) + '">开始 ' + ICONS.arrow + '</button><span>即时反馈 · 本地保存</span></div></article>';
      }).join('') + '</div>' +
      '<section class="notice-panel"><div><span class="section-kicker">材料与评分</span><h2>训练示例和真题，不混着说</h2></div><div class="notice-columns"><div><b>训练题是模拟</b><p>' + esc(Data.DISCLAIMERS.mock) + ' 这里的句子和题目用于练方法，不是真题。</p></div><div><b>真题单独接入</b><p>「真题」页使用本机 2024.06 第1套原卷、真实 MP3 和第三方答案；答案非官方。写作/翻译仍只做参考自评。</p></div><div><b>可以自己导入</b><p>支持导入词汇、听力文字稿、阅读文本 JSON。合成语音仍由浏览器朗读；不支持导入音频文件或官方评分服务。' + (customCount ? '<br><b>已导入 ' + customCount + ' 份自定义材料。</b>' : '') + '</p><button type="button" class="text-link-button" data-nav="settings">去设置导入材料 ' + ICONS.arrow + '</button></div></div></section>' +
      '<footer class="page-footer"><span>加练不会覆盖今日任务。</span><span>' + esc(Data.DISCLAIMERS.grading) + '</span></footer>' +
    '</div>';
    root.innerHTML = pageShell('train', content);
  }

  /* ============================== 错题本 ============================== */
  function errorStatusClass(tone) {
    return tone === 'good' ? 'status-good' : tone === 'warn' ? 'status-warn' : tone === 'mid' ? 'status-mid' : 'status-muted';
  }

  function errorTriStageHTML(error) {
    if (!error) return '';
    const item = Store.getReviewItemForKey(error.reviewKey);
    const understood = !!error.evidenceAcknowledgedAt;
    const transfer = !!error.transferPassedAt;
    const delayed = !!error.delayedPassedAt;
    const dot = function (on, label) { return '<span class="tri-dot' + (on ? ' is-on' : '') + '"><i></i>' + label + '</span>'; };
    return '<div class="error-tri" title="三个阶段独立记录；失败不清空已完成的阶段">' + dot(understood, '理解依据') + dot(transfer, '陌生题做对') + dot(delayed, '隔几天仍对') + (item && item.failCount ? '<em>失败保留已有点</em>' : '') + '</div>';
  }

  function errorCardHTML(error) {
    const item = Store.getReviewItemForKey(error.reviewKey);
    const status = Store.errorStatus(error);
    const due = item && item.dueAt <= Date.now();
    const reasons = (error.reasons || []).map(function (key) { return Data.REASONS[key] ? Data.REASONS[key].label : key; });
    const title = error.module === 'vocab' ? (error.question.word || '语境词') : (error.question.setTitle || error.question.stem || '错题');
    const stem = error.question.stem || '';
    return '<article class="error-card">' +
      '<div class="error-topline"><div><span class="badge badge-outline">' + esc(moduleLabel(error.module)) + '</span>' + (error.wrongCount > 1 ? '<span class="badge badge-warn">重复错 ' + error.wrongCount + ' 次</span>' : '') + '<span class="' + errorStatusClass(status.tone) + '">' + esc(status.label) + '</span></div><span class="error-date">' + esc(Store.formatDateCN(error.lastWrongAt)) + '</span></div>' +
      '<h3>' + esc(title) + '</h3>' + (title !== stem ? '<p class="error-stem">' + esc(stem) + '</p>' : '') +
      '<div class="error-reasons"><span>上次归因</span>' + (reasons.length ? reasons.map(function (r) { return '<em>' + esc(r) + '</em>'; }).join('') : '<em>待补充</em>') + '</div>' +
      errorTriStageHTML(error) +
      '<div class="error-actions"><button type="button" class="btn btn-secondary btn-small" data-action="review-error" data-error-id="' + esc(error.id) + '">' + (due ? '现在复习' : '提前复习') + '</button><details class="edit-reasons"><summary>修改错误分类</summary><div class="edit-reasons-body">' + reasonChips(error.module, error.reasons || [], error.id) + '</div></details></div>' +
      '<p class="source-note">' + esc(error.question.sourceLabel || Data.DISCLAIMERS.mock) + '</p>' +
    '</article>';
  }

  function renderErrors() {
    const allErrors = Store.state.errors.slice().filter(function (e) { return !e.archived && e.question && e.question.isReal; });
    const dueViews = Store.dueReviewViews().filter(function (v) { return v.error && v.error.question && v.error.question.isReal; });
    const rs = Store.reviewStats();
    const filter = view.errorFilter || 'all';
    const filtered = allErrors.filter(function (error) {
      if (filter === 'due') {
        const item = Store.getReviewItemForKey(error.reviewKey);
        return item && item.dueAt <= Date.now();
      }
      if (filter === 'repeat') return (error.wrongCount || 1) >= 2;
      return true;
    }).sort(function (a, b) {
      const ai = Store.getReviewItemForKey(a.reviewKey);
      const bi = Store.getReviewItemForKey(b.reviewKey);
      const ad = ai && ai.dueAt <= Date.now() ? 0 : 1;
      const bd = bi && bi.dueAt <= Date.now() ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return new Date(b.lastWrongAt).getTime() - new Date(a.lastWrongAt).getTime();
    });
    const content = '<div class="page-wrap">' +
      '<div class="page-heading-row"><div><p class="eyebrow">先重做，再看答案</p><h1>错题本</h1><p class="lead">每一道客观错题都保留原题、错因和复习间隔。复习不是“看一遍解析”，而是重新作答，再用新句子/新篇目检验。写作和翻译没有自动判分，不伪装成客观错题；它们的检查与自评保存在进度里。</p></div><div class="error-summary-bubble"><b>' + rs.due + '</b><span>现在到期</span></div></div>' +
      '<div class="stat-strip"><div><b>' + allErrors.length + '</b><span>错题记录</span></div><div><b>' + rs.upcoming7 + '</b><span>7 天内复习</span></div><div><b>' + (rs.passRate === null ? '—' : percent(rs.passRate)) + '</b><span>最近复习通过占比</span></div><div><b>' + rs.mastered + '</b><span>通过两次以上</span></div></div>' +
      (dueViews.length ? '<div class="due-strip"><div><span class="pulse-dot"></span><b>有 ' + dueViews.length + ' 个到期项目</b><p>建议先做本批；每次最多显示 3 个，防止回炉变成拉长战线。</p></div><button type="button" class="btn btn-primary" data-action="start-due-review">复习本批 ' + ICONS.arrow + '</button></div>' : '') +
      '<div class="filter-row"><div class="segmented">' + [['all', '全部'], ['due', '待复习'], ['repeat', '重复错']].map(function (pair) {
        return '<button type="button" class="' + (filter === pair[0] ? 'active' : '') + '" data-action="filter-errors" data-filter="' + pair[0] + '">' + pair[1] + '</button>';
      }).join('') + '</div><span class="filter-note">答案和解析只在开始复习后显示。</span></div>' +
      '<div class="error-list">' + (filtered.length ? filtered.map(errorCardHTML).join('') : emptyState(filter === 'due' ? '暂时没有到期复习' : '还没有错题记录', filter === 'due' ? '新的错题会先安排约 10 分钟后的当天回炉，再按表现延长间隔。' : '完成任意听力、阅读或语境词任务后，答错的题会自动进入这里。', '去训练', 'go-training')) + '</div>' +
      '<section class="notice-panel compact"><div><span class="section-kicker">复习规则</span><h2>间隔会跟着表现变</h2></div><div class="notice-columns three"><div><b>当天</b><p>新错题约 10 分钟后可回炉；先重做原题，再用新语境检验。</p></div><div><b>后续</b><p>一次通过后，间隔逐步拉长到约 1、3、7、14、30 天；失败回到更短间隔。</p></div><div><b>可修改</b><p>错误分类可随时改；统计展示最近一次复习是否通过，而不是打卡次数。</p></div></div></section>' +
      '<footer class="page-footer"><span>当前共 ' + allErrors.length + ' 条记录 · 到期 ' + dueViews.length + ' 条</span><span>' + esc(Data.DISCLAIMERS.grading) + '</span></footer>' +
    '</div>';
    root.innerHTML = pageShell('errors', content);
  }

  /* ============================== 进度 ============================== */
  function moduleProgressCard(module, stats) {
    const label = module === 'vocab' ? '语境词' : module === 'listening' ? '听力' : '阅读';
    if (!stats || !stats.attempts) {
      return '<article class="progress-card"><div class="progress-card-top"><span>' + label + '</span><span class="status-muted">暂无记录</span></div><p class="progress-empty">完成一组' + label + '后显示正确率、用时和错误重复情况。</p></article>';
    }
    const accuracy = stats.accuracy === null ? '—' : percent(stats.accuracy);
    return '<article class="progress-card"><div class="progress-card-top"><span>' + label + '</span><span class="sample-count">' + stats.attempts + ' 题</span></div><div class="big-metric">' + accuracy + '</div><p class="metric-caption">练习正确率 · 平均 ' + formatSecondsShort(stats.avgSeconds) + '/题</p><div class="mini-bar"><span style="width:' + Math.round((stats.accuracy || 0) * 100) + '%"></span></div>' +
      (stats.trend ? '<p class="trend-note">前后半段对比：' + (stats.trend.diff >= 0 ? '近期高 ' + Math.round(stats.trend.diff * 100) + ' 个百分点' : '近期低 ' + Math.round(Math.abs(stats.trend.diff) * 100) + ' 个百分点') + '（样本 ' + stats.trend.sample + '，仅练习记录）</p>' : '<p class="trend-note">至少 8 次练习后才显示趋势，避免用一两次波动下结论。</p>') +
    '</article>';
  }

  function renderProgress() {
    const stats = Store.moduleStats();
    const rs = Store.reviewStats();
    const outputs = Store.outputStats();
    const reasons = Store.reasonStats();
    const repeats = Store.repeatErrors();
    const diag = Store.state.profile.diagnostic;
    const topReasons = reasons.slice(0, 5);
    const reasonMax = topReasons.length ? topReasons[0].count : 1;
    const nextHint = (function () {
      if (repeats.length) return '先回炉重复错误：' + (repeats[0].question.setTitle || repeats[0].question.stem || '同一道题') + '，它已经错了 ' + repeats[0].wrongCount + ' 次。';
      if (topReasons.length) return '最近最常见错因是“' + topReasons[0].label + '”。' + (Data.REASONS[topReasons[0].key] ? Data.REASONS[topReasons[0].key].help : '');
      if (rs.due) return '现在有 ' + rs.due + ' 个到期复习，先回炉再刷新题。';
      return '继续完成今天的任务即可。只有真实练习记录才会进入这里。';
    })();
    const diagRows = diag ? ['listening', 'reading', 'vocab', 'syntax', 'writing', 'translation'].filter(function (m) { return diag.moduleScores[m]; }).map(function (m) {
      const row = diag.moduleScores[m];
      return '<div class="diag-result-row"><div><span class="diag-result-label">' + esc(Data.DIAGNOSTIC.skillLabels[m] || m) + '</span></div><div class="mini-bar"><span style="width:' + Math.round((row.correct / Math.max(1, row.total)) * 100) + '%"></span></div><span class="diag-count">' + row.correct + '/' + row.total + '</span></div>';
    }).join('') : '<p class="aside-note">当前没有短测记录。短测只用于分配训练，不预测分数。</p>';
    const content = '<div class="page-wrap">' +
      '<div class="page-heading-row"><div><p class="eyebrow">只看真实练习记录</p><h1>进步指标</h1><p class="lead">这里不展示打卡天数或浏览数量，也不给没有依据的预测分。下列数据只回答：正确率是否变化、时间花在哪、哪些错误在重复、复习后是否通过。</p></div><button type="button" class="btn btn-secondary" data-action="export-progress">导出进度</button></div>' +
      '<div class="progress-grid">' + moduleProgressCard('vocab', stats.vocab) + moduleProgressCard('listening', stats.listening) + moduleProgressCard('reading', stats.reading) + '</div>' +
      '<section class="panel true-progress-panel"><div class="panel-topline"><div><span class="section-kicker">真题模考</span><h2>真实套题记录</h2></div><button type="button" class="btn btn-secondary btn-small" data-nav="exam">进入真题</button></div>' + trueExamHistoryHTML(Store.state.trueExamRecords || []) + '<p class="aside-note">真题正确题数单独记录，不混进训练示例的正确率，也不预测官方分数。</p></section>' +
      '<div class="dashboard-grid progress-lower"><section class="panel"><div class="panel-topline"><div><span class="section-kicker">复习结果</span><h2>回炉之后，是否真的会了</h2></div></div>' +
        '<div class="stat-strip flat"><div><b>' + (rs.passRate === null ? '—' : percent(rs.passRate)) + '</b><span>最近复习通过占比</span></div><div><b>' + rs.attempted + '</b><span>已复习项目</span></div><div><b>' + rs.mastered + '</b><span>通过至少 2 次</span></div><div><b>' + rs.due + '</b><span>当前到期</span></div></div>' +
        '<p class="aside-note">“通过”指原题重做正确，且换句/换篇检验正确。样本少时不要过度解读比率。</p>' +
        '<div class="output-stat-row"><div><b>' + outputs.writing + '</b><span>写作完成次数</span></div><div><b>' + outputs.translation + '</b><span>翻译完成次数</span></div><div><b>' + outputs.needsWork + '</b><span>自评需重练</span></div></div>' +
      '</section><aside class="dashboard-aside"><div class="aside-card"><div class="card-heading"><h3>下一步</h3><span>根据记录</span></div><p class="next-step-copy">' + esc(nextHint) + '</p><button type="button" class="btn btn-secondary btn-block" data-action="go-errors">打开错题本</button></div><div class="aside-card"><div class="card-heading"><h3>当前复习</h3><span>间隔调整</span></div><div class="review-numbers"><div><b>' + rs.due + '</b><span>到期</span></div><div><b>' + rs.upcoming7 + '</b><span>7 天内</span></div></div><p class="aside-note">每次通过后间隔拉长；失败则缩短。只按实际作答结果更新。</p></div></aside></div>' +
      '<div class="progress-panels"><section class="panel"><div class="panel-topline"><div><span class="section-kicker">错因结构</span><h2>时间应该花在哪</h2></div><span class="panel-meta">' + reasons.reduce(function (n, r) { return n + r.count; }, 0) + ' 次归因</span></div>' +
        (topReasons.length ? '<div class="reason-bars">' + topReasons.map(function (r) {
          return '<div class="reason-bar-row"><span>' + esc(r.label) + '</span><div class="bar-track"><i style="width:' + Math.round((r.count / reasonMax) * 100) + '%"></i></div><b>' + r.count + '</b></div>';
        }).join('') + '</div>' : '<p class="aside-note">完成并记录错题后，这里会显示错因分布。</p>') +
      '</section><section class="panel"><div class="panel-topline"><div><span class="section-kicker">重复错误</span><h2>哪些题反复丢分</h2></div><span class="panel-meta">' + repeats.length + ' 条</span></div>' +
        (repeats.length ? '<div class="repeat-list">' + repeats.slice(0, 5).map(function (e) {
          return '<button type="button" class="repeat-item" data-action="review-error" data-error-id="' + esc(e.id) + '"><span>' + esc(e.question.setTitle || e.question.stem || '同一道题') + '</span><b>×' + esc(e.wrongCount) + '</b></button>';
        }).join('') + '</div>' : '<p class="aside-note">还没有同一道题错两次的记录。样本会随着练习增加。</p>') +
      '</section></div>' +
      '<section class="diag-progress-panel"><div class="panel-topline"><div><span class="section-kicker">起点参考</span><h2>短测不是分数</h2></div><span class="panel-meta">' + (diag ? '9 题' : '未测') + '</span></div>' + diagRows + (diag ? '<p class="aside-note">短测只用于初次分配练习；进步看这里的真实练习与复习记录。</p>' : '') + '</section>' +
      '<footer class="page-footer"><span>' + esc(Data.DISCLAIMERS.score) + '</span><span>' + esc(Data.DISCLAIMERS.grading) + '</span></footer>' +
    '</div>';
    root.innerHTML = pageShell('progress', content);
  }

  /* ============================== 设置 ============================== */
  function renderRealProgress() {
    const banks = window.CET4ReadingBanks || [];
    const rt = realTrainingState();
    const first = (rt.attempts || []).filter(function (a) { return a.isFirst; });
    const firstCorrect = first.filter(function (a) { return a.correct; }).length;
    const realErrors = (Store.state.errors || []).filter(function (e) { return e.question && e.question.isReal && !e.archived; });
    const savedWords = Object.keys(rt.vocab || {}).length;
    const attempted = new Set((rt.attempts || []).map(function (a) { return a.questionId; })).size;
    const bankRows = banks.map(function (bank) {
      const st = readingBankStats(bank);
      return '<div class="real-bank-progress"><div><b>' + esc(bank.shortTitle) + '</b><span>' + esc(bank.source) + '</span></div><strong>' + st.attempted + ' / ' + st.total + '</strong><em>首次正确 ' + (st.firstAttempts ? st.firstCorrect + ' / ' + st.firstAttempts : '—') + ' · 错题 ' + st.firstWrong + '</em></div>';
    }).join('');
    const next = first.length < 5
      ? '证据不足：目前只有 ' + first.length + ' 道首次作答。先做完整一组，不凭一两题下“薄弱”结论。'
      : (realErrors.length ? '先处理已确认错因的真题错题：' + realErrors.length + ' 道。去错题本看原题和同类补练记录。' : '暂时没有真题错题。继续做未做过的题组，扩大证据。');
    const content = '<div class="page-wrap"><div class="page-heading-row"><div><p class="eyebrow">只看真题 · 不用原创数据</p><h1>真题进度</h1><p class="lead">这里只统计两组仔细阅读真题和在线套卷记录；原创短测、模拟阅读和合成听力不计入。样本少于 5 道时明确显示证据不足。</p></div><button type="button" class="btn btn-secondary" data-action="export-progress">导出进度</button></div>' +
      '<div class="stat-strip"><div><b>' + attempted + ' / ' + banks.reduce(function (n, b) { return n + (b.questions || []).length; }, 0) + '</b><span>已做真题</span></div><div><b>' + (first.length ? Math.round(firstCorrect / first.length * 100) + '%' : '—') + '</b><span>首次正确率（' + first.length + ' 道样本）</span></div><div><b>' + realErrors.length + '</b><span>真题错题</span></div><div><b>' + savedWords + '</b><span>真题词本</span></div></div>' +
      '<section class="panel"><div class="panel-topline"><div><span class="section-kicker">两组仔细阅读</span><h2>逐题进度</h2></div><span class="panel-meta">已整理逐题题库</span></div><div class="real-bank-progress-list">' + bankRows + '</div></section>' +
      '<section class="panel"><div class="panel-topline"><div><span class="section-kicker">听力整卷</span><h2>已提交的听力</h2></div><span class="panel-meta">' + ((rt.listeningAttempts || []).length) + ' 次</span></div>' + ((rt.listeningAttempts || []).length ? '<div class="real-bank-progress-list">' + rt.listeningAttempts.slice(-5).reverse().map(function (x) { return '<div class="real-bank-progress"><div><b>' + esc(x.title || '听力') + '</b><span>' + esc(x.mode === 'check' ? '检验模式' : '练习模式') + ' · ' + esc(new Date(x.at).toLocaleString('zh-CN')) + '</span></div><strong>' + x.correct + ' / ' + x.total + '</strong><em>选项作答 · 原文待补</em></div>'; }).join('') + '</div>' : '<p class="aside-note">还没有提交过听力。</p>') + '</section>' +
      '<section class="panel"><div class="panel-topline"><div><span class="section-kicker">选词 / 写作翻译</span><h2>输出练习记录</h2></div><span class="panel-meta">' + ((rt.fillAttempts || []).length + (rt.outputAttempts || []).length) + ' 次</span></div>' + (((rt.fillAttempts || []).length + (rt.outputAttempts || []).length) ? '<div class="real-bank-progress-list">' + (rt.fillAttempts || []).slice(-3).reverse().map(function (x) { return '<div class="real-bank-progress"><div><b>' + esc(x.title) + '</b><span>选词填空 · ' + esc(new Date(x.at).toLocaleString('zh-CN')) + '</span></div><strong>' + x.correct + ' / ' + x.total + '</strong><em>答案核对</em></div>'; }).join('') + (rt.outputAttempts || []).slice(-3).reverse().map(function (x) { return '<div class="real-bank-progress"><div><b>' + esc(x.title) + '</b><span>' + (x.kind === 'writing' ? '写作' : '翻译') + ' · ' + esc(new Date(x.at).toLocaleString('zh-CN')) + '</span></div><strong>' + (x.kind === 'writing' ? x.words + ' 词' : x.chars + ' 字') + '</strong><em>已保存 · 无分数</em></div>'; }).join('') + '</div>' : '<p class="aside-note">还没有选词填空或写作/翻译记录。</p>') + '</section>' +
      '<section class="panel true-progress-panel"><div class="panel-topline"><div><span class="section-kicker">整套真题</span><h2>套卷记录</h2></div><button type="button" class="btn btn-secondary btn-small" data-nav="exam">进入真题库</button></div>' + trueExamHistoryHTML(Store.state.trueExamRecords || []) + '</section>' +
      '<section class="panel"><div class="panel-topline"><div><span class="section-kicker">真题错题</span><h2>按你的确认错因</h2></div><span class="panel-meta">' + realErrors.length + ' 道</span></div>' + (realErrors.length ? '<div class="repeat-list">' + realErrors.slice(-6).reverse().map(function (e) {
        return '<button type="button" class="repeat-item" data-action="review-error" data-error-id="' + esc(e.id) + '"><span>' + esc(e.question.setTitle || '真题') + '</span><b>' + esc((e.reasons || []).length + ' 个错因') + '</b></button>';
      }).join('') + '</div>' : '<p class="aside-note">还没有真题错题。</p>') + '</section>' +
      '<p class="source-note">' + esc(next) + ' 已做/正确率来自本机真题作答；答案第三方，非官方；不换算 710。</p></div>';
    root.innerHTML = pageShell('progress', content);
  }

  function renderSettings() {
    const p = Store.state.profile;
    const counts = Store.getContentCounts();
    const custom = Store.state.customMaterials;
    const customCount = custom.vocabulary.length + custom.listeningSets.length + custom.readingSets.length;
    const weakOptions = [['listening', '听力'], ['reading', '阅读'], ['writing', '写作'], ['translation', '翻译'], ['vocab', '词汇/语境'], ['speed', '速度']];
    const content = '<div class="page-wrap settings-page">' +
      '<div class="page-heading-row"><div><p class="eyebrow">本地应用 · 无需账号</p><h1>设置</h1><p class="lead">调整节奏、导出或导入学习数据。刷新或重启后仍会保留，但清理浏览器数据会丢失，建议定期备份。</p></div></div>' +
      '<div class="settings-grid"><section class="panel"><div class="panel-topline"><div><span class="section-kicker">训练参数</span><h2>你的节奏</h2></div></div>' +
        '<form id="profile-form" class="settings-form">' +
          '<label class="field"><span class="field-label">考试日期</span><input type="date" name="examDate" value="' + esc(p.examDate) + '" required><small>当前距考试 ' + Store.examDaysLeft() + ' 天。倒计时只用于安排训练，不代表准备程度。</small></label>' +
          '<label class="field"><span class="field-label">每天学习分钟数</span><span class="range-row"><input type="range" min="20" max="90" step="5" name="dailyMinutes" value="' + esc(p.dailyMinutes) + '" data-range="minutes-settings"><output id="minutes-output-settings">' + esc(p.dailyMinutes) + ' 分钟</output></span><small>改小后，系统会优先保留回炉、主攻和输出任务。</small></label>' +
          '<label class="field"><span class="field-label">目标分数</span><select name="target">' + [425, 450, 500, 550, 600].map(function (n) { return '<option value="' + n + '"' + (Number(p.target) === n ? ' selected' : '') + '>' + n + '+</option>'; }).join('') + '</select><small>不提供预测或保分承诺。</small></label>' +
          '<fieldset class="field"><legend class="field-label">自评薄弱项</legend><div class="chip-checks">' + weakOptions.map(function (item) {
            return '<label class="check-chip"><input type="checkbox" name="selfWeak" value="' + item[0] + '"' + ((p.selfWeak || []).indexOf(item[0]) !== -1 ? ' checked' : '') + '><span>' + item[1] + '</span></label>';
          }).join('') + '</div></fieldset>' +
          '<button type="submit" class="btn btn-primary">保存设置</button>' +
        '</form>' +
      '</section>' +
      '<aside class="dashboard-aside"><div class="aside-card"><div class="card-heading"><h3>当前材料</h3><span>本地</span></div><dl class="mini-dl"><div><dt>语境词</dt><dd>' + counts.vocabulary + '</dd></div><div><dt>听力组</dt><dd>' + counts.listening + '</dd></div><div><dt>阅读篇</dt><dd>' + counts.reading + '</dd></div><div><dt>写作</dt><dd>' + counts.writing + '</dd></div><div><dt>翻译</dt><dd>' + counts.translation + '</dd></div><div><dt>自定义</dt><dd>' + customCount + '</dd></div></dl></div>' +
        '<div class="aside-card"><div class="card-heading"><h3>只做真题</h3><span>当前入口</span></div><p class="aside-note">原创短测/模拟训练不再作为练习入口。去真题页做仔细阅读、整卷或资料库里的有来源材料。</p><button type="button" class="btn btn-secondary btn-block" data-nav="exam">进入真题库</button></div></aside></div>' +
      '<section class="panel data-panel"><div class="panel-topline"><div><span class="section-kicker">数据</span><h2>导出、导入与备份</h2></div><span class="panel-meta">JSON</span></div>' +
        '<div class="data-actions-grid"><div class="data-action-card"><h3>学习进度</h3><p>包含设置、作答记录、错题、复习状态、任务完成情况和自写内容。换设备时导入即可继续。</p><div class="button-row"><button type="button" class="btn btn-secondary" data-action="export-progress">导出进度</button><label class="btn btn-quiet">导入进度<input type="file" accept="application/json,.json" data-file-import="progress" hidden></label></div></div>' +
        '<p class="aside-note">导入材料不会自动变成“真题”。应用无法核验来源，也不会声称频次或年份。</p>' +
      '</section>' +
      '<section class="panel about-panel"><div class="panel-topline"><div><span class="section-kicker">边界说明</span><h2>没有模型 API，也没有隐藏上传</h2></div></div><div class="notice-columns three"><div><b>无密钥</b><p>本应用不调用模型 API，不需要填写 API Key，也不会把作答上传到服务器。</p></div><div><b>无官方评分</b><p>' + esc(Data.DISCLAIMERS.grading) + '</p></div><div><b>材料声明</b><p>' + esc(Data.DISCLAIMERS.materials) + ' ' + esc(Data.DISCLAIMERS.audio) + ' 真题页另使用本机 2024.06 原卷/真实录音和第三方答案；答案非官方，仅限个人学习。</p></div></div><details class="about-details"><summary>版本与存储说明</summary><p>版本 ' + esc(Data.CONTENT_META.version) + ' · 存储键 cet4_score_booster_v1 · localStorage。导出文件包含你的作答内容与自写段落，分享前请检查隐私。清理站点数据会删除本地进度。</p></details></section>' +
      '<section class="danger-panel"><div><span class="section-kicker">危险操作</span><h2>清空全部本地数据</h2><p>会删除设置、短测、作答、错题、复习安排和导入的材料，无法撤销。建议先导出进度。</p></div><button type="button" class="btn btn-danger" data-action="reset-all">清空全部数据</button></section>' +
      '<footer class="page-footer"><span>四级提分台 · 本地版</span><span>' + esc(Data.DISCLAIMERS.privacy) + '</span></footer>' +
    '</div>';
    root.innerHTML = pageShell('settings', content);
  }

  /* ============================== 通用渲染入口 ============================== */
  function stopTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function realVocabOtherContext(term, excludeQuestionId, sourceText) {
    const re = new RegExp('\\b' + escapeRegExp(term) + '\\b', 'i');
    const normalize = function (x) { return String(x || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    const sourceNorm = normalize(sourceText);
    for (const bank of (window.CET4ReadingBanks || [])) {
      for (const q of (bank.questions || [])) {
        if (q.id === excludeQuestionId) continue;
        if (re.test(q.stem) || (q.options || []).some(function (o) { return re.test(o); })) {
          if (!sourceNorm || normalize(q.stem) !== sourceNorm) {
            return { bank: bank, question: q, text: q.stem, kind: '题干/选项' };
          }
        }
        const p = (bank.paragraphs || []).find(function (x) { return x.id === q.passageId; });
        const s = p && (p.sentences || []).find(function (x) { return re.test(x.text); });
        if (s && (!sourceNorm || normalize(s.text) !== sourceNorm)) {
          return { bank: bank, question: q, text: s.text, kind: '原文' };
        }
      }
    }
    return null;
  }

  function reviewWord(key) {
    const rt = realTrainingState();
    if (!rt.vocab || !rt.vocab[key]) return;
    view.wordReview = { key: key, revealed: false };
    render();
  }

  function revealWordReview() {
    if (!view.wordReview) return;
    view.wordReview.revealed = true;
    render();
  }

  function gradeWordReview(known) {
    const rt = realTrainingState();
    const wr = view.wordReview;
    if (!wr || !rt.vocab || !rt.vocab[wr.key]) return;
    const e = rt.vocab[wr.key];
    const prev = e.reviews || [];
    const prevKnown = prev.length ? prev[prev.length - 1].known : null;
    e.reviews = prev.concat([{ ts: new Date().toISOString(), known: !!known }]);
    e.unknownCount = (e.unknownCount || 0) + (known ? 0 : 1);
    e.knownCount = (e.knownCount || 0) + (known ? 1 : 0);
    e.lastResult = known ? 'known' : 'unknown';
    e.dueAt = Date.now() + (known ? 3 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000);
    e.lastReviewedAt = new Date().toISOString();
    Store.save();
    view.lastWordReview = { term: e.term, known: !!known, previous: prevKnown };
    const b = view.wordBatch;
    if (b) {
      b.index += 1;
      if (known) b.known += 1; else b.unknown += 1;
      if (b.index >= b.keys.length) {
        view.wordBatchDone = { known: b.known, unknown: b.unknown, total: b.total };
        view.wordBatch = null;
        view.wordReview = null;
      } else {
        view.wordReview = { key: b.keys[b.index], revealed: false, batch: true };
      }
    } else {
      view.wordReview = null;
    }
    render();
  }

  function startWordBatch(count) {
    const rt = realTrainingState();
    const saved = rt.vocab || {};
    const keys = Object.keys(saved).sort(function (a, b) { return (saved[a].dueAt || 0) - (saved[b].dueAt || 0); }).slice(0, count);
    if (!keys.length) {
      view.tab = 'train';
      render();
      toast('词本还没有词；先做一篇真题并在解析里收词。', 'warn');
      return;
    }
    view.wordBatch = { keys: keys, index: 0, known: 0, unknown: 0, total: keys.length };
    view.wordBatchDone = null;
    view.wordReview = { key: keys[0], revealed: false, batch: true };
    view.tab = 'train';
    render();
  }

  let realVocabCorpusCache = null;

  function realVocabCorpus() {
    if (realVocabCorpusCache) return realVocabCorpusCache;
    const map = {};
    const stop = new Set('the a an and or but if while of to in on at from with without for by as is are was were be been being this that these those it its their they them we you your our us not no more most many much some any can could may might will would should than then so because about into over after before during between through under above below people person make made makes take takes use used using one two three first second new good great important different have has had do does did what which who whom whose when where why how there here also only even just like such other another very much many'.split(' '));
    const add = function (term, meaning, note, text, src, kind) {
      const key = String(term || '').toLowerCase();
      if (!key || key.length < 4) return;
      if (!map[key]) map[key] = { term: term, meaning: meaning || '', note: note || '', sources: [], frequency: 0, q: src.q, bank: src.bank, v: { term: term, meaning: meaning || '', note: note || '' } };
      if (meaning && !map[key].meaning) map[key].meaning = meaning;
      if (note && !map[key].note) map[key].note = note;
      map[key].frequency += 1;
      if (!map[key].sources.some(function (s) { return s.questionId === src.q.id && s.sentence === text; })) {
        map[key].sources.push({ questionId: src.q.id, year: src.bank.year, set: src.bank.set, number: src.q.number, sentence: text || '', sourceKind: kind || '原文' });
      }
    };
    (window.CET4ReadingBanks || []).forEach(function (bank) {
      (bank.questions || []).forEach(function (q) {
        const src = { bank: bank, q: q };
        const passage = (bank.paragraphs || []).find(function (p) { return p.id === q.passageId; });
        (passage ? passage.sentences : []).forEach(function (s) {
          const words = (s.text.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []);
          words.forEach(function (w) { const key = w.toLowerCase().replace(/[^a-z'-]/g, ''); if (!stop.has(key)) add(w, '', '', s.text, src, '原文'); });
        });
        (q.stem.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []).forEach(function (w) { const key = w.toLowerCase().replace(/[^a-z'-]/g, ''); if (!stop.has(key)) add(w, '', '', q.stem, src, '题干'); });
        (q.options || []).forEach(function (o) { (o.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []).forEach(function (w) { const key = w.toLowerCase().replace(/[^a-z'-]/g, ''); if (!stop.has(key)) add(w, '', '', o, src, '选项'); }); });
        (q.vocabFocus || []).forEach(function (v) {
          add(v.term, v.meaning, v.note, q.evidenceText || q.stem || '', src, '解析词');
        });
      });
    });
    realVocabCorpusCache = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.frequency - a.frequency || a.term.localeCompare(b.term); });
    return realVocabCorpusCache;
  }

  function renderRealVocab() {
    const rt = realTrainingState();
    const saved = rt.vocab || {};
    const dueWords = Object.keys(saved).filter(function (k) { return (saved[k].dueAt || 0) <= Date.now(); }).length;
    const wr = view.wordReview;
    const wordReviewHTML = wr && saved[wr.key] ? (function () {
      const e = saved[wr.key];
      const src = (e.sources || [])[0];
      const other = realVocabOtherContext(e.term, src && src.questionId, src && src.sentence);
      const re = new RegExp('\\b' + escapeRegExp(e.term) + '\\b', 'i');
      const clue = src && src.sentence ? src.sentence.replace(re, '____') : '';
      return '<section class="word-review-card"><div class="word-review-top"><span>真题词复习</span><button type="button" class="text-link-button" data-action="close-word-review">先不复习</button></div>' +
        '<h2>' + esc(e.term) + '</h2>' +
        '<p class="word-review-clue">' + (clue ? esc(clue) : '先回忆这个词在本批真题里的意思。') + '</p>' +
        (wr.revealed ? '<div class="word-review-answer"><p><b>本句意思：</b>' + esc(e.meaning) + '</p><p><b>搭配/提示：</b>' + esc(e.note || '') + '</p>' + (other ? '<div class="wordbook-other"><span>另一处真实真题语境 · ' + esc(other.bank.year) + ' 第' + other.bank.set + '套第' + other.question.number + '题</span><p>' + esc(other.text) + '</p></div>' : '<p class="inline-note">本批只有一个可核对语境；没有第二处时不伪造。</p>') + '</div><div class="word-review-actions"><button type="button" class="btn btn-primary btn-small" data-action="grade-word" data-known="1">这次认出来了</button><button type="button" class="btn btn-secondary btn-small" data-action="grade-word" data-known="0">还没认出</button></div>' : '<button type="button" class="btn btn-secondary btn-small" data-action="reveal-word">先回忆，显示意思</button>') +
        (e.lastResult ? '<p class="word-review-last">上次：' + (e.lastResult === 'known' ? '认出来了' : '没认出') + '</p>' : '') + '</section>';
    })() : '';
    const vocabQuery = (view.vocabSearch || '').toLowerCase();
    const entries = Object.keys(saved).map(function (k) { return saved[k]; }).filter(function (e) {
      return !vocabQuery || e.term.toLowerCase().indexOf(vocabQuery) !== -1 || (e.meaning || '').toLowerCase().indexOf(vocabQuery) !== -1;
    }).sort(function (a, b) {
      const aw = (a.sources || []).reduce(function (n, s) { const st = rt.state[s.questionId]; return n + (st ? (st.wrong || 0) : 0); }, 0);
      const bw = (b.sources || []).reduce(function (n, s) { const st = rt.state[s.questionId]; return n + (st ? (st.wrong || 0) : 0); }, 0);
      return bw - aw || (b.sources || []).length - (a.sources || []).length || a.term.localeCompare(b.term);
    });
    const savedPer = 8;
    if (!view.savedPage || view.savedPage < 1) view.savedPage = 1;
    const savedPages = Math.max(1, Math.ceil(entries.length / savedPer));
    if (view.savedPage > savedPages) view.savedPage = savedPages;
    const savedPageItems = entries.slice((view.savedPage - 1) * savedPer, view.savedPage * savedPer);
    const corpus = realVocabCorpus();
    const search = (view.vocabSearch || '').toLowerCase();
    const suggestions = corpus.filter(function (x) { return !saved[String(x.term).toLowerCase()] && (!search || x.term.toLowerCase().indexOf(search) !== -1 || x.meaning.toLowerCase().indexOf(search) !== -1) && x.sources.length; });
    const perVocab = 12;
    if (!view.vocabPage || view.vocabPage < 1) view.vocabPage = 1;
    const vocabPages = Math.max(1, Math.ceil(suggestions.length / perVocab));
    if (view.vocabPage > vocabPages) view.vocabPage = vocabPages;
    const vocabPageItems = suggestions.slice((view.vocabPage - 1) * perVocab, view.vocabPage * perVocab);
    const reviewNotice = view.lastWordReview ? '<div class="inline-note">' + esc(view.lastWordReview.term) + '：这次' + (view.lastWordReview.known ? '认出来了' : '还没认出') + (view.lastWordReview.previous !== null ? '；上次' + (view.lastWordReview.previous ? '认出来了' : '没认出') : '') + '。下次复习按本次结果排期。</div>' : '';
    const batchNotice = view.wordBatch ? '<div class="word-batch-progress"><span>本组词复习</span><b>' + (view.wordBatch.index + 1) + ' / ' + view.wordBatch.total + '</b><em>认出 ' + view.wordBatch.known + ' · 未认出 ' + view.wordBatch.unknown + '</em></div>' : (view.wordBatchDone ? '<div class="word-batch-progress done"><span>本组词复习完成</span><b>' + view.wordBatchDone.known + ' / ' + view.wordBatchDone.total + '</b><em>认出 ' + view.wordBatchDone.known + ' · 未认出 ' + view.wordBatchDone.unknown + '。可以到这里结束。</em></div>' : '');
    const content = '<div class="page-wrap wordbook-page"><div class="page-heading-row"><div><p class="eyebrow">真题词汇 · 从失分处来</p><h1>真题词本</h1><p class="lead">从全部已整理真题的文章、题干和选项中提取；' + entries.length + ' 个已收词 / ' + corpus.length + ' 个真题词库条目，覆盖 150 道阅读。频次来自实际语料，不代表四级全部词汇。</p></div><div class="page-heading-aside"><span class="count-bubble">' + entries.length + '</span><p>已收词<br>来自真题</p></div></div>' + reviewNotice +
      batchNotice +
      (wordReviewHTML ? wordReviewHTML : '') +
      (dueWords ? '<div class="word-due-note"><b>有 ' + dueWords + ' 个词到期复习。</b><button type="button" class="btn btn-secondary btn-small" data-action="review-word" data-word-key="' + esc(Object.keys(saved).find(function (k) { return (saved[k].dueAt || 0) <= Date.now(); })) + '">复习到期词 ' + ICONS.arrow + '</button></div>' : '') +
      '<section class="panel"><div class="panel-topline"><div><span class="section-kicker">我的词</span><h2>先回到原句，再看另一处语境</h2></div><span class="panel-meta">' + (entries.length ? entries.length + ' 个' : '还没有') + '</span></div>' +
      (entries.length ? '<div class="wordbook-list">' + savedPageItems.map(function (e) {
        const src = (e.sources || [])[0];
        const other = realVocabOtherContext(e.term, src && src.questionId, src && src.sentence);
        return '<article class="wordbook-card"><div class="wordbook-head"><div><b>' + esc(e.term) + '</b><span>' + esc(e.meaning) + '</span></div><div class="wordbook-head-actions"><em>' + (e.sources || []).length + ' 个来源' + ((e.reasons || []).length ? ' · 失分词' : '') + '</em><button type="button" class="btn btn-quiet btn-small" data-action="review-word" data-word-key="' + esc(String(e.term).toLowerCase()) + '">复习</button></div></div>' +
          '<p class="wordbook-note">' + esc(e.note || '') + '</p>' +
          (src ? '<div class="wordbook-source"><span>' + esc(src.sourceKind || '原句') + ' · ' + esc(src.year) + ' 第' + src.set + '套第' + src.number + '题</span><p>' + esc(src.sentence || '') + '</p><button type="button" class="text-link-button" data-action="start-real-question" data-question-id="' + esc(src.questionId) + '">回到原题</button></div>' : '') +
          '<details class="wordbook-review"><summary>复习：先回忆词义，再展开</summary><p><b>本句意思：</b>' + esc(e.meaning) + '</p>' + (other ? '<div class="wordbook-other"><span>另一处真题语境 · ' + esc(other.bank.year) + ' 第' + other.bank.set + '套第' + other.question.number + '题 · ' + other.kind + '</span><p>' + esc(other.text) + '</p></div>' : '<p class="inline-note">本批只有一个可核对语境；没有第二处时不伪造。</p>') + '</details></article>';
      }).join('') + '</div>' + (savedPages > 1 ? '<div class="pagination"><button type="button" class="btn btn-quiet btn-small" data-action="saved-page" data-page="' + (view.savedPage - 1) + '"' + (view.savedPage <= 1 ? ' disabled' : '') + '>上一页</button><span>' + view.savedPage + ' / ' + savedPages + '</span><button type="button" class="btn btn-quiet btn-small" data-action="saved-page" data-page="' + (view.savedPage + 1) + '"' + (view.savedPage >= savedPages ? ' disabled' : '') + '>下一页</button></div>' : '') : '<p class="inline-note">还没有收词。做真题后，在解析里点“加入词本”，或在下方从建议词里加入。</p>') +
      '</section>' +
      '<section class="panel"><div class="panel-topline"><div><span class="section-kicker">真题词库</span><h2>从全部已整理真题提取</h2></div><span class="panel-meta">' + corpus.length + ' 个条目</span></div><div class="wordbook-search"><input id="vocab-search" type="search" placeholder="搜词或中文义" value="' + esc(view.vocabSearch || '') + '" data-vocab-search><span>' + suggestions.length + ' 个未收词</span></div><div class="wordbook-suggestions">' + vocabPageItems.map(function (x) {
        const src = x.sources[0];
        return '<div class="wordbook-suggestion"><div><b>' + esc(x.term) + '</b><span>' + esc(x.meaning || '语境义待补') + '</span><small>出现 ' + x.frequency + ' 次 · ' + esc(src.year) + ' 第' + src.set + '套第' + src.number + '题</small><p>' + esc(src.sentence || '') + '</p></div><button type="button" class="btn btn-quiet btn-small" data-action="save-real-word" data-question-id="' + esc(src.questionId) + '" data-term="' + esc(x.term) + '">收词</button></div>';
      }).join('') + '</div>' + (vocabPages > 1 ? '<div class="pagination"><button type="button" class="btn btn-quiet btn-small" data-action="vocab-page" data-page="' + (view.vocabPage - 1) + '"' + (view.vocabPage <= 1 ? ' disabled' : '') + '>上一页</button><span>' + view.vocabPage + ' / ' + vocabPages + '</span><button type="button" class="btn btn-quiet btn-small" data-action="vocab-page" data-page="' + (view.vocabPage + 1) + '"' + (view.vocabPage >= vocabPages ? ' disabled' : '') + '>下一页</button></div>' : '') + '</section><p class="source-note">词库来源：全部已整理阅读 150 题（15 组）的文章、题干、选项与 AI 辅助解析。自动提取的词没有完整释义时标“语境义待补”；频次只统计这批材料。</p></div>';
    root.innerHTML = pageShell('train', content);
  }

  function startHomeReadingTask() {
    const passages = readingPassageSets();
    const filtered = passages.filter(function (x) { return view.homeTopic === 'all' || x.topic === view.homeTopic; });
    const rt = realTrainingState();
    const target = filtered.find(function (x) {
      return x.questions.some(function (q) { return !(rt.state[q.id] && rt.state[q.id].attempts); });
    }) || filtered[0] || passages[0];
    if (!target) { toast('当前没有可练阅读。', 'warn'); return; }
    if (view.homeChoice.amount === '2') startReadingBank(target.bank.id, 'practice');
    else startReadingPassage(target.bank.id, target.passage.id, 'practice');
  }

  function startHomeListeningTask() {
    const sets = trueListeningSets().slice().sort(function (a, b) { return b.year.localeCompare(a.year) || a.set - b.set; });
    if (!sets.length) { toast('当前没有可用的听力题组。', 'warn'); return; }
    startTrueListening(sets[0].id, view.homeChoice.listeningMode === 'mock' ? 'mock' : view.homeChoice.listeningMode === 'check' ? 'check' : 'practice');
  }

  function renderRealHome() {
    const banks = window.CET4ReadingBanks || [];
    const rt = realTrainingState();
    const paused = rt.paused;
    if (!view.homeChoice) view.homeChoice = { type: 'reading', amount: '1', listeningMode: 'practice' };
    if (!view.homeTopic) view.homeTopic = 'all';
    const choice = view.homeChoice;
    const passages = readingPassageSets();
    const topics = [{ key: 'all', label: '不限主题' }].concat(Array.from(new Set(passages.map(function (x) { return x.topic; }))).map(function (key) {
      return { key: key, label: REAL_TOPIC_LABELS[key] || key };
    }));
    const filtered = passages.filter(function (x) { return view.homeTopic === 'all' || x.topic === view.homeTopic; });
    const target = filtered.find(function (x) {
      return x.questions.some(function (q) { return !(rt.state[q.id] && rt.state[q.id].attempts); });
    }) || filtered[0] || passages[0];
    const readingBank = target && banks.find(function (b) { return b.id === target.bank.id; });
    const audioExam = trueExams().slice().sort(function (a, b) { return b.year.localeCompare(a.year) || a.set - b.set; }).find(function (e) { return !!e.audioPath; });
    const type = choice.type;
    const amount = choice.amount;
    const estimated = type === 'reading' ? (amount === '2' ? '约 18 分钟' : '约 9 分钟') : type === 'listening' ? '约 25 分钟' : type === 'fill' ? '约 10 分钟' : type === 'match' ? '约 15 分钟' : (type === 'writing' || type === 'translation') ? '约 30 分钟' : (amount === '10' ? '约 5 分钟' : '约 3 分钟');
    const amountOptions = type === 'reading'
      ? [{ key: '1', label: '1 篇', sub: '5 题' }, { key: '2', label: '2 篇', sub: '10 题' }]
      : type === 'listening'
        ? [{ key: '1', label: '1 套', sub: '25 题 · 25 分钟' }]
        : type === 'fill'
          ? [{ key: '1', label: '1 套', sub: '10 空' }]
          : (type === 'match')
            ? [{ key: '1', label: '1 套', sub: '10 题' }]
          : (type === 'writing' || type === 'translation')
            ? [{ key: '1', label: '1 题', sub: '30 分钟' }]
            : [{ key: '5', label: '5 个词', sub: '约 3 分钟' }, { key: '10', label: '10 个词', sub: '约 5 分钟' }];
    const typeLabels = { reading: '仔细阅读', listening: '听力', fill: '选词填空', match: '长篇匹配', vocab: '真题词汇', writing: '写作', translation: '翻译' };
    const content = '<div class="page-wrap simple-home"><div class="simple-home-head"><p class="eyebrow">真题 · 今天练多少由你定</p><h1>选一项，开始。</h1><p class="simple-lead">不用定长期任务。做完一组可以停，也可以再练；没有倒计时压力。</p><p class="simple-note home-listen-note">你提到听力最没底：可以先选听力练习；这只是初步信息，不当作诊断。最小任务仍是 1 篇阅读。</p></div>' +
      (paused ? '<div class="simple-continue"><div><b>上次还没做完</b><span>' + esc(paused.title || '') + '</span></div><button type="button" class="btn btn-primary btn-small" data-action="resume-reading">继续上次 ' + ICONS.arrow + '</button></div>' : '') +
      ((rt.pausedListening) ? '<div class="simple-continue"><div><b>上次听力还没提交</b><span>' + esc((CET4ListeningSets.find(function (x) { return x.id === rt.pausedListening.setId; }) || {}).shortTitle || '') + '</span></div><button type="button" class="btn btn-primary btn-small" data-action="resume-listening">继续听力 ' + ICONS.arrow + '</button></div>' : '') +
      '<section class="simple-choice"><div class="simple-step"><span>01</span><b>选题型</b></div><div class="choice-types">' + Object.keys(typeLabels).map(function (k) {
        return '<button type="button" class="choice-type ' + (type === k ? 'active' : '') + '" data-action="select-home-type" data-type="' + k + '"><b>' + typeLabels[k] + '</b><span>' + (k === 'reading' ? (window.CET4ReadingBanks || []).reduce(function (n, b) { return n + (b.questions || []).length; }, 0) + ' 题可练' : k === 'listening' ? '5 套 / 125 题' : k === 'fill' ? ((window.CET4FillSets || []).length) + ' 套 / 100 空' : k === 'match' ? ((window.CET4MatchSets || []).length) + ' 套 / 100 题' : (k === 'writing' || k === 'translation') ? '5 道真题' : '5 / 10 个词') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="simple-step"><span>02</span><b>选练习量</b></div><div class="choice-amounts">' + amountOptions.map(function (x) {
        return '<button type="button" class="choice-amount ' + (amount === x.key ? 'active' : '') + '" data-action="select-home-amount" data-amount="' + x.key + '"><b>' + x.label + '</b><span>' + x.sub + '</span></button>';
      }).join('') + '</div>' +
      (type === 'reading' ? '<div class="simple-topics"><span>兴趣主题（可选）</span>' + topics.map(function (x) { return '<button type="button" class="topic-chip ' + (view.homeTopic === x.key ? 'active' : '') + '" data-action="select-home-topic" data-topic="' + x.key + '">' + x.label + '</button>'; }).join('') + '</div>' : '') +
      (type === 'listening' ? '<div class="simple-listening-modes"><button type="button" class="mode-option ' + (choice.listeningMode === 'practice' ? 'active' : '') + '" data-action="select-listening-mode" data-mode="practice"><b>练习</b><span>可重听，不自动交卷</span></button><button type="button" class="mode-option ' + (choice.listeningMode === 'check' ? 'active' : '') + '" data-action="select-listening-mode" data-mode="check"><b>检验</b><span>独立完成，25 分钟</span></button><button type="button" class="mode-option ' + (choice.listeningMode === 'mock' ? 'active' : '') + '" data-action="select-listening-mode" data-mode="mock"><b>模拟</b><span>连续播放，不可重听</span></button></div><p class="simple-note">现有材料只有整套 25 题听力录音，尚未按段拆分；不伪造“一段听力”的边界，也不伪造原文。</p>' : '') +
      (type === 'vocab' ? '<p class="simple-note">词本优先复习到期词和失分词；如果词本还是空的，先做一篇阅读并在解析里收词。不自动塞词凑数。</p>' : '') +
      '<div class="simple-start-row"><div><b>' + typeLabels[type] + ' · ' + (type === 'reading' ? (amount === '2' ? '2 篇 / 10 题' : '1 篇 / 5 题') : type === 'listening' ? '1 套 / 25 题' : type === 'fill' ? '1 套 / 10 空' : type === 'match' ? '1 套 / 10 题' : (type === 'writing' || type === 'translation') ? '1 道真题' : amount + ' 个词') + '</b><span>预计 ' + estimated + ' · 可随时暂停</span></div><button type="button" class="btn btn-primary btn-lg" data-action="start-home-task">开始 ' + ICONS.arrow + '</button></div></section>' +
      '<div class="simple-footer-links"><button type="button" class="text-link-button" data-nav="exam">看全部真题</button><button type="button" class="text-link-button" data-nav="progress">查看进度</button><button type="button" class="text-link-button" data-nav="train">真题词本</button><span>只使用真题；答案第三方，非官方。</span></div></div>';
    root.innerHTML = pageShell('today', content);
  }

  function render() {
    stopTimer();
    /* 学习流接管时可以自己渲染，避免被整体重绘打断 */
    if (window.CET4Learn && window.CET4Learn.isActive()) {
      window.CET4Learn.render();
      return;
    }
    if (!Store.state.profile.onboarded) {
      Store.state.profile.onboarded = true;
      Store.save();
    }
    onboard = null;
    if (view.session) {
      renderSession();
      return;
    }
    if (view.tab === 'exam') renderTrueExams();
    else if (view.tab === 'train') renderRealVocab();
    else if (view.tab === 'errors') renderErrors();
    else if (view.tab === 'progress') renderRealProgress();
    else if (view.tab === 'settings') renderSettings();
    else renderRealHome();
    window.scrollTo(0, 0);
  }

  function go(tab) {
    hideToast();
    stopSpeech();
    stopTimer();
    if (window.CET4Learn) window.CET4Learn.exit();
    if (view.session) view.session = null;
    view.tab = tab || 'today';
    render();
  }

  /* ============================== 真题模考 ============================== */
  function trueExams() {
    const d = window.CET4TrueData;
    return d && Array.isArray(d.exams) ? d.exams : [];
  }

  function trueExamById(id) {
    return trueExams().find(function (exam) { return exam.id === id; }) || null;
  }

  function trueMode(exam, modeId) {
    if (!exam || !Array.isArray(exam.modes)) return null;
    return exam.modes.find(function (mode) { return mode.id === modeId; }) || null;
  }

  function trueSectionsForMode(exam, mode) {
    if (!exam || !mode) return [];
    if (mode.id === 'listening') return exam.sections.filter(function (s) { return s.id === 'listening'; });
    if (mode.id === 'reading') return exam.sections.filter(function (s) { return s.id !== 'listening'; });
    return exam.sections.slice();
  }

  function trueAnswerCount(sections) {
    return (sections || []).reduce(function (n, s) { return n + (s.to - s.from + 1); }, 0);
  }

  function trueExamHistoryHTML(records) {
    if (!records || !records.length) {
      return '<p class="aside-note">还没有真题记录。第一次做完整套题时，先当作一次限时检验；成绩只用于定位下一轮训练。</p>';
    }
    return '<div class="true-record-list">' + records.slice().reverse().slice(0, 4).map(function (rec) {
      return '<div class="true-record"><div><b>' + esc(rec.examTitle || '真题') + '</b><span>' + esc(rec.modeLabel || '') + ' · ' + esc(Store.formatDateCN(rec.ts)) + '</span>' + ((rec.wrongQuestions || []).length ? '<button type="button" class="text-link-button true-record-retry" data-action="retry-true-record" data-record-id="' + esc(rec.id) + '">错题重练 ' + rec.wrongQuestions.length + '</button>' : '') + '</div><strong>' + rec.correct + ' / ' + rec.total + '</strong></div>';
    }).join('') + '</div>';
  }

  function trueExamAsideHTML() {
    const exam = trueExams()[0];
    if (!exam) return '';
    const records = Store.state.trueExamRecords || [];
    const latest = records[records.length - 1];
    const count = trueExams().length;
    return '<div class="aside-card true-aside"><div class="card-heading"><h3>真题库</h3><span>原卷 + 真实音频</span></div>' +
      '<p class="true-aside-title">' + count + ' 套可在网页作答</p>' +
      '<p class="aside-note">5 套整卷 / 6 套阅读；原卷、答案、音频分开存放。完整资料清单、缺答案和扫描件状态都在真题页标出。</p>' +
      (latest ? '<div class="true-aside-last">最近：' + esc(latest.modeLabel) + ' · ' + latest.correct + '/' + latest.total + '</div>' : '') +
      '<button type="button" class="btn btn-secondary btn-block" data-nav="exam">进入真题库 ' + ICONS.arrow + '</button></div>';
  }

  function trueExamBannerHTML() {
    const exam = trueExams()[0];
    if (!exam) return '';
    return '<div class="true-library-banner"><div><span class="section-kicker">真实原卷 · 真实录音</span><h2>真题库已接 ' + trueExams().length + ' 套在线</h2><p>5 套整卷、6 套阅读；原卷 PDF、真实 MP3、答案和资料清单分开标注。按年份/套卷进入，交卷后再看答案。</p></div><div class="true-library-actions"><button type="button" class="btn btn-primary" data-nav="exam">进入真题库 ' + ICONS.arrow + '</button><span>不是原创模拟</span></div></div>';
  }

  function startRealPractice(setId, mode) {
    const set = realSetById(setId);
    if (!set) { toast('这组真题材料不存在。', 'warn'); return; }
    startReadingSession(set, { mode: mode === 'timed' ? 'timed' : 'practice', from: 'exam' });
  }

  function startRealDiagnostic() {
    const data = window.CET4RealData;
    if (!data) { toast('真题数据未加载。', 'warn'); return; }
    const ids = ['rq46', 'rq48', 'rq51', 'rq53'];
    const questions = data.questions.filter(function (q) { return ids.indexOf(q.id) !== -1; });
    const set = {
      id: 'real-diagnostic-2024-06',
      title: '真题阅读短测 · 4 题',
      source: '2024年6月四级第1套 · 阅读 C 篇节选',
      sourceLabel: '真题 · 第三方答案 + AI补充解析',
      level: '真题 · 初步诊断',
      estimatedMinutes: 8,
      isReal: true,
      examMeta: data.exam,
      paragraphs: data.paragraphs,
      questions: questions
    };
    startReadingSession(set, { mode: 'timed', from: 'exam' });
  }

  function startRealQuestion(questionId) {
    const q = realQuestionById(questionId);
    if (!q) { toast('这道真题不存在。', 'warn'); return; }
    startReadingSession(realSingleSet(q), { mode: 'practice', from: 'exam' });
  }

  function realSkillStats() {
    const data = window.CET4RealData;
    const primary = {};
    const secondary = {};
    (data.questions || []).forEach(function (q) {
      const p = q.skills.primary;
      if (!primary[p]) primary[p] = { key: p, label: (data.skills[p] || {}).label || p, count: 0, questions: [] };
      primary[p].count += 1;
      primary[p].questions.push(q);
      (q.skills.secondary || []).forEach(function (s) {
        if (!secondary[s]) secondary[s] = { key: s, label: (data.skills[s] || {}).label || s, count: 0, questions: [] };
        secondary[s].count += 1;
        secondary[s].questions.push(q);
      });
    });
    return { primary: Object.keys(primary).map(function (k) { return primary[k]; }), secondary: Object.keys(secondary).map(function (k) { return secondary[k]; }) };
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function realVocabStats() {
    const data = window.CET4RealData;
    if (!data) return [];
    const sources = [];
    (data.paragraphs || []).forEach(function (p) {
      (p.sentences || []).forEach(function (sentence, si) {
        sources.push({ label: '原文 · ' + p.label + ' 第 ' + (si + 1) + ' 句', page: p.page, questionId: null, kind: '原文', text: sentence.text });
      });
    });
    (data.questions || []).forEach(function (q) {
      sources.push({ label: '题干 · 第 ' + q.number + ' 题', page: q.page, questionId: q.id, kind: '题干', text: q.stem });
      q.options.forEach(function (opt, oi) {
        sources.push({ label: '选项 ' + 'ABCD'[oi] + ' · 第 ' + q.number + ' 题', page: q.page, questionId: q.id, kind: '选项', text: opt });
      });
    });
    return (data.vocabSeeds || []).map(function (seed) {
      const hits = [];
      (seed.variants || []).forEach(function (variant) {
        const re = new RegExp('\\b' + escapeRegExp(variant) + '\\b', 'gi');
        sources.forEach(function (src) {
          let m;
          while ((m = re.exec(src.text)) !== null) {
            hits.push({ source: src.label, page: src.page, questionId: src.questionId, kind: src.kind, text: src.text });
            if (re.lastIndex === m.index) re.lastIndex += 1;
          }
        });
      });
      const uniqueSources = [];
      const sourceSeen = {};
      hits.forEach(function (h) { const k = h.source + '|' + h.text; if (!sourceSeen[k]) { sourceSeen[k] = true; uniqueSources.push(h); } });
      const questionIds = Array.from(new Set(hits.map(function (h) { return h.questionId; }).filter(Boolean)));
      const passageNames = Array.from(new Set(hits.filter(function (h) { return h.kind === '原文'; }).map(function (h) { const m = h.source.match(/Passage (One|Two)/); return m ? m[1] : '原文'; })));
      const optionHits = hits.filter(function (h) { return h.kind === '选项'; }).length;
      const stemHits = hits.filter(function (h) { return h.kind === '题干'; }).length;
      return {
        term: seed.term,
        meaning: seed.meaning,
        type: seed.type,
        note: seed.note,
        count: hits.length,
        passageCount: passageNames.length,
        passageNames: passageNames,
        optionHits: optionHits,
        stemHits: stemHits,
        passageHits: hits.length - optionHits - stemHits,
        sources: uniqueSources.slice(0, 4),
        questionIds: questionIds
      };
    }).filter(function (v) { return v.count > 0; }).sort(function (a, b) { return b.count - a.count; });
  }

  function realPanelSkillRows(items, label, total) {
    return '<div class="real-skill-group"><div class="real-skill-group-head"><span>' + label + '</span><small>' + items.length + ' 类</small></div>' + items.sort(function (a, b) { return b.count - a.count; }).map(function (item) {
      return '<div class="real-skill-row"><div><b>' + esc(item.label) + '</b><span>' + item.count + ' / ' + total + ' 题</span></div><div class="real-skill-source">' + item.questions.slice(0, 4).map(function (q) { return '<button type="button" data-action="start-real-question" data-question-id="' + esc(q.id) + '">第 ' + q.number + ' 题</button>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
  }

  function realRecommendation() {
    const data = window.CET4RealData;
    const summary = realPracticeSummary();
    const first = (realTrainingState().attempts || []).filter(function (a) { return a.isFirst; });
    if (!first.length) {
      return { title: '样本为 0：先做一组短测', body: '还没有这 10 道真题的作答记录。先做 4 题短测（8 分钟），不急着给你贴“阅读弱”的标签。', tone: 'muted' };
    }
    if (first.length < 3) {
      return { title: '样本不足，先继续积累', body: '目前只有 ' + first.length + ' 道首次作答；一题错不能说明薄弱。先完成 Passage One/Two，再根据重复错误安排。', tone: 'warn' };
    }
    const groups = {};
    first.forEach(function (a) {
      const q = realQuestionById(a.questionId);
      if (!q || !q.skills) return;
      const key = q.skills.primary;
      const label = (data.skills[key] || {}).label || key;
      if (!groups[key]) groups[key] = { key: key, label: label, total: 0, wrong: [], slow: 0, seconds: 0 };
      groups[key].total += 1;
      groups[key].seconds += Number(a.seconds) || 0;
      if (!a.correct) groups[key].wrong.push(q);
      if (a.correct && a.slow) groups[key].slow += 1;
    });
    const candidates = Object.keys(groups).map(function (k) { return groups[k]; }).filter(function (g) { return g.wrong.length >= 2 || (g.total >= 3 && g.wrong.length / g.total >= 0.5); }).sort(function (a, b) { return b.wrong.length - a.wrong.length || b.slow - a.slow; });
    if (candidates.length) {
      const g = candidates[0];
      const nums = g.wrong.map(function (q) { return '第 ' + q.number + ' 题'; }).join('、');
      return { title: '先练：' + g.label, body: '本批已做 ' + first.length + ' 题；' + g.label + ' ' + g.total + ' 题中错了 ' + g.wrong.length + ' 题（' + nums + '）。这些错误有具体原题依据，所以优先补这个考点，而不是泛泛刷整套。' + (g.slow ? '另有 ' + g.slow + ' 题做对但超时，练定位时同时计时。' : ''), tone: 'warn' };
    }
    const slowTotal = first.filter(function (a) { return a.correct && a.slow; }).length;
    return { title: '当前没有重复错误，继续扩大样本', body: '本批已做 ' + first.length + ' 题；没有同一考点重复错。' + (slowTotal ? '有 ' + slowTotal + ' 题做对但超时，下一组用连续限时练取舍和定位。' : '可做 Passage Two 或 10 题连续限时，观察陌生篇目表现；不据此预测分数。'), tone: 'good' };
  }

  function renderRealPracticePanelHTML() {
    const data = window.CET4RealData;
    if (!data) return '';
    const summary = realPracticeSummary();
    const skills = realSkillStats();
    const vocab = realVocabStats();
    const firstRate = summary.firstAttempts ? Math.round(summary.firstCorrect / summary.firstAttempts * 100) + '%' : '—';
    const watch = summary.watchItems || [];
    const primarySorted = skills.primary.slice().sort(function (a, b) { return b.count - a.count; });
    return '<section class="real-practice-panel"><div class="real-practice-head"><div><div class="real-practice-kicker">逐题真题 · 已校对首批</div><h2>把阅读 C 篇拆成可练的 10 道题</h2><p>原卷保留完整，答完才显示依据与解析。提示分层、信心标记、关键句拆解都落在原题上；答案来自第三方，解析是 AI 补充，不冒充官方。</p></div><div class="real-scope"><b>' + summary.attemptedQuestions + ' / ' + summary.totalQuestions + '</b><span>已练题目</span></div></div>' +
      '<div class="real-practice-actions"><button type="button" class="btn btn-primary" data-action="' + (summary.firstAttempts ? 'start-real-practice' : 'start-real-diagnostic') + '"' + (summary.firstAttempts ? ' data-set="real-p1" data-mode="practice"' : '') + '>' + (summary.firstAttempts ? '继续 Passage One 精练' : '先做 4 题真题短测 · 8 分钟') + ' ' + ICONS.arrow + '</button><button type="button" class="btn btn-secondary" data-action="start-real-practice" data-set="real-p1" data-mode="practice">Passage One · 5 题</button><button type="button" class="btn btn-secondary" data-action="start-real-practice" data-set="real-p2" data-mode="practice">Passage Two · 5 题</button><button type="button" class="btn btn-quiet" data-action="start-real-practice" data-set="real-all" data-mode="timed">连续限时 10 题 · 15 分钟</button></div>' +
      '<p class="real-scope-note">范围只含 2024.06 第1套阅读 C 篇：2 篇 / 10 题。其余本地真题尚未逐题核对，不进入下方的词汇/考点统计。练过这 10 题后，下方同套整卷不再算“完全未见”；整卷可用于节奏训练，真正的周检要另找未做套卷。</p>' +
      '<p class="real-stage-note">阶段口径：提交后看到依据与解析 = 已讲解；错题回炉原题重做对 = 已复习；同考点换题独立做对 = 换题检验通过。点“我懂了”不算掌握。</p>' +
      '<div class="real-stat-grid"><div class="real-stat"><b>' + summary.firstAttempts + '</b><span>首次作答</span><em>' + firstRate + ' 首次正确</em></div><div class="real-stat"><b>' + summary.independentCorrect + '</b><span>独立且按时答对</span><em>提示/猜/超时另记</em></div><div class="real-stat"><b>' + summary.hintedCorrect + '</b><span>提示后答对</span><em>不冒充独立掌握</em></div><div class="real-stat"><b>' + summary.watch + '</b><span>待巩固</span><em>猜对/提示/超时</em></div></div>' +
      '<div class="real-recommend ' + '">' + '<b>今天先练什么：' + esc(realRecommendation().title) + '</b><p>' + esc(realRecommendation().body) + '</p></div>' +
      '<p class="real-review-stats">首次平均用时 ' + summary.firstAvgSeconds + ' 秒 · 回炉原题重做：' + summary.reviewAttempts + ' 次，正确 ' + summary.reviewCorrect + ' 次' + (summary.reviewAttempts ? '（' + Math.round(summary.reviewCorrect / summary.reviewAttempts * 100) + '%）' : '') + ' · 同考点换题通过：' + summary.reviewPassed + ' / ' + summary.realErrors + ' 道错题 · 限时首次作答：' + summary.timedFirstCorrect + ' / ' + summary.timedFirst + ' · 做对但超时：' + summary.slowCorrect + ' · 猜对：' + summary.guessedCorrect + '。重做/换题来自错题本，不与首次作答混算；限时首次是“未见题”的近似指标。</p>' +
      (watch.length ? '<div class="real-watch"><div class="real-watch-head"><b>待巩固的题</b><span>点开再做一次；独立做对才会移出</span></div>' + watch.map(function (w) {
        const q = realQuestionById(w.questionId);
        return q ? '<div class="real-watch-row"><span>第 ' + q.number + ' 题 · ' + esc((w.reasons || []).join('；')) + '</span><button type="button" class="text-link-button" data-action="start-real-question" data-question-id="' + esc(q.id) + '">再做</button></div>' : '';
      }).join('') + '</div>' : '') +
      '<details class="real-stats-details"><summary>本批考点频次与词汇频次 · 点开核验范围与来源</summary><div class="real-stats-body"><div class="real-stats-scope"><b>统计口径：</b>10 题 / 2 篇 / 1 套（2024.06 第1套）/ 2024 年。频率只说明本批已核对材料，不代表整个四级考试，也不是官方高频榜。考点只统计题目确实考查的标签；“原文提到”不计入。</div>' +
        '<div class="real-skill-grid">' + realPanelSkillRows(primarySorted, '主考点', data.questions.length) + realPanelSkillRows(skills.secondary, '辅助考点', data.questions.length) + '</div>' +
        (skills.primary.some(function (x) { return x.key === 'main_idea'; }) ? '' : '<p class="aside-note">本批 10 题没有把“主旨”作为主考点的题；不为了凑标签造一条。</p>') +
        '<div class="real-vocab-stats"><div class="real-skill-group-head"><span>词汇 / 短语</span><small>合并常见词形；过滤普通功能词</small></div>' + vocab.map(function (v) {
          const firstQ = v.questionIds.length ? v.questionIds[0] : null;
          return '<div class="real-vocab-row"><div><b>' + esc(v.term) + '</b><span>' + esc(v.meaning) + '</span><small>' + v.count + ' 次（原文 ' + v.passageHits + ' / 题干 ' + v.stemHits + ' / 选项 ' + v.optionHits + '）· ' + v.passageCount + ' 篇 · 1 套 · 2024 · ' + (v.sources[0] ? esc(v.sources[0].source) : '本批材料') + '</small></div>' + (firstQ ? '<button type="button" class="text-link-button" data-action="start-real-question" data-question-id="' + esc(firstQ) + '">看原题</button>' : '') + '</div>';
        }).join('') + '</div>' +
        '<p class="source-note">词频按已导入的 2 篇原文 + 10 道题干/选项统计；同一篇文章多次出现按实际出现计数，不当作多套卷。题目考点按主/辅标签分开统计。</p>' +
      '</div></details>' +
      '<p class="source-note">导入核对：1 套 / 10 题 / 2 篇（2024.06 第1套阅读 C）；原卷与答案页码已记录，答案来自 answers-quick.pdf（第三方、非官方），解析为 AI 补充。本地目录可见 28 个年份目录、236 个四级文件，其余套卷尚未逐题核对，不参与本页统计；本批题号无重复。仅限本机个人学习。</p></section>';
  }

  function libraryData() { return window.CET4Library || null; }

  function libraryUrl(rel) {
    const parts = String(rel || '').split(/[\\/]+/).filter(Boolean);
    return 'assets/library/' + parts.map(function (p) { return encodeURIComponent(p); }).join('/');
  }

  function libraryFileLinkHTML(file) {
    if (!file) return '';
    const tags = [];
    if (file.textStatus === 'image_only') tags.push('扫描件/未OCR');
    if (file.hasKeys) tags.push('含答案页');
    if (file.duplicateOf) tags.push('重复文件');
    if (file.ext === '.mp3') tags.push('音频');
    if (file.ext === '.doc' || file.ext === '.docx') tags.push('Word');
    return '<a class="lib-file" href="' + libraryUrl(file.rel) + '" target="_blank" rel="noopener" title="' + esc(file.rel) + '">' + esc(file.name) + '</a>' +
      (tags.length ? '<span class="lib-file-tags">' + tags.map(function (t) { return '<em>' + esc(t) + '</em>'; }).join('') + '</span>' : '');
  }

  function libraryKindLabel(kind) {
    return ({ paper: '原卷', answer: '答案/解析', audio: '音频', transcript: '听力原文', writing_translation: '写作/翻译', other: '其他' })[kind] || '其他';
  }

  function onlineExamCardHTML(exam, records) {
    const recs = (records || []).filter(function (r) { return r.examId === exam.id || r.examTitle === exam.title; });
    const last = recs.length ? recs[recs.length - 1] : null;
    const status = !recs.length ? '未做' : (recs.some(function (r) { return (r.wrongQuestions || []).length; }) ? '有错题' : '已做');
    const modes = (exam.modes || []).map(function (mode) {
      return '<button type="button" class="btn ' + (mode.id === 'full' ? 'btn-primary' : 'btn-secondary') + ' btn-small" data-action="start-true-exam" data-exam-id="' + esc(exam.id) + '" data-mode="' + esc(mode.id) + '">' + esc(mode.label) + ' · ' + esc(mode.minutes) + ' 分 ' + ICONS.arrow + '</button>';
    }).join('');
    const audio = exam.audioPath
      ? '<a class="text-link-button" href="' + esc(exam.audioPath) + '" target="_blank" rel="noopener">真实听力音频</a>'
      : '<span class="text-link-button muted-link">无本套音频</span>';
    const answer = '';
    return '<article class="online-exam-card' + (exam.onlineKind === 'reading' ? ' reading-only' : '') + '">' +
      '<div class="online-card-top"><span class="online-year">' + esc(exam.year) + '</span><span class="badge ' + (exam.onlineKind === 'full' ? 'badge-green' : 'badge-soft') + '">' + (exam.onlineKind === 'full' ? '整卷可做' : '阅读可做') + '</span><span class="badge badge-outline">第 ' + esc(exam.set) + ' 套</span><span class="online-done ' + (status === '已做' ? 'done' : status === '有错题' ? 'wrong' : '') + '">' + status + '</span></div>' +
      '<h3>' + esc(exam.title) + '</h3>' +
      '<p class="online-card-meta">' + (exam.onlineKind === 'full' ? '1–55 客观题 · 含听力' : '26–55 客观题 · 只阅读') + ' · ' + (exam.audioPath ? '真实原音频' : '无音频，不冒充听力') + ' · 答案非官方</p>' +
      '<div class="online-card-actions">' + modes + '</div>' +
      '<div class="online-card-links"><a class="text-link-button" href="' + esc(exam.paperPath) + '" target="_blank" rel="noopener">打开原卷 PDF ' + ICONS.arrow + '</a>' + audio + answer + '</div>' +
      (last ? '<p class="online-card-record">上次：' + esc(last.modeLabel || '') + ' · ' + last.correct + '/' + last.total + ' · ' + esc(Store.formatDateCN(last.ts)) + '</p>' : '') +
    '</article>';
  }

  function renderOnlineExamsHTML() {
    const exams = trueExams().slice().sort(function (a, b) { return b.year.localeCompare(a.year) || a.set - b.set; });
    return '<section class="panel online-exams-panel"><div class="panel-topline"><div><span class="section-kicker">在线可作答</span><h2>真题套卷</h2><p class="panel-sub">' + exams.length + ' 套已接入。先选套卷；整卷、听力、阅读按你的时间进入。无音频的套卷只开放阅读，不拿合成语音凑数。</p></div><span class="panel-meta">答案在交卷后显示</span></div>' +
      '<div class="online-exam-grid">' + exams.map(function (e) { return onlineExamCardHTML(e, Store.state.trueExamRecords || []); }).join('') + '</div></section>';
  }

  function libraryStatusLabel(row) {
    if (row.onlineKind === 'full') return { text: '已接入 · 整卷', tone: 'good' };
    if (row.onlineKind === 'reading') return { text: '已接入 · 阅读', tone: 'good' };
    if (row.papers && row.answers) return { text: '原件可开 · 未接在线', tone: 'muted' };
    if (row.papers) return { text: '缺答案/解析', tone: 'warn' };
    return { text: '缺原卷', tone: 'bad' };
  }

  function librarySetMatches(row, filter) {
    if (row.level !== filter.level) return false;
    if (filter.year !== 'all' && row.ym !== filter.year) return false;
    if (filter.status === 'online') return !!row.onlineKind;
    if (filter.status === 'online-full') return row.onlineKind === 'full';
    if (filter.status === 'online-reading') return row.onlineKind === 'reading';
    if (filter.status === 'files-only') return row.status === 'files-only';
    if (filter.status === 'missing') return (row.missing || []).length > 0;
    if (filter.status === 'scanned') return row.scannedPapers > 0;
    return true;
  }

  function libraryFileGroupsHTML(row) {
    const groups = { paper: [], answer: [], audio: [], transcript: [], other: [] };
    (row.fileDetails || []).forEach(function (f) {
      const k = groups[f.kind] ? f.kind : 'other';
      groups[k].push(f);
    });
    return ['paper','answer','audio','transcript','other'].filter(function (k) { return groups[k].length; }).map(function (k) {
      return '<div class="lib-file-group"><b>' + libraryKindLabel(k) + '</b><div>' + groups[k].map(libraryFileLinkHTML).join('') + '</div></div>';
    }).join('');
  }

  function libraryRowHTML(row) {
    const st = libraryStatusLabel(row);
    const shared2026 = row.level === 'CET4' && row.ym === '2026.06' && row.onlineKind;
    const missingList = (row.missing || []).filter(function (m) { return !(shared2026 && m.indexOf('答案/解析缺失') !== -1); });
    const answerDisplay = row.answers || (shared2026 ? '共用' : 0);
    const keysDisplay = row.hasKeys || row.onlineKind ? '已提取答案' : '未提取答案';
    const onlineButtons = row.onlineKind
      ? (row.onlineKind === 'full'
        ? '<button type="button" class="btn btn-primary btn-small" data-action="start-true-exam" data-exam-id="' + esc(row.examId) + '" data-mode="full">整卷</button><button type="button" class="btn btn-secondary btn-small" data-action="start-true-exam" data-exam-id="' + esc(row.examId) + '" data-mode="listening">听力</button><button type="button" class="btn btn-secondary btn-small" data-action="start-true-exam" data-exam-id="' + esc(row.examId) + '" data-mode="reading">阅读</button>'
        : '<button type="button" class="btn btn-primary btn-small" data-action="start-true-exam" data-exam-id="' + esc(row.examId) + '" data-mode="reading">阅读 40 分</button>')
      : '<span class="lib-no-online">只可打开原件</span>';
    return '<article class="library-row">' +
      '<div class="library-row-main"><div class="library-row-title"><b>' + esc(row.ym) + ' · ' + esc(row.displaySet) + '</b><span class="library-level">' + (row.level === 'CET4' ? '四级' : '六级') + '</span><span class="lib-status ' + st.tone + '">' + st.text + '</span>' + (row.scannedPapers ? '<span class="lib-status warn">扫描件待OCR</span>' : '') + '</div>' +
        '<p>' + row.files + ' 个文件 · 原卷 ' + row.papers + ' · 答案 ' + answerDisplay + ' · 音频 ' + row.audios + ' · ' + keysDisplay + (shared2026 ? ' · 2026三套共用校对版答案' : '') + '</p>' + (missingList.length ? '<span class="lib-missing">缺：' + esc(missingList.join('、')) + '</span>' : '') +
        '<details class="library-files"><summary>查看这套的文件（' + row.files + '）</summary><div class="lib-file-groups">' + libraryFileGroupsHTML(row) + '</div></details>' +
      '</div><div class="library-row-actions">' + onlineButtons + '</div></article>';
  }

  function renderLibraryHTML() {
    const lib = libraryData();
    if (!lib) return '';
    if (!view.libraryFilter) view.libraryFilter = { level: 'CET4', year: 'all', status: 'all' };
    const f = view.libraryFilter;
    const allRows = lib.sets || [];
    const years = Array.from(new Set(allRows.filter(function (r) { return r.level === f.level; }).map(function (r) { return r.ym; }))).sort().reverse();
    if (f.year !== 'all' && years.indexOf(f.year) === -1) f.year = 'all';
    const rows = allRows.filter(function (r) { return librarySetMatches(r, f); }).sort(function (a, b) { return b.ym.localeCompare(a.ym) || a.set - b.set; });
    return '<details class="panel library-inventory" open><summary><span class="section-kicker">完整清单</span> <b>本地真题资料库</b> <em>' + allRows.length + ' 组 / ' + (lib.summary.totalFiles || 455) + ' 个文件</em> <span class="library-summary-note">四级/六级分开 · 扫描件、缺答案、缺音频都明示</span></summary>' +
      '<div class="library-summary"><b>四级</b><span>' + lib.summary.cet4.files + ' 文件 / ' + lib.summary.cet4.groups + ' 组</span><span>在线 ' + (lib.summary.cet4.onlineFull + lib.summary.cet4.onlineReading) + ' 套</span><span>扫描件 ' + lib.summary.cet4.scanned + '</span><span>缺独立答案 ' + Math.max(0, lib.summary.cet4.missingAnswer - 3) + ' 组（2026共用3）</span><span>缺音频 ' + lib.summary.cet4.missingAudio + ' 组</span><span>重复文件 ' + lib.summary.cet4.duplicateFiles + '</span></div>' +
      '<div class="library-summary"><b>六级</b><span>' + lib.summary.cet6.files + ' 文件 / ' + lib.summary.cet6.groups + ' 组</span><span>在线 ' + (lib.summary.cet6.onlineFull + lib.summary.cet6.onlineReading) + ' 套</span><span>扫描件 ' + lib.summary.cet6.scanned + '</span><span>缺答案 ' + lib.summary.cet6.missingAnswer + ' 组</span><span>缺音频 ' + lib.summary.cet6.missingAudio + ' 组</span><span>重复文件 ' + lib.summary.cet6.duplicateFiles + '</span></div>' +
      '<p class="library-explain">扫描件先保留 PDF 可读，不把 OCR 猜测写成题目；没有答案/音频的套卷不会显示为“可在线”。同名文件按 SHA-256 去重；未标套的文件归入“未标套/合集”。</p>' +
      '<div class="library-controls"><label>级别<select data-library-filter="level"><option value="CET4"' + (f.level === 'CET4' ? ' selected' : '') + '>四级</option><option value="CET6"' + (f.level === 'CET6' ? ' selected' : '') + '>六级</option></select></label>' +
      '<label>年份<select data-library-filter="year"><option value="all">全部</option>' + years.map(function (y) { return '<option value="' + y + '"' + (f.year === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></label>' +
      '<label>状态<select data-library-filter="status"><option value="all"' + (f.status === 'all' ? ' selected' : '') + '>全部</option><option value="online"' + (f.status === 'online' ? ' selected' : '') + '>已在线</option><option value="online-full"' + (f.status === 'online-full' ? ' selected' : '') + '>整卷可做</option><option value="online-reading"' + (f.status === 'online-reading' ? ' selected' : '') + '>阅读可做</option><option value="files-only"' + (f.status === 'files-only' ? ' selected' : '') + '>仅原件（有卷有答案）</option><option value="missing"' + (f.status === 'missing' ? ' selected' : '') + '>材料有缺失</option><option value="scanned"' + (f.status === 'scanned' ? ' selected' : '') + '>扫描件待OCR</option></select></label><span class="library-filter-count">' + rows.length + ' 组</span><a class="text-link-button" href="assets/library-manifest.json" download>下载完整清单 JSON</a></div>' +
      (rows.length ? '<div class="library-rows">' + rows.map(libraryRowHTML).join('') + '</div>' : '<p class="inline-note">这个筛选下没有资料。</p>') +
      ((lib.supplemental && lib.supplemental.length) ? '<div class="library-supplemental"><b>翻译 / 写作资料</b><span>这些是补充材料，不冒充四级套卷，也不进入真题频次统计。</span>' + lib.supplemental.map(libraryFileLinkHTML).join('') + '</div>' : '') +
    '</details>';
  }

  function renderTrueProgressHTML(exams, records) {
    const doneIds = new Set((records || []).map(function (r) { return r.examId; }).filter(Boolean));
    const done = exams.filter(function (e) { return doneIds.has(e.id); }).length;
    const latest = records && records.length ? records[records.length - 1] : null;
    if (!latest) {
      return '<section class="true-progress-strip"><div><span class="section-kicker">我的状态</span><h2>还没做在线真题</h2><p>在线套卷 ' + exams.length + ' 套，已做 0 套。先选一套阅读（40 分钟）或整卷；做完才有薄弱项和下一步。</p></div><button type="button" class="btn btn-primary" data-action="start-true-exam" data-exam-id="' + esc(exams[0] ? exams[0].id : '') + '" data-mode="reading">先做一套阅读 ' + ICONS.arrow + '</button></section>';
    }
    let weak = null;
    if (latest.sectionScores && latest.sectionScores.length) {
      weak = latest.sectionScores.slice().sort(function (a, b) { return (a.correct / a.total) - (b.correct / b.total); })[0];
    }
    const next = weak && weak.correct < weak.total
      ? '先做错题重练（' + (latest.wrongQuestions || []).length + ' 题），再补 ' + weak.label + '。'
      : '这次分项没有明显失分；换一套没做过的套卷检验。';
    return '<section class="true-progress-strip"><div><span class="section-kicker">我的状态</span><h2>已做 ' + done + ' / ' + exams.length + ' 套 · 未做 ' + Math.max(0, exams.length - done) + ' 套</h2><p>最近：' + esc(latest.examTitle || '真题') + ' · ' + esc(latest.modeLabel || '') + ' · ' + latest.correct + '/' + latest.total + (weak ? '；最低分项 ' + esc(weak.label) + ' ' + weak.correct + '/' + weak.total : '') + '。' + next + ' 不把一次成绩预测成考试分数。</p></div>' + ((latest.wrongQuestions || []).length ? '<button type="button" class="btn btn-secondary btn-small" data-action="retry-true-record" data-record-id="' + esc(latest.id) + '">错题重练 ' + latest.wrongQuestions.length + '</button>' : '<span class="true-progress-badge">下一步</span>') + '</section>';
  }

  function keySourceLabel(exam) {
    if (!exam) return '11 套在线真题：2024.06/2024.12/2025.06/2025.12 的 codeload KEYS 表，以及 2026.06 校对版 Markdown';
    if (exam.year === '2026.06') return '2026年6月四级参考答案（卷面对照校对版）.md';
    return 'cet4_' + exam.year.replace('.', '_') + '_' + exam.set + '.pdf 的 KEYS 表';
  }

  function scoringMethodHTML(exam, compact) {
    const scope = exam ? ('本套 ' + (exam.objectiveCount || '') + ' 道客观题') : '在线套卷';
    const source = keySourceLabel(exam);
    return '<details class="scoring-method"' + (compact ? '' : ' open') + '><summary>评分依据：客观题只数正确，写译不计分</summary>' +
      '<div class="scoring-grid"><div><b>客观题公式</b><p>' + esc(scope) + '，每题 1 分：正确题数 ÷ 客观题总数。未答在错题表里列为“未填”，不另扣分；没有加权、没有负分、不换算 710。</p></div>' +
      '<div><b>答案来源</b><p>' + esc(source) + '。答案来自第三方整理/校对，不是官方答案；没有用官方原卷逐套复核。</p></div>' +
      '<div><b>题号核验</b><p>整卷按 1–25 听力、26–35 选词、36–45 匹配、46–55 仔细阅读映射；答案表按顺序解析。2024.06 和 2024.12 阅读 C 的 46–55 共 20 题逐题手写并对照原卷页码/答案表；其他套卷没有逐题人工核对题干与选项。</p></div>' +
      '<div><b>写作 / 翻译</b><p>不计分，也没有官方或 AI 分数。只运行本地拼写/语法规则和关键词覆盖；覆盖数不是分数，不能证明译文或作文达标，最终靠自评和参考答案。</p></div></div>' +
      '<p class="scoring-note">所以页面里的 36/55、18/25、8/10 都只是“答对几个”，不是四级成绩；一次结果不预测考试分数。</p></details>';
  }

  const REAL_TOPIC_LABELS = { psychology: '心理', science: '科学', life: '生活/自然', society: '社会' };

  function readingPassageSets() {
    const out = [];
    (window.CET4ReadingBanks || []).forEach(function (bank) {
      (bank.paragraphs || []).forEach(function (p) {
        const qs = (bank.questions || []).filter(function (q) { return q.passageId === p.id; });
        if (qs.length) out.push({ bank: bank, passage: p, questions: qs, topic: (qs[0] && qs[0].topic) || 'other' });
      });
    });
    return out;
  }

  function startReadingPassage(bankId, passageId, mode) {
    rememberTrueScroll();

    const bank = (window.CET4ReadingBanks || []).find(function (b) { return b.id === bankId; });
    if (!bank) { toast('题组不存在。', 'warn'); return; }
    const passage = (bank.paragraphs || []).find(function (p) { return p.id === passageId; });
    const qs = (bank.questions || []).filter(function (q) { return q.passageId === passageId; });
    if (!passage || !qs.length) { toast('这篇材料不存在。', 'warn'); return; }
    const set = {
      id: 'passage-' + bank.id + '-' + passageId,
      title: bank.shortTitle + ' · ' + passage.label,
      source: bank.source + ' · ' + passage.label,
      sourceLabel: '真题 · 单篇精练 · 第三方答案 + AI补充解析',
      level: '真题 · 单篇阅读',
      estimatedMinutes: 9,
      isReal: true,
      examMeta: bank.examMeta,
      paragraphs: [passage],
      questions: qs
    };
    startReadingSession(set, { mode: mode === 'timed' ? 'timed' : 'practice', from: 'exam' });
  }

  function readingBankStats(bank) {
    const ids = new Set((bank.questions || []).map(function (q) { return q.id; }));
    const attempts = (Store.state.realTraining.attempts || []).filter(function (a) { return ids.has(a.questionId); });
    const first = attempts.filter(function (a) { return a.isFirst; });
    return {
      attempted: new Set(attempts.map(function (a) { return a.questionId; })).size,
      firstAttempts: first.length,
      firstCorrect: first.filter(function (a) { return a.correct; }).length,
      firstWrong: first.filter(function (a) { return !a.correct; }).length,
      total: (bank.questions || []).length
    };
  }

  function startReadingBank(bankId, mode) {
    rememberTrueScroll();
    const bank = (window.CET4ReadingBanks || []).find(function (b) { return b.id === bankId; });
    if (!bank) { toast('这组阅读题不存在。', 'warn'); return; }
    const set = {
      id: 'bank-' + bank.id,
      title: bank.title,
      source: bank.source,
      sourceLabel: '真题 · 第三方答案 + AI补充解析',
      level: '真题 · 仔细阅读',
      estimatedMinutes: 15,
      isReal: true,
      examMeta: bank.examMeta,
      paragraphs: bank.paragraphs,
      questions: bank.questions
    };
    startReadingSession(set, { mode: mode === 'timed' ? 'timed' : 'practice', from: 'exam' });
  }

  function renderReadingBankPanelHTML() {
    const banks = window.CET4ReadingBanks || [];
    const total = banks.reduce(function (n, b) { return n + (b.questions || []).length; }, 0);
    const verifiedTotal = banks.reduce(function (n, b) { return n + (b.questions || []).filter(function (q) { return q.verified; }).length; }, 0);
    const answerTotal = banks.reduce(function (n, b) { return n + (b.questions || []).filter(function (q) { return q.answerVerified || q.verified; }).length; }, 0);
    const pendingTotal = banks.reduce(function (n, b) { return n + (b.questions || []).filter(function (q) { return q.analysisPending; }).length; }, 0);
    return '<section id="reading-bank-panel" class="panel reading-bank-panel"><div class="panel-topline"><div><span class="section-kicker">按题型 · 先做完整一组</span><h2>仔细阅读题库</h2><p class="panel-sub">文章和题目已经结构化；' + banks.length + ' 组 / ' + total + ' 题。答案已核验的题先上线作答判分，详细依据和解析标“待补”。</p></div><span class="panel-meta">答案提交后显示</span></div>' +
      '<div class="bank-summary"><div><b>' + banks.length + '</b><span>已整理题组</span></div><div><b>' + total + '</b><span>可做题数</span></div><div><b>' + answerTotal + '</b><span>答案表已对号</span><em>不等于逐题原文复核</em></div><div><b>' + pendingTotal + '</b><span>详细解析待补</span><em>' + (total - pendingTotal) + ' 题已有依据/标签</em></div></div>' + '<p class="bank-batch-note">本批新增 13 组 / 130 题：2024.06 第2/3套、2024.12 第2/3套、2025.06 第1/2/3套、2025.12 第1/2/3套、2026.06 第1/2/3套。答案来自原卷 KEYS 或既有第三方答案表；详细依据和考点标签仍在分批补。听力 5 套 / 125 题可做（真实 MP3、选项和答案），但题干在录音中，原文/分段仍为 0；选词填空 10 套 / 100 空、长篇匹配 10 套 / 100 题、写作/翻译各 5 道真题已接入。</p>' +
      '<div class="bank-type-tabs"><button type="button" class="bank-type active" data-action="jump-type-panel" data-panel="reading-bank-panel">仔细阅读 <b>' + total + '</b></button><button type="button" class="bank-type" data-action="jump-type-panel" data-panel="listening-panel">听力 <em>125 题 · 5 套</em></button><button type="button" class="bank-type" data-action="jump-type-panel" data-panel="fill-panel">选词填空 <em>100 空 · 10 套</em></button><button type="button" class="bank-type" data-action="jump-type-panel" data-panel="match-panel">长篇匹配 <em>100 题</em></button><button type="button" class="bank-type" data-action="jump-type-panel" data-panel="output-panel">写作 / 翻译 <em>各 5 道</em></button></div>' +
      '<div class="reading-bank-grid">' + banks.map(function (bank) {
        const st = readingBankStats(bank);
        const verifiedCount = (bank.questions || []).filter(function (q) { return q.verified; }).length;
        const answerCount = (bank.questions || []).filter(function (q) { return q.answerVerified || q.verified; }).length;
        const verifyLabel = bank.analysisPending ? '答案表已对号 ' + answerCount + ' / ' + (bank.questions || []).length + ' · 解析待补' : (bank.aiAssisted ? '答案对号 + AI 辅助解析 ' + verifiedCount + ' / ' + (bank.questions || []).length : '已核验 ' + verifiedCount + ' / ' + (bank.questions || []).length + ' 题');
        return '<article class="reading-bank-card"><div class="reading-bank-top"><span class="badge badge-green">仔细阅读</span><span class="bank-year">' + esc(bank.year) + ' · 第 ' + bank.set + ' 套</span><span class="bank-paper-tag">2 篇 / 10 题</span><span class="bank-verified">' + esc(verifyLabel) + '</span></div>' +
          '<h3>' + esc(bank.title) + '</h3><p>' + esc(bank.source) + '</p>' +
          '<div class="bank-stats"><span>已做 <b>' + st.attempted + ' / ' + st.total + '</b></span><span>首次正确 <b>' + (st.firstAttempts ? st.firstCorrect + ' / ' + st.firstAttempts : '—') + '</b></span><span>错题 <b>' + st.firstWrong + '</b></span></div>' +
          '<div class="reading-bank-actions"><button type="button" class="btn btn-primary btn-small" data-action="start-reading-bank" data-bank-id="' + esc(bank.id) + '" data-mode="practice">开始整组 ' + ICONS.arrow + '</button><button type="button" class="btn btn-secondary btn-small" data-action="start-reading-bank" data-bank-id="' + esc(bank.id) + '" data-mode="timed">连续 15 分钟</button>' + (bank.paragraphs || []).map(function (p) {
            return '<button type="button" class="text-link-button" data-action="start-reading-passage" data-bank-id="' + esc(bank.id) + '" data-passage-id="' + esc(p.id) + '" data-mode="practice">' + esc(p.label) + ' 5题</button>';
          }).join('') + '<a class="text-link-button" href="' + esc(bank.examMeta.paperFile) + '" target="_blank" rel="noopener">看原卷 PDF</a></div>' +
          '<p class="bank-note">' + (bank.analysisPending ? '题干/选项/文章：原卷；答案：原卷 KEYS 页，已核验；详细原文依据和解析待补。' : '题干/选项/文章：原卷；答案：第三方答案表；解析：AI 补充（非官方）。') + '</p></article>';
      }).join('') + '</div>' +
      '<p class="bank-disabled-note">本批只完成仔细阅读；听力/选词/匹配/写作/翻译的资料仍在清单中，尚未逐题整理，不混进可练题库。</p></section>';
  }

  function allRealQuestions() {
    const out = [];
    (window.CET4ReadingBanks || []).forEach(function (bank) {
      (bank.questions || []).forEach(function (q) { out.push({ bank: bank, question: q }); });
    });
    return out;
  }

  function findRealQuestion(questionId) {
    const hit = allRealQuestions().find(function (x) { return x.question.id === questionId; });
    return hit || null;
  }

  function realArticleSeen(question) {
    const bank = (window.CET4ReadingBanks || []).find(function (b) { return b.id === question.bankId; });
    if (!bank) return false;
    const state = realTrainingState().state || {};
    return (bank.questions || []).some(function (q) {
      return q.passageId === question.passageId && state[q.id] && state[q.id].attempts > 0;
    });
  }

  function realReasonMatchReasons(original, candidate, reasons) {
    const labels = [];
    const origTags = original.tags || {};
    const tags = candidate.tags || {};
    if (origTags.skill === tags.skill) labels.push('同具体考点');
    const diffOverlap = (origTags.difficulty || []).filter(function (x) { return (tags.difficulty || []).indexOf(x) !== -1; });
    const distOverlap = (origTags.distractors || []).filter(function (x) { return (tags.distractors || []).indexOf(x) !== -1; });
    reasons.forEach(function (r) {
      if ((r === 'synonym_miss' || r === 'paraphrase_miss') && (tags.difficulty || []).indexOf('synonym') !== -1) labels.push('同义替换');
      if ((r === 'synonym_miss' || r === 'paraphrase_miss') && (tags.difficulty || []).indexOf('paraphrase') !== -1) labels.push('释义改写');
      if (r === 'inference_error' && tags.skill === 'inference') labels.push('推断题');
      if (r === 'syntax' && (tags.difficulty || []).indexOf('long_sentence') !== -1) labels.push('长句结构');
      if (r === 'no_evidence' && /detail|cause|result/.test(tags.skill || '')) labels.push('定位/因果');
      if (r === 'distractor' && distOverlap.length) labels.push('同类干扰项');
    });
    labels.push.apply(labels, diffOverlap.map(function (x) { return '难点:' + x; }));
    labels.push.apply(labels, distOverlap.map(function (x) { return '干扰:' + x; }));
    return Array.from(new Set(labels));
  }

  function realRecommendations(error) {
    const original = error && error.question;
    const qid = original && (original.sourceQuestionId || (original.questionKey ? original.questionKey.split(':').pop() : null));
    const found = qid ? findRealQuestion(qid) : null;
    const reasons = (error && error.reasons || []).filter(Boolean);
    if (!found) return { needsReason: false, items: [], noOriginal: true };
    if (!reasons.length) return { needsReason: true, items: [] };
    if (reasons.every(function (r) { return r === 'word_unknown' || r === 'context_meaning'; })) {
      return { needsVocab: true, items: [], bank: found.bank, original: found.question };
    }
    if (reasons.every(function (r) { return r === 'time_short'; })) {
      return { needsTime: true, items: [], bank: found.bank, original: found.question };
    }
    const origQ = found.question;
    if (origQ.analysisPending) return { analysisPending: true, items: [], original: origQ, bank: found.bank };
    const all = allRealQuestions().filter(function (x) { return x.question.id !== origQ.id && !x.question.analysisPending; });
    const state = realTrainingState().state || {};
    const scored = all.map(function (x) {
      const q = x.question;
      const labels = realReasonMatchReasons(origQ, q, reasons);
      const sameSkill = q.tags && origQ.tags && q.tags.skill === origQ.tags.skill;
      const diffOverlap = (origQ.tags.difficulty || []).filter(function (t) { return (q.tags.difficulty || []).indexOf(t) !== -1; }).length;
      const distOverlap = (origQ.tags.distractors || []).filter(function (t) { return (q.tags.distractors || []).indexOf(t) !== -1; }).length;
      const attempted = !!(state[q.id] && state[q.id].attempts);
      const seen = realArticleSeen(q);
      let score = 0;
      if (sameSkill) score += 6;
      if (reasons.indexOf('synonym_miss') !== -1 || reasons.indexOf('paraphrase_miss') !== -1) score += diffOverlap * 2;
      if (reasons.indexOf('inference_error') !== -1 && q.tags.skill === 'inference') score += 4;
      if (reasons.indexOf('syntax') !== -1 && (q.tags.difficulty || []).indexOf('long_sentence') !== -1) score += 4;
      if (reasons.indexOf('distractor') !== -1) score += distOverlap * 2;
      if (reasons.indexOf('no_evidence') !== -1 && sameSkill) score += 3;
      if (x.bank.year !== found.bank.year || x.bank.set !== found.bank.set) score += 2;
      if (attempted) score -= 8;
      if (seen) score -= 3;
      return { bank: x.bank, question: q, score: score, sameSkill: sameSkill, attempted: attempted, seen: seen, labels: labels, diffOverlap: diffOverlap, distOverlap: distOverlap };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score || (a.attempted ? 1 : 0) - (b.attempted ? 1 : 0); });
    const exact = scored.filter(function (x) { return x.sameSkill; });
    return { needsReason: false, items: scored.slice(0, 4), exactItems: exact.slice(0, 3), original: origQ, bank: found.bank };
  }

  function transferFromRecommendation(item) {
    if (!item) return null;
    const q = item.question;
    const passage = (item.bank.paragraphs || []).find(function (p) { return p.id === q.passageId; });
    return {
      id: 'transfer:' + q.id,
      title: '同类真题 · ' + item.bank.year + ' 第' + item.bank.set + '套 · 第' + q.number + '题',
      stem: q.stem,
      options: q.options.slice(),
      answer: q.answer,
      explain: q.explain,
      passage: passage ? (passage.sentences || []).map(function (s) { return s.text; }) : [],
      sourceLabel: item.bank.year + ' 第' + item.bank.set + '套阅读 C · 同类补练',
      analysisSource: q.analysisSource || 'AI 补充解析（非官方）'
    };
  }

  function updateRealTransfer(error) {
    if (!error || !error.question || !error.question.isReal) return;
    const rec = realRecommendations(error);
    const top = (rec.exactItems || []).find(function (x) { return !x.attempted && !x.seen; }) || null;
    error.transfer = top ? transferFromRecommendation(top) : null;
    Store.save();
  }

  function realRecommendationPanel(error) {
    if (!error || !error.question || !error.question.isReal) return '';
    const rec = realRecommendations(error);
    if (rec.noOriginal) return '';
    if (rec.needsReason) {
      return '<div class="real-recommend-box needs-reason"><b>先确认这题为什么错</b><p>点上面的错因后，才会从其他年份/套卷找同类真题；不根据一次错题替你猜。</p></div>';
    }
    if (rec.analysisPending) {
      return '<div class="real-recommend-box needs-reason"><b>这题只有答案，详细解析/标签待补</b><p>先不拿它做“同考点”匹配；可以继续做同组题，等标签补齐后再精准补练。</p></div>';
    }
    if (rec.needsVocab) {
      return '<div class="real-recommend-box needs-reason"><b>先处理词，不要急着再刷阅读</b><p>这道题你确认的是词汇/语境义问题。先把本句关键词收进真题词本，再回来换题；不要用更多阅读题掩盖词义缺口。</p><button type="button" class="btn btn-secondary btn-small" data-nav="train">打开真题词本 ' + ICONS.arrow + '</button></div>';
    }
    if (rec.needsTime) {
      return '<div class="real-recommend-box needs-reason"><b>先练时间，不是再加题量</b><p>你确认的是时间不够。建议先做这一组连续 15 分钟，交卷后看每题用时；不要逐题看解析拖长节奏。</p><button type="button" class="btn btn-secondary btn-small" data-action="start-reading-bank" data-bank-id="' + esc(rec.bank.id) + '" data-mode="timed">连续 15 分钟 ' + ICONS.arrow + '</button></div>';
    }
    if (!rec.items.length) {
      return '<div class="real-recommend-box"><b>本批没有足够匹配的同类真题</b><p>已按考点、难点和干扰方式筛选，不拿原创题凑数。当前可练题组只有 2 组/20 题；需要继续补题才能形成同考点换题。</p></div>';
    }
    const hasExact = rec.exactItems.length > 0;
    return '<div class="real-recommend-box"><div class="real-recommend-head"><b>' + (hasExact ? '找到同具体考点的真题' : '没有同主考点，只有相近难点') + '</b><span>按你的错因匹配</span></div>' +
      '<p class="real-recommend-note">' + (hasExact ? '优先跨套、未做；文章是否已见单独标出。一次换题做对只代表本次通过，不直接宣布掌握。' : '下面不是“同考点”，只作为同解题难点的替代；不冒充针对性补练。') + '</p>' +
      rec.items.map(function (x) {
        const q = x.question;
        return '<div class="real-recommend-row"><div><b>' + esc(x.bank.year) + ' · 第' + x.bank.set + '套 · 第' + q.number + '题</b><span>' + esc(q.stem) + '</span><small>' + esc(x.labels.join(' / ')) + (x.attempted ? ' · 已做过' : ' · 未做') + (x.seen ? ' · 文章已见' : ' · 文章未见') + '</small></div><button type="button" class="btn btn-secondary btn-small" data-action="start-real-recommendation" data-question-id="' + esc(q.id) + '">练这道</button></div>';
      }).join('') + '</div>';
  }

  function trueListeningSets() {
    return Array.isArray(window.CET4ListeningSets) ? window.CET4ListeningSets : [];
  }

  function startTrueListening(setId, mode) {
    rememberTrueScroll();

    const set = trueListeningSets().find(function (x) { return x.id === setId; });
    if (!set) { toast('这套听力材料不存在。', 'warn'); return; }
    const m = mode === 'mock' ? 'mock' : mode === 'check' ? 'check' : 'practice';
    view.session = {
      type: 'true-listening', set: set, mode: m, from: 'exam',
      phase: m === 'mock' ? 'preflight' : 'exam',
      groupIndex: 0, answers: {}, flags: {}, result: null,
      startedAt: Date.now(),
      deadline: m === 'check' ? Date.now() + 25 * 60 * 1000 : null,
      finishedAt: null
    };
    stopSpeech();
    render();
  }

  function trueListeningGroupRanges(set) {
    if (set.groups && set.groups.length) return set.groups;
    const out = [];
    for (let i = 0; i < 25; i += 5) out.push({ label: '原卷题组 · ' + (i + 1) + '–' + Math.min(25, i + 5) + ' 题', from: i + 1, to: Math.min(25, i + 5) });
    return out;
  }

  function trueListeningGroupHTML(s) {
    const groups = trueListeningGroupRanges(s.set);
    const gi = Math.max(0, Math.min(s.groupIndex || 0, groups.length - 1));
    const g = groups[gi];
    const qs = (s.set.questions || []).filter(function (q) { return q.number >= g.from && q.number <= g.to; });
    const qnav = (s.set.questions || []).map(function (q) {
      const answered = s.answers[q.number] !== undefined;
      const flagged = !!s.flags[q.number];
      return '<button type="button" class="tl-qnav-btn' + (answered ? ' is-answered' : '') + (flagged ? ' is-flagged' : '') + '" data-action="tl-jump" data-number="' + q.number + '" title="第 ' + q.number + ' 题">' + q.number + '</button>';
    }).join('');
    const cards = qs.map(function (q) {
      return '<section class="true-listen-q" id="tl-q-' + q.number + '"><div class="true-listen-qhead"><b>第 ' + q.number + ' 题</b><span>题干在录音中 · 原卷只印选项</span><button type="button" class="tl-flag' + (s.flags[q.number] ? ' is-on' : '') + '" data-action="tl-flag" data-number="' + q.number + '">' + (s.flags[q.number] ? '已标记' : '标记') + '</button></div>' + radioOptions('tl-' + q.number, q.options, { selected: s.answers[q.number] }) + '</section>';
    }).join('');
    return '<div class="true-listen-group-head"><div><span class="section-kicker">原卷题组 · 音频分段未核验</span><h2>' + esc(g.label) + '</h2></div><div class="true-listen-group-nav"><button type="button" class="btn btn-quiet btn-small" data-action="tl-prev"' + (gi === 0 ? ' disabled' : '') + '>上一组</button><span>' + (gi + 1) + ' / ' + groups.length + '</span><button type="button" class="btn btn-quiet btn-small" data-action="tl-next"' + (gi === groups.length - 1 ? ' disabled' : '') + '>下一组</button></div></div>' +
      '<div class="true-listen-qnav">' + qnav + '</div>' +
      '<p class="inline-note">绿色=已答，橙色=标记，灰色=未答。切组不会打断音频，也不会自动跳题。</p>' +
      '<div class="true-listen-group-cards">' + cards + '</div>';
  }

  function updateTrueListeningGroup() {
    const s = view.session;
    if (!s || s.type !== 'true-listening') return;
    const box = document.getElementById('true-listen-dynamic');
    if (box) box.innerHTML = trueListeningGroupHTML(s);
  }

  function syncTrueListeningNav() {
    const s = view.session;
    if (!s || s.type !== 'true-listening') return;
    document.querySelectorAll('.tl-qnav-btn').forEach(function (el) {
      const n = Number(el.getAttribute('data-number'));
      el.classList.toggle('is-answered', s.answers[n] !== undefined);
      el.classList.toggle('is-flagged', !!s.flags[n]);
    });
    document.querySelectorAll('.tl-flag').forEach(function (el) {
      const n = Number(el.getAttribute('data-number'));
      el.classList.toggle('is-on', !!s.flags[n]);
      el.textContent = s.flags[n] ? '已标记' : '标记';
    });
  }

  function startMockListening() {
    const s = view.session;
    if (!s || s.type !== 'true-listening' || s.mode !== 'mock' || s.phase !== 'preflight') return;
    s.phase = 'exam';
    s.startedAt = Date.now();
    s.deadline = Date.now() + 25 * 60 * 1000;
    render();
    const a = document.getElementById('tl-audio');
    if (a) a.play().catch(function () { toast('浏览器阻止了自动播放，请点一次播放。', 'warn'); });
  }

  function renderTrueListeningSession(s) {
    if (s.phase === 'result' && s.result) return renderTrueListeningResult(s);
    const set = s.set;
    const practice = s.mode === 'practice';
    const mock = s.mode === 'mock';
    if (s.phase === 'preflight') {
      const body = '<div class="study-card true-listen-card"><div class="study-progress-line"><span>' + esc(set.source) + '</span><span>模拟考试 · 开始前检查声音</span></div><h1>' + esc(set.shortTitle) + ' · 模拟考试</h1><p class="lead">先确认电脑/耳机能播放声音，再进入模拟。开始后整段录音连续播放，不显示答案、原文或问题文本，不能拖动或重听。</p>' +
        (set.audioPath ? '<div class="true-audio-panel"><div><b>声音检查</b><span>试听本套真实录音；确认有声音后再开始</span></div><audio controls preload="metadata" src="' + esc(set.audioPath) + '"></audio></div>' : '<p class="inline-note warn">这套没有可播放音频，不能用文字稿冒充听力。</p>') +
        '<div class="notice-box warn"><strong>结构核验，不是音频内容听校</strong><p>文件存在、原卷 25 题选项、答案表已对齐；' + (listeningTranscriptData(set.id) ? '这套有 OCR+ASR 的复盘候选，但尚未逐句人工核验；' : '这套没有经核验的原文/分段；') + '模拟入口标为“结构核验”，不把未听校说成完全匹配。</p></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="start-mock-listening"' + (set.audioPath ? '' : ' disabled') + '>声音已确认，开始模拟 ' + ICONS.arrow + '</button><button type="button" class="btn btn-quiet" data-action="exit-session">先不开始</button></div>' +
        '<p class="source-note">模拟题面只保留原卷选项；题干在录音中，原文/翻译/答案不会提前显示。</p></div>';
      renderSessionShell(s, { title: set.shortTitle + ' · 听力模拟', kicker: '真题听力 · 开始前检查', body: body });
      return;
    }
    const audio = set.audioPath ? '<audio id="tl-audio" preload="metadata" src="' + esc(set.audioPath) + '"' + (mock ? '' : ' controls') + '></audio>' : '';
    const body = '<div class="study-card true-listen-card"><div class="study-progress-line"><span>' + esc(set.source) + '</span><span>' + (mock ? '模拟考试 · 连续播放' : practice ? '练习模式 · 可重听' : '检验模式 · 25 分钟') + '</span></div>' +
      '<div class="study-title-block"><div><h1>' + esc(set.shortTitle) + ' · 听力 25 题</h1><p>' + (mock ? '模拟进行中：音频从头连续播放，不显示答案。' : '按原卷题组切换；音频不会因切题中断。') + '</p></div><div class="source-badges"><span class="badge badge-green">真题</span><span class="badge badge-outline">真实 MP3</span><span class="badge badge-soft">结构核验</span></div></div>' +
      '<div class="true-audio-panel' + (mock ? ' mock-audio' : '') + '"><div><b>真题听力录音</b><span>' + (mock ? '模拟模式：连续播放，隐藏进度/重播' : '练习/检验：可播放；切题不打断') + '</span></div>' + audio + '</div>' +
      '<p class="inline-note">题干只在录音中播放，原卷没有文字题干；本题组提供选项、真实录音和答案。没有经核验的原文/分段，复盘只能重听整段。</p>' +
      '<form id="true-listening-form" class="question-form"><div id="true-listen-dynamic">' + trueListeningGroupHTML(s) + '</div><div class="form-actions"><button type="submit" class="btn btn-primary">' + (mock ? '交卷并核对答案' : '提交并核对答案') + ' ' + ICONS.arrow + '</button><span class="form-hint">提交前不判对错；已答/未答/标记在题号导航显示。</span></div></form>' +
      '<p class="source-note">选项来自原卷；答案来自第三方答案表，非官方；文件/题号/答案结构对齐，但音频内容未逐题人工听校；没有原文，不把“答案对”说成“精听通过”。</p></div>';
    renderSessionShell(s, { title: set.shortTitle + ' · 听力', kicker: mock ? '真题听力 · 模拟' : '真题听力 · 整套练习', body: body });
    if (mock) {
      setTimeout(function () {
        const a = document.getElementById('tl-audio');
        if (a) a.play().catch(function () { toast('浏览器阻止了自动播放，请点一次播放。', 'warn'); });
      }, 150);
    }
  }

  function submitTrueListening(form) {
    const s = view.session;
    if (!s || s.type !== 'true-listening' || s.phase !== 'exam') return;
    const details = [];
    let correct = 0;
    s.set.questions.forEach(function (q) {
      const selected = s.answers[q.number] === undefined ? null : Number(s.answers[q.number]);
      const ok = selected === q.answer;
      if (ok) correct += 1;
      details.push({ number: q.number, selected: selected, answer: q.answer, correct: ok, options: q.options });
    });
    s.result = { correct: correct, total: s.set.questions.length, details: details, duration: Math.round((Date.now() - s.startedAt) / 1000), mode: s.mode };
    s.phase = 'result';
    s.finishedAt = Date.now();
    const rt = realTrainingState();
    if (!Array.isArray(rt.listeningAttempts)) rt.listeningAttempts = [];
    rt.listeningAttempts.push({
      setId: s.set.id, title: s.set.shortTitle, mode: s.mode,
      correct: correct, total: s.set.questions.length,
      answers: details.map(function (x) { return x.selected; }),
      at: new Date().toISOString()
    });
    Store.save();
    render();
  }

  function listeningTranscriptData(setId) {
    return (window.CET4ListeningTranscripts || []).find(function (x) { return x.setId === setId; }) || null;
  }

  function listeningGroupForNumber(data, number) {
    return data && data.groups ? data.groups.find(function (g) { return number >= g.from && number <= g.to; }) : null;
  }

  function listeningReviewPanelHTML(set) {
    const data = listeningTranscriptData(set.id);
    if (!data) return '<p class="inline-note">这套还没有经核验的原文/分段时间；不能精准跳到错题，只能重听整段。</p>';
    return '<div class="tl-review-box"><div class="panel-topline"><div><span class="section-kicker">复盘 · 按题组</span><h2>点错题或题组，跳到对应录音</h2></div><span class="panel-meta">自动转写候选</span></div><div class="tl-review-groups">' + data.groups.map(function (g, i) {
      return '<button type="button" class="tl-review-group" data-action="tl-review-group" data-index="' + i + '"><b>' + esc(g.label) + '</b><span>' + g.from + '–' + g.to + ' 题 · ' + Math.round(g.start) + '–' + Math.round(g.end) + ' 秒</span></button>';
    }).join('') + '</div><div id="tl-transcript-panel" class="tl-transcript-panel"></div><p class="source-note">' + esc(data.alignment) + ' 原文参照 OCR 页；自动转写/对齐尚未逐句人工核验，不当作官方原文。</p></div>';
  }

  function playListeningReview(groupIndex, number) {
    const s = view.session;
    if (!s || s.type !== 'true-listening' || !s.set) return;
    const data = listeningTranscriptData(s.set.id);
    if (!data) { toast('这套没有可用的片段/原文。', 'warn'); return; }
    const g = number ? listeningGroupForNumber(data, number) : data.groups[groupIndex];
    if (!g) { toast('找不到对应片段。', 'warn'); return; }
    const audio = document.getElementById('tl-review-audio');
    if (audio) {
      try { audio.currentTime = g.start; audio.play().catch(function () {}); } catch (err) {}
    }
    const panel = document.getElementById('tl-transcript-panel');
    if (panel) {
      panel.innerHTML = '<div class="tl-transcript-head"><b>' + esc(g.label) + ' · ' + g.from + '–' + g.to + ' 题</b><span>播放 ' + Math.round(g.start) + '–' + Math.round(g.end) + ' 秒</span></div><p class="tl-transcript">' + esc(g.transcript) + '</p><div class="tl-keyterms"><b>关键表达</b>' + (g.keyTerms || []).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div><p class="source-note">' + esc(g.transcriptSource) + ' · OCR 参照页 ' + (g.ocrPages || []).join('、') + '。可能含转写错误，需对照录音。</p>';
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function renderTrueListeningResult(s) {
    const r = s.result;
    const hasReview = !!listeningTranscriptData(s.set.id);
    const next = r.correct === r.total ? '全对' : (hasReview ? '点错题或题组可跳到对应片段；原文是 OCR 参照 + ASR 候选，尚未逐句人工核验。' : '先看错题的正确答案，再重听整段；这套没有可用原文/分段。');
    const body = '<div class="study-card true-listen-result"><div class="study-progress-line"><span>' + esc(s.set.source) + '</span><span>已提交</span></div><h1>听力结果：' + r.correct + ' / ' + r.total + '</h1><p class="lead">' + esc(next) + ' 本次只记录选项作答；题干和原文仍待补，不能据此宣布“听力已掌握”。</p>' +
      (s.set.audioPath ? '<div class="true-audio-panel"><div><b>复盘重听</b><span>点击下方错题/题组可跳到对应片段；没有核验的套卷只能重听整段</span></div><audio id="tl-review-audio" controls preload="metadata" src="' + esc(s.set.audioPath) + '"></audio></div>' : '') +
      '<div class="summary-stats"><div><b>' + r.correct + ' / ' + r.total + '</b><span>答案正确</span></div><div><b>' + (r.mode === 'practice' ? '练习' : '检验') + '</b><span>模式</span></div><div><b>' + formatClock(r.duration) + '</b><span>用时</span></div></div>' +
      '<div class="true-listen-results">' + r.details.map(function (x) {
        return '<div class="true-listen-result-row ' + (x.correct ? 'is-good' : 'is-bad') + ' is-clickable" role="button" tabindex="0" data-action="tl-review-question" data-number="' + x.number + '"><b>' + x.number + '</b><span>' + (x.correct ? '正确' : '错') + '</span><em>你选：' + (x.selected === null ? '未作答' : optionLetters(x.selected) + '. ' + esc(x.options[x.selected])) + ' · 答案：' + optionLetters(x.answer) + '. ' + esc(x.options[x.answer]) + '</em><span class="tl-review-hint">复盘</span></div>';
      }).join('') + '</div>' +
      listeningReviewPanelHTML(s.set) +
      '<p class="source-note">答案来自第三方答案表；选项来自原卷；自动转写/对齐未逐句人工核验。答对不等于能在陌生录音里稳定听懂。</p>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="exit-session">今天到这里</button><button type="button" class="btn btn-secondary" data-action="restart-true-listening" data-set-id="' + esc(s.set.id) + '" data-mode="' + esc(s.mode) + '">再听一遍</button><a class="text-link-button" href="' + esc(s.set.paperPath) + '" target="_blank" rel="noopener">看原卷 PDF</a></div></div>';
    renderSessionShell(s, { title: s.set.shortTitle + ' · 听力结果', kicker: '真题听力 · 答案已提交', body: body });
  }

  function renderTrueListeningPanelHTML() {
    const sets = trueListeningSets();
    if (!sets.length) return '';
    return '<section id="listening-panel" class="panel true-listening-panel"><div class="panel-topline"><div><span class="section-kicker">听力 · 整套真实录音</span><h2>听力题组</h2><p class="panel-sub">5 套 / 125 题：选项和答案已对齐，真实 MP3 可播放。2024.12 第2套已有 OCR+ASR 的复盘候选（题组片段/原文/关键表达）；其余 4 套仍只能整段重听。</p></div><span class="panel-meta">先整套，后分段</span></div><div class="true-listen-grid">' + sets.map(function (set) {
      return '<article class="true-listen-set"><div class="true-listen-set-top"><b>' + esc(set.shortTitle) + '</b><span>25 题</span></div><p>' + esc(set.source) + '</p><div class="true-listen-set-actions"><button type="button" class="btn btn-primary btn-small" data-action="start-true-listening" data-set-id="' + esc(set.id) + '" data-mode="practice">练习 · 可重听</button><button type="button" class="btn btn-secondary btn-small" data-action="start-true-listening" data-set-id="' + esc(set.id) + '" data-mode="check">检验 · 25 分钟</button><button type="button" class="btn btn-quiet btn-small" data-action="start-true-listening" data-set-id="' + esc(set.id) + '" data-mode="mock">模拟 · 连续播放</button><a class="text-link-button" href="' + esc(set.paperPath) + '" target="_blank" rel="noopener">原卷</a></div></article>';
    }).join('') + '</div></section>';
  }

  function fillSets() {
    return Array.isArray(window.CET4FillSets) ? window.CET4FillSets : [];
  }

  function startFillSession(setId) {
    rememberTrueScroll();

    const set = fillSets().find(function (x) { return x.id === setId; });
    if (!set) { toast('这套选词填空不存在。', 'warn'); return; }
    view.session = { type: 'fill', set: set, from: 'exam', phase: 'exam', answers: {}, startedAt: Date.now(), finishedAt: null };
    render();
  }

  function renderFillSession(s) {
    if (s.phase === 'result') return renderFillResult(s);
    const set = s.set;
    const article = esc(set.article).replace(/_{2,}\s*(2[6-9]|3[0-5])\s*_{2,}/g, function (m, n) { return '<mark class="fill-blank">' + n + '</mark>'; });
    const bank = '<div class="fill-bank">' + set.wordBank.map(function (w) { return '<span><b>' + w.letter + '</b> ' + esc(w.word) + '</span>'; }).join('') + '</div>';
    const selects = Array.from({ length: 10 }, function (_, i) {
      const n = 26 + i;
      return '<label class="fill-select-line"><span>第 ' + n + ' 题</span><select name="fill-' + n + '"><option value="">—</option>' + set.wordBank.map(function (w) { return '<option value="' + w.letter + '">' + w.letter + '. ' + esc(w.word) + '</option>'; }).join('') + '</select></label>';
    }).join('');
    const body = '<div class="study-card fill-card"><div class="study-progress-line"><span>' + esc(set.source) + '</span><span>10 空 · 15 词库</span></div><h1>' + esc(set.title) + '</h1>' +
      '<div class="fill-article">' + article + '</div>' + bank +
      '<form id="fill-form" class="question-form"><div class="fill-select-grid">' + selects + '</div><div class="form-actions"><button type="submit" class="btn btn-primary">提交并核对 ' + ICONS.arrow + '</button><span class="form-hint">提交前不显示答案；词库每个词最多用一次。</span></div></form>' +
      '<p class="source-note">文章/词库来自原卷；答案来自原卷 KEYS 或第三方答案表；详细词义/搭配解析待补，不把答案对号说成精讲。</p></div>';
    renderSessionShell(s, { title: set.title, kicker: '真题 · 选词填空', body: body });
  }

  function submitFillSession(form) {
    const s = view.session;
    if (!s || s.type !== 'fill' || s.phase !== 'exam') return;
    const fd = new FormData(form);
    const details = [];
    let correct = 0;
    for (let n = 26; n <= 35; n += 1) {
      const raw = fd.get('fill-' + n);
      const selected = raw ? String(raw) : null;
      const answer = s.set.answers[String(n)];
      const ok = selected === answer;
      if (ok) correct += 1;
      details.push({ number: n, selected: selected, answer: answer, correct: ok });
    }
    s.result = { correct: correct, total: 10, details: details, duration: Math.round((Date.now() - s.startedAt) / 1000) };
    s.phase = 'result';
    s.finishedAt = Date.now();
    const rt = realTrainingState();
    if (!Array.isArray(rt.fillAttempts)) rt.fillAttempts = [];
    rt.fillAttempts.push({ setId: s.set.id, title: s.set.title, correct: correct, total: 10, at: new Date().toISOString() });
    Store.save();
    render();
  }

  function renderFillResult(s) {
    const r = s.result;
    const body = '<div class="study-card fill-card"><div class="study-progress-line"><span>' + esc(s.set.source) + '</span><span>已提交</span></div><h1>选词填空：' + r.correct + ' / 10</h1><p class="lead">这是答案核对，不是完整词义/搭配解析。错的空先看正确答案，再回原文判断词性、搭配和句意。</p>' +
      '<div class="fill-result-list">' + r.details.map(function (x) {
        const w = s.set.wordBank.find(function (w) { return w.letter === x.answer; });
        const u = s.set.wordBank.find(function (w) { return w.letter === x.selected; });
        return '<div class="fill-result-row ' + (x.correct ? 'is-good' : 'is-bad') + '"><b>' + x.number + '</b><span>' + (x.correct ? '对' : '错') + '</span><em>你选：' + (x.selected || '未答') + (u ? ' ' + esc(u.word) : '') + ' · 答案：' + x.answer + (w ? ' ' + esc(w.word) : '') + '</em></div>';
      }).join('') + '</div>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="exit-session">今天到这里</button><button type="button" class="btn btn-secondary" data-action="restart-fill" data-set-id="' + esc(s.set.id) + '">再做一遍</button></div>' +
      '<p class="source-note">答案来自第三方答案表，非官方；详细解析待补。一次答案核对不等于掌握。</p></div>';
    renderSessionShell(s, { title: s.set.title, kicker: '真题 · 选词填空结果', body: body });
  }

  function renderFillPanelHTML() {
    const sets = fillSets();
    if (!sets.length) return '';
    return '<section id="fill-panel" class="panel fill-panel"><div class="panel-topline"><div><span class="section-kicker">选词填空 · 原卷结构</span><h2>选词填空</h2><p class="panel-sub">10 套 / 100 空：文章、15 词库、10 空和答案已结构化；可直接选择、提交、判分。详细词义解析待补。</p></div><span class="panel-meta">10 空 / 套</span></div><div class="fill-grid">' + sets.map(function (set) {
      return '<article class="fill-set"><div><b>' + esc(set.title) + '</b><span>10 空 · 15 词库</span></div><button type="button" class="btn btn-secondary btn-small" data-action="start-fill" data-set-id="' + esc(set.id) + '">开始 ' + ICONS.arrow + '</button></article>';
    }).join('') + '</div></section>';
  }

  function outputTasks(kind) {
    return (Array.isArray(window.CET4OutputTasks) ? window.CET4OutputTasks : []).filter(function (x) { return x.kind === kind; });
  }

  function startOutputTask(kind, taskId) {
    rememberTrueScroll();

    const tasks = outputTasks(kind);
    if (!tasks.length) { toast('没有可用的写作/翻译题目。', 'warn'); return; }
    const rt = realTrainingState();
    const task = tasks.find(function (x) { return x.id === taskId; }) || tasks.find(function (x) { return !(rt.outputDrafts && rt.outputDrafts[x.id]); }) || tasks[0];
    view.session = {
      type: 'output', task: task, kind: kind, from: 'exam', phase: 'edit',
      text: (rt.outputDrafts && rt.outputDrafts[task.id]) || '', startedAt: Date.now(), result: null
    };
    render();
  }

  function saveOutputDraft() {
    const s = view.session;
    if (!s || s.type !== 'output') return;
    const rt = realTrainingState();
    if (!rt.outputDrafts) rt.outputDrafts = {};
    rt.outputDrafts[s.task.id] = s.text || '';
    Store.save();
  }

  function renderOutputSession(s) {
    if (s.phase === 'result') return renderOutputResult(s);
    const writing = s.kind === 'writing';
    const body = '<div class="study-card output-card"><div class="study-progress-line"><span>' + esc(s.task.title) + '</span><span>真题 · 不自动评分</span></div><h1>' + (writing ? '写作' : '翻译') + '真题</h1>' +
      '<div class="output-prompt"><span class="detail-label">题目 / 要求</span><p>' + esc(s.task.prompt) + '</p></div>' +
      '<label class="output-editor-label" for="output-text">' + (writing ? '写在这里（英文，建议 120–180 词）' : '写在这里（中文翻译）') + '</label>' +
      '<textarea id="output-text" class="output-editor" data-output-kind="' + esc(s.kind) + '" placeholder="' + (writing ? '先写观点，再展开理由，最后收束。' : '先理解每个意义块，再组织成通顺中文。') + '">' + esc(s.text || '') + '</textarea>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="submit-output">提交并看自查反馈 ' + ICONS.arrow + '</button><button type="button" class="btn btn-secondary" data-action="save-output-draft">保存草稿</button><a class="text-link-button" href="' + esc(s.task.paperPath) + '" target="_blank" rel="noopener">查看原卷</a></div>' +
      '<p class="source-note">写作/翻译没有本地官方评分器，不显示虚构分数。参考材料和原卷可打开；不要用模板冒充真实作文。</p></div>';
    renderSessionShell(s, { title: s.task.title, kicker: '真题 · 写作/翻译', body: body });
  }

  function submitOutputSession() {
    const s = view.session;
    if (!s || s.type !== 'output') return;
    const text = s.text || '';
    const writing = s.kind === 'writing';
    const words = writing ? (text.match(/[A-Za-z]+(?:['-][A-Za-z]+)?/g) || []).length : 0;
    const chars = !writing ? (text.replace(/\\s/g, '') || '').length : 0;
    const paras = text.split(/\\n\\s*\\n/).filter(function (p) { return p.trim().length; }).length;
    const sentences = (text.match(/[.!?。！？]+/g) || []).length;
    const result = writing
      ? { words: words, paras: paras, sentences: sentences, length: words >= 120 && words <= 180, tooShort: words < 120, tooLong: words > 180 }
      : { chars: chars, paras: paras, sentences: sentences };
    s.result = result;
    s.phase = 'result';
    s.finishedAt = Date.now();
    const rt = realTrainingState();
    if (!rt.outputAttempts) rt.outputAttempts = [];
    if (!rt.outputDrafts) rt.outputDrafts = {};
    rt.outputDrafts[s.task.id] = text;
    rt.outputAttempts.push({ taskId: s.task.id, kind: s.kind, title: s.task.title, words: words, chars: chars, at: new Date().toISOString() });
    Store.save();
    render();
  }

  function renderOutputResult(s) {
    const writing = s.kind === 'writing';
    const r = s.result;
    const body = '<div class="study-card output-card"><div class="study-progress-line"><span>' + esc(s.task.title) + '</span><span>已保存</span></div><h1>' + (writing ? '写作自查' : '翻译自查') + '</h1>' +
      '<div class="summary-stats"><div><b>' + (writing ? r.words + ' 词' : r.chars + ' 字') + '</b><span>' + (writing ? '词数' : '字数') + '</span></div><div><b>' + r.paras + '</b><span>段落</span></div><div><b>' + r.sentences + '</b><span>句数</span></div></div>' +
      (writing ? '<p class="inline-note">' + (r.length ? '长度在 120–180 词训练区间内。' : r.tooShort ? '还不足 120 词；先补理由/例子，不要只凑结论。' : '超过 180 词；先删重复表达，保留清楚的主干。') + ' 这不是评分。</p>' : '<p class="inline-note">中文翻译只看字数和结构，不能自动判断是否完全忠实；请对照原卷和参考材料自评。</p>') +
      '<div class="output-self-check"><b>自查清单</b><ul>' + (writing ? '<li>开头是否明确回应题目？</li><li>每段是否有理由或例子，而不是只重复观点？</li><li>结尾是否收束，不引入新论点？</li><li>是否检查了主谓、时态和拼写？</li>' : '<li>每个意义块是否都译到了？</li><li>主干是否清楚，修饰语是否放对位置？</li><li>是否有漏译、误译或中文不成句？</li><li>专有名词/数字是否保留？</li>') + '</ul></div>' +
      '<p class="source-note">没有官方范文/自动分数。参考材料只提供原卷与答案链接；不把自己的写法说成标准答案。</p>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="exit-session">今天到这里</button><button type="button" class="btn btn-secondary" data-action="edit-output">回去修改</button><a class="text-link-button" href="' + esc(s.task.paperPath) + '" target="_blank" rel="noopener">看原卷</a></div></div>';
    renderSessionShell(s, { title: s.task.title, kicker: '真题 · 自查反馈', body: body });
  }

  function renderOutputPanelHTML() {
    const tasks = Array.isArray(window.CET4OutputTasks) ? window.CET4OutputTasks : [];
    if (!tasks.length) return '';
    return '<section id="output-panel" class="panel output-panel"><div class="panel-topline"><div><span class="section-kicker">写作 / 翻译 · 真题题目</span><h2>输出题</h2><p class="panel-sub">' + tasks.length + ' 道真题题目：可输入、保存草稿、提交自查；没有官方范文和自动评分，不伪造分数。</p></div><span class="panel-meta">不自评分数</span></div><div class="output-grid">' + tasks.map(function (task) {
      return '<article class="output-set"><div><b>' + esc(task.title) + '</b><span>' + (task.kind === 'writing' ? '写作 · 30 分钟' : '翻译 · 30 分钟') + '</span></div><button type="button" class="btn btn-secondary btn-small" data-action="start-output" data-output-kind="' + esc(task.kind) + '" data-task-id="' + esc(task.id) + '">开始</button></article>';
    }).join('') + '</div></section>';
  }

  function matchSets() {
    return Array.isArray(window.CET4MatchSets) ? window.CET4MatchSets : [];
  }

  function startMatchSession(setId) {
    rememberTrueScroll();

    const set = matchSets().find(function (x) { return x.id === setId; });
    if (!set) { toast('这套长篇匹配不存在。', 'warn'); return; }
    view.session = { type: 'match', set: set, from: 'exam', phase: 'exam', answers: {}, startedAt: Date.now(), finishedAt: null };
    render();
  }

  function renderMatchSession(s) {
    if (s.phase === 'result') return renderMatchResult(s);
    const set = s.set;
    const paras = set.paragraphs.map(function (p) {
      return '<section class="match-para"><b>' + esc(p.letter) + '</b><p>' + esc(p.text) + '</p></section>';
    }).join('');
    const letters = set.paragraphs.map(function (p) { return p.letter; });
    const stmts = set.statements.map(function (st) {
      return '<label class="match-line"><span>' + st.number + '.</span><p>' + esc(st.text) + '</p><select name="match-' + st.number + '"><option value="">—</option>' + letters.map(function (l) { return '<option value="' + l + '">' + l + '</option>'; }).join('') + '</select></label>';
    }).join('');
    const body = '<div class="study-card match-card"><div class="study-progress-line"><span>' + esc(set.source) + '</span><span>' + set.paragraphs.length + ' 段 · 10 题</span></div><h1>' + esc(set.title) + '</h1>' +
      '<div class="match-article">' + paras + '</div>' +
      '<form id="match-form" class="question-form"><div class="match-statements">' + stmts + '</div><div class="form-actions"><button type="submit" class="btn btn-primary">提交并核对 ' + ICONS.arrow + '</button><span class="form-hint">段落可重复使用；提交前不显示答案。</span></div></form>' +
      '<p class="source-note">文章段落/题干来自原卷；答案来自原卷 KEYS 或第三方答案表；详细定位解析待补。</p></div>';
    renderSessionShell(s, { title: set.title, kicker: '真题 · 长篇匹配', body: body });
  }

  function submitMatchSession(form) {
    const s = view.session;
    if (!s || s.type !== 'match' || s.phase !== 'exam') return;
    const fd = new FormData(form);
    const details = [];
    let correct = 0;
    s.set.statements.forEach(function (st) {
      const selected = fd.get('match-' + st.number) || null;
      const answer = s.set.answers[String(st.number)];
      const ok = selected === answer;
      if (ok) correct += 1;
      details.push({ number: st.number, selected: selected, answer: answer, correct: ok });
    });
    s.result = { correct: correct, total: 10, details: details, duration: Math.round((Date.now() - s.startedAt) / 1000) };
    s.phase = 'result';
    s.finishedAt = Date.now();
    const rt = realTrainingState();
    if (!Array.isArray(rt.matchAttempts)) rt.matchAttempts = [];
    rt.matchAttempts.push({ setId: s.set.id, title: s.set.title, correct: correct, total: 10, at: new Date().toISOString() });
    Store.save();
    render();
  }

  function renderMatchResult(s) {
    const r = s.result;
    const body = '<div class="study-card match-card"><div class="study-progress-line"><span>' + esc(s.set.source) + '</span><span>已提交</span></div><h1>长篇匹配：' + r.correct + ' / 10</h1><p class="lead">这是答案核对；左侧段落原文仍保留。错题先自己回段落找依据，详细定位解析待补。</p>' +
      '<div class="match-result-list">' + r.details.map(function (x) {
        return '<div class="match-result-row ' + (x.correct ? 'is-good' : 'is-bad') + '"><b>' + x.number + '</b><span>' + (x.correct ? '对' : '错') + '</span><em>你选：' + (x.selected || '未答') + ' · 答案：' + x.answer + '</em></div>';
      }).join('') + '</div><div class="form-actions"><button type="button" class="btn btn-primary" data-action="exit-session">今天到这里</button><button type="button" class="btn btn-secondary" data-action="restart-match" data-set-id="' + esc(s.set.id) + '">再做一遍</button></div><p class="source-note">答案第三方，非官方；一次核对不等于掌握。</p></div>';
    renderSessionShell(s, { title: s.set.title, kicker: '真题 · 长篇匹配结果', body: body });
  }

  function renderMatchPanelHTML() {
    const sets = matchSets();
    if (!sets.length) return '';
    return '<section id="match-panel" class="panel match-panel"><div class="panel-topline"><div><span class="section-kicker">长篇匹配 · 原卷段落</span><h2>长篇匹配</h2><p class="panel-sub">10 套 / 100 题：完整段落、10 条题干和答案已结构化；可选择段落、提交、判分。详细定位解析待补。</p></div><span class="panel-meta">10 题 / 套</span></div><div class="match-grid">' + sets.map(function (set) {
      return '<article class="match-set"><div><b>' + esc(set.title) + '</b><span>' + set.paragraphs.length + ' 段 · 10 题</span></div><button type="button" class="btn btn-secondary btn-small" data-action="start-match" data-set-id="' + esc(set.id) + '">开始 ' + ICONS.arrow + '</button></article>';
    }).join('') + '</div></section>';
  }

  function trueCatalogItems() {
    const items = [];
    const rt = realTrainingState();
    (window.CET4ReadingBanks || []).forEach(function (bank) {
      const st = readingBankStats(bank);
      const y = bank.year.split('.')[0], mo = bank.year.split('.')[1];
      items.push({
        key: 'reading:' + bank.id, type: 'reading', year: y, month: mo, set: bank.set,
        title: bank.title, source: bank.source + ' · 2 篇 / 10 题', count: st.total,
        status: st.attempted === 0 ? 'unstarted' : st.attempted >= st.total ? 'done' : 'inprogress',
        progress: st.attempted, meta: st.attempted + ' / ' + st.total + ' · 首次正确 ' + (st.firstAttempts ? st.firstCorrect + '/' + st.firstAttempts : '—'),
        details: (bank.analysisPending ? '答案表已对号，详细解析待补。' : '已含原文依据/干扰项/词汇/考点标签。') + ' ' + (bank.verificationNote || ''),
        start: '<button type="button" class="btn btn-primary btn-small" data-action="start-reading-bank" data-bank-id="' + esc(bank.id) + '" data-mode="practice">开始</button><button type="button" class="btn btn-quiet btn-small" data-action="start-reading-bank" data-bank-id="' + esc(bank.id) + '" data-mode="timed">限时</button>',
        extra: (bank.paragraphs || []).map(function (p) { return '<button type="button" class="text-link-button" data-action="start-reading-passage" data-bank-id="' + esc(bank.id) + '" data-passage-id="' + esc(p.id) + '" data-mode="practice">' + esc(p.label) + ' 5题</button>'; }).join('')
      });
    });
    (window.CET4ListeningSets || []).forEach(function (set) {
      const tries = (rt.listeningAttempts || []).filter(function (x) { return x.setId === set.id; });
      const paused = rt.pausedListening && rt.pausedListening.setId === set.id;
      items.push({
        key: 'listening:' + set.id, type: 'listening', year: set.year.split('.')[0], month: set.year.split('.')[1], set: set.set,
        title: set.shortTitle + ' · 听力', source: set.source, count: 25,
        status: tries.length ? 'done' : paused ? 'inprogress' : 'unstarted',
        progress: tries.length ? 25 : 0, meta: tries.length ? ('已提交 ' + tries.length + ' 次 · 最近 ' + tries[tries.length - 1].correct + '/25') : '25 题 · 真实 MP3',
        details: '选项来自原卷；答案表已对齐；题干在录音中，原文/分段未核验；模拟入口为结构核验。',
        start: '<button type="button" class="btn btn-primary btn-small" data-action="start-true-listening" data-set-id="' + esc(set.id) + '" data-mode="practice">练习</button><button type="button" class="btn btn-quiet btn-small" data-action="start-true-listening" data-set-id="' + esc(set.id) + '" data-mode="mock">模拟</button>',
        extra: '<a class="text-link-button" href="' + esc(set.paperPath) + '" target="_blank" rel="noopener">原卷</a>'
      });
    });
    (window.CET4FillSets || []).forEach(function (set) {
      const tries = (rt.fillAttempts || []).filter(function (x) { return x.setId === set.id; });
      items.push({
        key: 'fill:' + set.id, type: 'fill', year: set.year.split('.')[0], month: set.year.split('.')[1], set: set.set,
        title: set.title, source: set.source, count: 10,
        status: tries.length ? 'done' : 'unstarted', progress: tries.length ? 10 : 0,
        meta: tries.length ? '最近 ' + tries[tries.length - 1].correct + '/10' : '10 空 · 15 词库',
        details: '文章/词库/答案来自原卷；详细词义和搭配解析待补。',
        start: '<button type="button" class="btn btn-primary btn-small" data-action="start-fill" data-set-id="' + esc(set.id) + '">开始</button>', extra: ''
      });
    });
    (window.CET4MatchSets || []).forEach(function (set) {
      const tries = (rt.matchAttempts || []).filter(function (x) { return x.setId === set.id; });
      items.push({
        key: 'match:' + set.id, type: 'match', year: set.year.split('.')[0], month: set.year.split('.')[1], set: set.set,
        title: set.title, source: set.source, count: 10,
        status: tries.length ? 'done' : 'unstarted', progress: tries.length ? 10 : 0,
        meta: tries.length ? '最近 ' + tries[tries.length - 1].correct + '/10' : '10 题 · ' + set.paragraphs.length + ' 段',
        details: '段落/题干/答案来自原卷；详细定位解析待补。',
        start: '<button type="button" class="btn btn-primary btn-small" data-action="start-match" data-set-id="' + esc(set.id) + '">开始</button>', extra: ''
      });
    });
    (window.CET4OutputTasks || []).forEach(function (task) {
      const done = (rt.outputAttempts || []).some(function (x) { return x.taskId === task.id; });
      const draft = !!(rt.outputDrafts && rt.outputDrafts[task.id]);
      items.push({
        key: 'output:' + task.id, type: task.kind, year: task.year.split('.')[0], month: task.year.split('.')[1], set: task.set,
        title: task.title, source: task.title + ' · 真题题目', count: 1,
        status: done ? 'done' : draft ? 'inprogress' : 'unstarted', progress: done ? 1 : 0,
        meta: done ? '已保存一次 · 无分数' : draft ? '有草稿' : '30 分钟 · 不评分',
        details: '可输入、保存草稿、提交自查；没有官方范文/自动分数。',
        start: '<button type="button" class="btn btn-primary btn-small" data-action="start-output" data-output-kind="' + esc(task.kind) + '" data-task-id="' + esc(task.id) + '">开始</button>', extra: ''
      });
    });
    return items;
  }

  function trueFilterDefaults() {
    if (!view.trueFilter) view.trueFilter = { type: 'reading', year: 'all', month: 'all', set: 'all', status: 'all', page: 1 };
    return view.trueFilter;
  }

  function renderTrueExams() {
    const all = trueCatalogItems();
    const f = trueFilterDefaults();
    const typeCounts = {};
    all.forEach(function (x) { typeCounts[x.type] = (typeCounts[x.type] || 0) + 1; });
    const typeLabels = { reading: '仔细阅读', listening: '听力', fill: '选词填空', match: '长篇匹配', writing: '写作', translation: '翻译' };
    const years = Array.from(new Set(all.map(function (x) { return x.year; }))).sort().reverse();
    const months = Array.from(new Set(all.filter(function (x) { return f.year === 'all' || x.year === f.year; }).map(function (x) { return x.month; }))).sort().reverse();
    const sets = Array.from(new Set(all.filter(function (x) { return (f.year === 'all' || x.year === f.year) && (f.month === 'all' || x.month === f.month); }).map(function (x) { return x.set; }))).sort(function (a, b) { return a - b; });
    let filtered = all.filter(function (x) {
      return (f.type === 'all' || x.type === f.type) &&
        (f.year === 'all' || x.year === f.year) &&
        (f.month === 'all' || x.month === f.month) &&
        (f.set === 'all' || String(x.set) === String(f.set)) &&
        (f.status === 'all' || x.status === f.status);
    });
    filtered.sort(function (a, b) { return b.year.localeCompare(a.year) || b.month.localeCompare(a.month) || b.set - a.set || a.type.localeCompare(b.type); });
    const per = Math.max(3, Math.min(8, Math.floor((window.innerHeight - 470) / 66)));
    const pages = Math.max(1, Math.ceil(filtered.length / per));
    if (f.page > pages) f.page = pages;
    if (f.page < 1) f.page = 1;
    const pageItems = filtered.slice((f.page - 1) * per, f.page * per);
    const countLabel = { all: '全部', unstarted: '未做', inprogress: '进行中', done: '已完成' };
    const paused = realTrainingState().paused;
    const pausedListening = realTrainingState().pausedListening;
    const modeItem = view.modePicker ? all.find(function (x) { return x.key === view.modePicker; }) : null;
    const modeOptions = function (x) {
      if (!x) return '';
      if (x.type === 'reading') {
        const bank = (window.CET4ReadingBanks || []).find(function (b) { return b.id === x.key.slice(8); });
        return (bank ? (bank.paragraphs || []).map(function (p) { return '<button type="button" class="mode-choice" data-action="start-reading-passage" data-bank-id="' + esc(bank.id) + '" data-passage-id="' + esc(p.id) + '" data-mode="practice"><b>' + esc(p.label) + '</b><span>5 题 · 约 9 分钟</span></button>'; }).join('') : '') + '<button type="button" class="mode-choice" data-action="start-reading-bank" data-bank-id="' + esc(x.key.slice(8)) + '" data-mode="practice"><b>整组 10 题</b><span>2 篇 · 约 18 分钟</span></button><button type="button" class="mode-choice" data-action="start-reading-bank" data-bank-id="' + esc(x.key.slice(8)) + '" data-mode="timed"><b>限时整组</b><span>15 分钟 · 提交后看结果</span></button>';
      }
      if (x.type === 'listening') {
        const id = x.key.slice(10);
        return '<button type="button" class="mode-choice" data-action="start-true-listening" data-set-id="' + esc(id) + '" data-mode="practice"><b>练习</b><span>25 题 · 可重听</span></button><button type="button" class="mode-choice" data-action="start-true-listening" data-set-id="' + esc(id) + '" data-mode="check"><b>检验</b><span>25 分钟 · 独立完成</span></button><button type="button" class="mode-choice" data-action="start-true-listening" data-set-id="' + esc(id) + '" data-mode="mock"><b>模拟考试</b><span>连续播放 · 结构核验</span></button>';
      }
      if (x.type === 'fill') return '<button type="button" class="mode-choice" data-action="start-fill" data-set-id="' + esc(x.key.slice(5)) + '"><b>开始选词填空</b><span>10 空 · 约 10 分钟</span></button>';
      if (x.type === 'match') return '<button type="button" class="mode-choice" data-action="start-match" data-set-id="' + esc(x.key.slice(6)) + '"><b>开始长篇匹配</b><span>10 题 · 约 15 分钟</span></button>';
      return '<button type="button" class="mode-choice" data-action="start-output" data-output-kind="' + esc(x.type) + '" data-task-id="' + esc(x.key.slice(x.key.indexOf(':') + 1)) + '"><b>' + (x.type === 'writing' ? '开始写作' : '开始翻译') + '</b><span>30 分钟 · 不评分</span></button>';
    };
    const content = '<div class="page-wrap true-page compact-true"><div class="compact-head"><div><p class="eyebrow">真题 · 先筛选，再开始</p><h1>真题练习</h1><p class="lead">共 ' + all.length + ' 个题组；当前 ' + filtered.length + ' 个；每页 ' + per + ' 个。</p></div><span class="count-bubble">' + filtered.length + '</span></div>' +
      (paused ? '<div class="compact-continue"><span>继续上次阅读：' + esc(paused.title || '') + '</span><button type="button" class="btn btn-primary btn-small" data-action="resume-reading">继续</button></div>' : '') +
      (pausedListening ? '<div class="compact-continue"><span>继续上次听力：' + esc(pausedListening.setId || '') + '</span><button type="button" class="btn btn-primary btn-small" data-action="resume-listening">继续</button></div>' : '') +
      '<div class="true-filter-bar"><div class="true-type-tabs">' + Object.keys(typeLabels).map(function (k) { return '<button type="button" class="true-type-tab ' + (f.type === k ? 'active' : '') + '" data-action="true-filter" data-key="type" data-value="' + k + '">' + typeLabels[k] + ' <b>' + (typeCounts[k] || 0) + '</b></button>'; }).join('') + '</div>' +
      '<div class="true-filter-selects"><label>年份<select data-true-filter="year"><option value="all">全部</option>' + years.map(function (y) { return '<option value="' + y + '"' + (f.year === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></label><label>月份<select data-true-filter="month"><option value="all">全部</option>' + months.map(function (m) { return '<option value="' + m + '"' + (f.month === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label><label>套卷<select data-true-filter="set"><option value="all">全部</option>' + sets.map(function (s) { return '<option value="' + s + '"' + (String(f.set) === String(s) ? ' selected' : '') + '>第 ' + s + ' 套</option>'; }).join('') + '</select></label><label>状态<select data-true-filter="status"><option value="all">全部</option>' + ['unstarted', 'inprogress', 'done'].map(function (s) { return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + countLabel[s] + '</option>'; }).join('') + '</select></label><button type="button" class="text-link-button" data-action="true-filter-reset">清空筛选</button></div></div>' +
      '<div class="compact-list">' + (pageItems.length ? pageItems.map(function (x) {
        return '<article class="compact-row compact-line"><div class="cr-year">' + esc(x.year) + '.' + esc(x.month) + '</div><div class="cr-set">第' + esc(x.set) + '套</div><div class="cr-type">' + esc(typeLabels[x.type]) + ' · ' + x.count + '题</div><div class="cr-progress"><span>' + x.progress + '/' + x.count + '</span><i class="mini-progress"><b style="width:' + Math.round(x.progress / Math.max(1, x.count) * 100) + '%"></b></i><em>' + esc(x.meta) + '</em></div><span class="compact-status ' + esc(x.status) + '">' + esc(countLabel[x.status]) + '</span><button type="button" class="btn btn-primary btn-small cr-start" data-action="open-mode-picker" data-key="' + esc(x.key) + '">' + (x.status === 'inprogress' ? '继续' : '开始') + '</button><details class="compact-details"><summary>详情</summary><p>' + esc(x.details) + '</p><div class="compact-extra">' + (x.extra || '') + (x.type === 'reading' ? '<button type="button" class="text-link-button" data-action="open-mode-picker" data-key="' + esc(x.key) + '">选择单篇/整组/限时</button>' : '') + '</div></details></article>';
      }).join('') : '<div class="empty-inline">这个筛选下没有题组。</div>') + '</div>' +
      '<div class="pagination"><button type="button" class="btn btn-quiet btn-small" data-action="true-page" data-page="' + (f.page - 1) + '"' + (f.page <= 1 ? ' disabled' : '') + '>上一页</button>' + Array.from({ length: pages }, function (_, i) { return i + 1; }).filter(function (p) { return p === 1 || p === pages || Math.abs(p - f.page) <= 1; }).map(function (p, i, arr) { const gap = i > 0 && p - arr[i - 1] > 1; return (gap ? '<span class="page-gap">…</span>' : '') + '<button type="button" class="page-btn ' + (p === f.page ? 'active' : '') + '" data-action="true-page" data-page="' + p + '">' + p + '</button>'; }).join('') + '<button type="button" class="btn btn-quiet btn-small" data-action="true-page" data-page="' + (f.page + 1) + '"' + (f.page >= pages ? ' disabled' : '') + '>下一页</button><span>' + f.page + ' / ' + pages + '</span></div>' +
      '<details class="true-more"><summary>更多资料与官方口径</summary>' + (libraryData() ? '<p class="source-note">本地资料清单：四级 ' + libraryData().summary.cet4.files + ' 文件 / ' + libraryData().summary.cet4.groups + ' 组；六级 ' + libraryData().summary.cet6.files + ' 文件 / ' + libraryData().summary.cet6.groups + ' 组。文件数不等于可练题数。</p>' : '') + '<p class="source-note">答案来自第三方答案表/原卷 KEYS，非官方；未做逐题原文复核的题标“解析待补”。</p><div class="true-more-links"><a class="text-link-button" href="assets/library-manifest.json" download>下载完整资料清单 JSON</a><button type="button" class="text-link-button" data-nav="progress">查看进度</button></div></details>' +
      (modeItem ? '<div class="mode-overlay" data-action="close-mode-picker"><div class="mode-panel" role="dialog" aria-modal="true"><div class="mode-panel-head"><div><span class="section-kicker">选择练习量</span><h2>' + esc(modeItem.title) + '</h2><p>' + esc(modeItem.source) + '</p></div><button type="button" class="text-link-button" data-action="close-mode-picker">关闭</button></div><div class="mode-options">' + modeOptions(modeItem) + '</div><p class="source-note">选择后进入独立作答；返回会保留当前筛选和页码。</p></div></div>' : '') +
      '</div>';
    root.innerHTML = pageShell('exam', content);
    if (view.trueScroll) {
      const y = view.trueScroll;
      view.trueScroll = null;
      setTimeout(function () { window.scrollTo(0, y); }, 0);
    }
  }

  function rememberTrueScroll() {
    if (view.tab === 'exam') view.trueScroll = window.scrollY;
    view.modePicker = null;
  }

  function startTrueExam(examId, modeId, options) {
    options = options || {};
    const exam = trueExamById(examId);
    if (!exam) { toast('真题材料不存在。', 'warn'); return; }
    const mode = trueMode(exam, modeId);
    if (!mode) { toast('这个模式不可用。', 'warn'); return; }
    let retrySections = null;
    let actualMode = mode;
    if (options.retryQuestions && options.retryQuestions.length) {
      retrySections = options.retryQuestions.map(function (qnum) {
        const origin = exam.sections.find(function (sec) { return qnum >= sec.from && qnum <= sec.to; });
        return origin ? { id: 'retry-' + qnum, label: origin.label + ' · 第 ' + qnum + ' 题', from: qnum, to: qnum, optionSet: origin.optionSet, minutes: 0 } : null;
      }).filter(Boolean);
      if (!retrySections.length) { toast('没有可重练的错题。', 'warn'); return; }
      const mins = Math.min(mode.minutes || 40, Math.max(5, Math.ceil(retrySections.length * 1.5)));
      actualMode = Object.assign({}, mode, {
        label: '错题重练',
        minutes: mins,
        description: '只重做上次错/未填的 ' + retrySections.length + ' 题；原卷和原音频保留，交卷再看答案。',
        retry: true
      });
    }
    if (options.untimed) {
      actualMode = Object.assign({}, actualMode, {
        label: '听力练习（可重听，不自动交卷）',
        minutes: '不限时',
        description: '真实录音可重听；不自动交卷，提交后核对答案。本地没有逐段听力原文，不伪造原文或分段。'
      });
    }
    view.session = {
      type: 'true-exam',
      exam: exam,
      mode: actualMode,
      from: 'exam',
      phase: 'exam',
      answers: {},
      sections: retrySections,
      retry: !!retrySections,
      practice: !!options.untimed,
      startedAt: Date.now(),
      deadline: options.untimed ? null : Date.now() + actualMode.minutes * 60 * 1000,
      expired: false,
      result: null,
      finishedAt: null
    };
    stopSpeech();
    render();
  }

  function trueAnswerSheetHTML(exam, mode, overrideSections) {
    const sections = overrideSections || trueSectionsForMode(exam, mode);
    const total = trueAnswerCount(sections);
    return '<section class="study-card answer-sheet-card"><div class="answer-sheet-head"><div><span class="section-kicker">答题卡</span><h2>只填客观题</h2><p>' + esc(mode.description) + '</p></div><div class="answer-sheet-count"><b id="true-answered-count">0 / ' + total + '</b><span>已填</span></div></div>' +
      sections.map(function (section) {
        const options = section.optionSet.split('');
        let cells = '';
        for (let q = section.from; q <= section.to; q += 1) {
          cells += '<label class="answer-cell"><span>' + q + '</span><select data-true-q="' + q + '" data-true-section="' + esc(section.id) + '" aria-label="第 ' + q + ' 题答案"><option value="">—</option>' + options.map(function (letter) { return '<option value="' + letter + '">' + letter + '</option>'; }).join('') + '</select></label>';
        }
        return '<div class="answer-section"><div class="answer-section-head"><h3>' + esc(section.label) + '</h3><span>' + section.from + '–' + section.to + ' 题 · ' + options.length + ' 选</span></div><div class="answer-grid">' + cells + '</div></div>';
      }).join('') +
      '<div class="answer-sheet-actions"><button type="button" class="btn btn-primary" data-action="submit-true-exam">交卷并核对答案 ' + ICONS.arrow + '</button><span class="form-hint">交卷后才显示答案与详细解析链接。</span></div></section>';
  }

  function truePromptsHTML(exam, mode) {
    if (mode.id !== 'full') return '';
    return '<details class="true-prompts in-session"><summary>写作与翻译题面（答案交卷后看）</summary><div><p class="detail-label">Writing · 30 minutes</p><p class="prompt-en">' + esc(exam.writingPrompt) + '</p><p class="detail-label">Translation · 30 minutes</p><p>' + esc(exam.translationPrompt) + '</p><p class="aside-note">写作和翻译请另备纸或在文本工具中完成；本页只计客观题。</p></div></details>';
  }

  function renderTrueExamSession(s) {
    if (s.phase === 'result' || s.result) { renderTrueExamResult(s); return; }
    const exam = s.exam;
    const mode = s.mode;
    const includeAudio = mode.id === 'full' || mode.id === 'listening';
    const body = '<div class="true-session">' +
      '<div class="study-card true-session-card"><div class="true-session-head"><div><div class="true-badge-row"><span class="badge badge-green">真题</span><span class="badge badge-outline">' + esc(exam.year) + ' · 第 ' + esc(exam.set) + ' 套</span><span class="badge badge-soft">答案非官方</span></div><h1>' + esc(exam.title) + '</h1><p>模式：' + esc(mode.label) + ' · ' + (typeof mode.minutes === 'number' ? esc(mode.minutes) + ' 分钟' : esc(mode.minutes)) + '。' + esc(mode.description) + '</p></div><a class="btn btn-secondary" href="' + esc(exam.paperPath) + '" target="_blank" rel="noopener">打开原卷 PDF ' + ICONS.arrow + '</a></div>' +
        (includeAudio ? (exam.audioPath ? '<div class="true-audio-panel"><div><b>真题听力录音</b><span>结构核验：文件/题号/答案对齐；音频内容未逐题听校</span></div><audio controls preload="metadata" src="' + esc(exam.audioPath) + '"></audio></div>' : '<p class="inline-note warn">这套没有可靠配套音频，页面不使用合成语音冒充；只能做阅读。</p>') : '<p class="inline-note">本模式不包含听力。' + (exam.audioPath ? '需要完整套题请选择“整套模考”或“听力 25 分钟”。' : '这套未提供在线听力，只保留阅读；不补合成语音。') + '</p>') +
        '<div class="pdf-panel"><div class="pdf-panel-head"><span>真题原卷（可滚动）</span><a href="' + esc(exam.paperPath) + '" target="_blank" rel="noopener">在新标签打开</a></div><iframe class="pdf-frame" src="' + esc(exam.paperPath) + '" title="真题原卷 PDF"></iframe><p class="source-note">如果内嵌 PDF 无法显示，请用上面的“打开原卷 PDF”。手机建议在新标签中查看。</p></div>' +
        truePromptsHTML(exam, mode) +
        '<p class="source-note">' + esc(exam.sourceNote) + '</p></div>' +
      trueAnswerSheetHTML(exam, mode, s.sections) +
      '<p class="source-note">本页只按第三方答案核对客观题，不把正确题数折算成官方分数。提交后才会出现答案链接。' + (exam.quickAnswerPath && exam.quickAnswerPath.endsWith('.md') ? ' 本套参考答案为 Markdown 校对版，不是官方答案。' : '') + '</p>' +
    '</div>';
    renderSessionShell(s, {
      kicker: '真题 · 非模拟',
      title: '真题模考 · ' + mode.label,
      body: body
    });
    updateTrueAnsweredCount();
  }

  function submitTrueExam(auto) {
    const s = view.session;
    if (!s || s.type !== 'true-exam' || s.phase !== 'exam') return;
    const exam = s.exam;
    const mode = s.mode;
    const sections = s.sections || trueSectionsForMode(exam, mode);
    const total = trueAnswerCount(sections);
    document.querySelectorAll('select[data-true-q]').forEach(function (el) {
      const q = Number(el.getAttribute('data-true-q'));
      if (el.value) s.answers[q] = el.value;
    });
    const answered = Object.keys(s.answers).filter(function (q) {
      const n = Number(q);
      return sections.some(function (sec) { return n >= sec.from && n <= sec.to; });
    }).length;
    if (!auto && answered < total) {
      if (!window.confirm('还有 ' + (total - answered) + ' 题未填，仍要交卷并核对吗？')) return;
    }
    let correct = 0;
    const wrongs = [];
    const sectionScores = sections.map(function (section) {
      let sectionCorrect = 0;
      for (let q = section.from; q <= section.to; q += 1) {
        const mine = s.answers[q] || '';
        const key = exam.keys[String(q)] || '';
        if (mine === key) {
          correct += 1;
          sectionCorrect += 1;
        } else {
          wrongs.push({ q: q, section: section.label, mine: mine, key: key });
        }
      }
      return { id: section.id, label: section.label, correct: sectionCorrect, total: section.to - section.from + 1 };
    });
    const durationSeconds = Math.max(1, Math.round((Date.now() - s.startedAt) / 1000));
    s.result = {
      correct: correct,
      total: total,
      answered: answered,
      wrongs: wrongs,
      sectionScores: sectionScores,
      durationSeconds: durationSeconds,
      autoSubmitted: !!auto
    };
    s.phase = 'result';
    s.finishedAt = Date.now();
    s.deadline = null;
    if (!s.recorded) {
      Store.recordTrueExam({
        examId: exam.id,
        examTitle: exam.title,
        modeId: mode.id,
        modeLabel: mode.label,
        practice: !!s.practice,
        correct: correct,
        total: total,
        answered: answered,
        durationSeconds: durationSeconds,
        sectionScores: sectionScores,
        wrongQuestions: wrongs.map(function (w) { return w.q; })
      });
      s.recorded = true;
    }
    stopSpeech();
    render();
    if (auto) toast('时间到，已自动交卷。答案已生成，不折算官方分数。', 'warn');
  }

  function trueResultTableHTML(result) {
    if (!result.wrongs.length) {
      return '<div class="true-all-correct">全部客观题正确。不要因此断言“考试稳了”；再看用时、写作/翻译和答案 PDF。 </div>';
    }
    return '<div class="true-wrong-table"><div class="true-wrong-head"><span>题号</span><span>部分</span><span>你的答案</span><span>参考答案</span></div>' +
      result.wrongs.map(function (w) {
        return '<div class="true-wrong-row"><b>' + w.q + '</b><span>' + esc(w.section) + '</span><span class="' + (w.mine ? 'text-warn' : 'status-muted') + '">' + esc(w.mine || '未填') + '</span><strong>' + esc(w.key) + '</strong></div>';
      }).join('') + '</div>';
  }

  function trueFullAnswerKeyHTML(exam) {
    const sections = exam.sections || [];
    const minQ = sections.length ? Math.min.apply(null, sections.map(function (s) { return s.from; })) : 1;
    const maxQ = sections.length ? Math.max.apply(null, sections.map(function (s) { return s.to; })) : 55;
    return '<details class="true-key-details"><summary>展开全卷客观题答案（' + minQ + '–' + maxQ + '）</summary><div class="true-key-grid">' + sections.map(function (section) {
      let cells = '';
      for (let q = section.from; q <= section.to; q += 1) {
        cells += '<span><b>' + q + '</b>' + esc(exam.keys[String(q)] || '—') + '</span>';
      }
      return '<div><h4>' + esc(section.label) + '</h4><div>' + cells + '</div></div>';
    }).join('') + '</div></details>';
  }

  function trueNextStepText(sectionScores) {
    const sorted = sectionScores.slice().sort(function (a, b) { return (a.correct / a.total) - (b.correct / b.total); });
    const weak = sorted[0];
    const strong = sorted[sorted.length - 1];
    if (!weak) return '先做完整套，再决定主攻。';
    if (weak.correct < weak.total) {
      return '本套最低的是 ' + weak.label + '（' + weak.correct + '/' + weak.total + '）。下一次先做这一项的错题重练，再补同类题；不要用一次分数预测考试。';
    }
    return '本套分项都正确，接下来做另一套未见卷或限时整套，验证不是记住了答案。';
  }

  function renderTrueExamResult(s) {
    const exam = s.exam;
    const mode = s.mode;
    const r = s.result;
    const body = '<div class="study-card true-result-card"><div class="true-badge-row"><span class="badge badge-green">真题核对</span><span class="badge badge-outline">' + esc(mode.label) + '</span><span class="badge badge-soft">答案非官方</span></div>' +
      '<p class="eyebrow">' + esc(exam.year) + ' · 第 ' + esc(exam.set) + ' 套</p>' +
      '<h1>' + r.correct + ' / ' + r.total + '</h1><p class="lead">这是客观题正确题数，不是官方四级分数，也不换算成 710 分。' + (r.autoSubmitted ? '时间到自动交卷。' : '') + '</p>' +
      '<div class="summary-stats"><div><b>' + r.answered + ' / ' + r.total + '</b><span>已填</span></div><div><b>' + (r.total - r.answered) + '</b><span>未填</span></div><div><b>' + formatClock(r.durationSeconds) + '</b><span>用时</span></div></div>' +
      '<div class="true-section-scores">' + (r.sectionScores || []).map(function (sec) { return '<span><b>' + sec.correct + ' / ' + sec.total + '</b>' + esc(sec.label) + '</span>'; }).join('') + '</div>' +
      (r.sectionScores && r.sectionScores.length ? '<p class="true-next-step"><b>下一步：</b>' + esc(trueNextStepText(r.sectionScores)) + '</p>' : '') +
      scoringMethodHTML(exam, true) +
      '<div class="true-wrong-section"><div class="panel-topline"><div><span class="section-kicker">需要回看原卷</span><h2>错题与未填</h2></div><span class="panel-meta">' + r.wrongs.length + ' 条</span></div>' + trueResultTableHTML(r) + '</div>' +
      '<div class="true-answer-links">' + (exam.quickAnswerPath ? '<a class="btn btn-secondary" href="' + esc(exam.quickAnswerPath) + '" target="_blank" rel="noopener">打开' + (exam.quickAnswerPath.endsWith('.md') ? '参考答案' : '答案/速查') + '</a>' : '') + (exam.detailedAnswerPath ? '<a class="btn btn-secondary" href="' + esc(exam.detailedAnswerPath) + '" target="_blank" rel="noopener">打开详细解析</a>' : '') + '<a class="btn btn-quiet" href="' + esc(exam.sourceUrl) + '" target="_blank" rel="noopener">材料来源</a></div>' +
      (mode.id === 'full' ? '<div class="true-output-note"><h3>写作 / 翻译</h3><p>本页不自动评分，也不冒充 AI 批改。请对照答案 PDF 中的参考范文和译文自评；写作题面和翻译题面已保留在试卷与答案中。</p><p class="aside-note">' + esc(exam.writingNote) + ' ' + esc(exam.translationNote) + '</p></div>' : '') +
      trueFullAnswerKeyHTML(exam) +
      '<p class="source-note">' + esc(exam.sourceNote) + ' 核对后若与官方信息冲突，以官方和原卷为准。</p>' +
      '<div class="summary-actions">' + sessionReturnButton(s) + (r.wrongs.length ? '<button type="button" class="btn btn-secondary" data-action="retry-true-wrongs">错题重练（' + r.wrongs.length + '）</button>' : '') + '<button type="button" class="btn btn-quiet" data-action="retake-true-exam">再练一次</button></div></div>';
    renderSessionShell(s, {
      kicker: '真题 · 结果',
      title: '真题核对',
      body: body
    });
  }


  /* ============================== 作答会话公共层 ============================== */
  function markSessionTask(s) {
    if (s && s.taskId && s.from === 'today') {
      Store.markPlanTaskDone(isoToday(), s.taskId);
    }
  }

  function returnTab(s) {
    if (!s) return 'today';
    if (s.from === 'training') return 'train';
    if (s.from === 'errors') return 'errors';
    if (s.from === 'exam') return 'exam';
    return 'today';
  }
  function returnLabel(s) {
    const tab = returnTab(s);
    return tab === 'train' ? '训练库' : tab === 'errors' ? '错题本' : tab === 'exam' ? '真题库' : '今日计划';
  }

  function renderSessionShell(s, options) {
    options = options || {};
    hideToast();
    const title = options.title || '';
    const kicker = options.kicker || (s.from === 'training' ? '训练库加练' : '今日任务');
    const bodyClass = options.bodyClass || '';
    const timerInitial = s.deadline && s.phase !== 'done' ? '剩余 --:--' : '已用 00:00';
    root.innerHTML = '<div class="study-shell">' +
      '<header class="study-topbar"><button type="button" class="back-link" data-action="exit-session">' + ICONS.back + ' 退出</button>' +
        '<div class="study-context"><span>' + esc(kicker) + '</span><b>' + esc(title) + '</b></div>' +
        ((s.type === 'reading' && s.isReal && s.mode === 'practice' && s.phase === 'question') || (s.type === 'true-listening' && s.mode === 'practice' && s.phase === 'exam') ? '<button type="button" class="session-pause" data-action="pause-session">暂停</button>' : '') +
        '<div class="session-timer' + (s.deadline ? ' is-countdown' : '') + '" id="session-timer">' + timerInitial + '</div>' +
      '</header>' +
      '<main class="study-content ' + esc(bodyClass) + '">' + (options.body || '') + '</main>' +
    '</div>';
    stopTimer();
    mountTimer();
    window.scrollTo(0, 0);
  }

  function mountTimer() {
    stopTimer();
    const s = view.session;
    if (!s) return;
    const el = document.getElementById('session-timer');
    if (!el) return;
    if (s.phase === 'done' || s.finishedAt) {
      el.textContent = '已完成';
      return;
    }
    const startedAt = s.startedAt || Date.now();
    if (s.deadline) {
      const updateCountdown = function () {
        const remaining = Math.max(0, s.deadline - Date.now());
        el.textContent = '剩余 ' + formatClock(remaining / 1000);
        el.classList.toggle('is-urgent', remaining <= 120000);
        if (remaining <= 0 && !s.expired && !s.finishedAt) {
          s.expired = true;
          if (typeof onSessionTimerExpired === 'function') onSessionTimerExpired(s);
        }
      };
      updateCountdown();
      timerHandle = setInterval(updateCountdown, 250);
    } else {
      const updateElapsed = function () {
        el.textContent = '已用 ' + formatClock((Date.now() - startedAt) / 1000);
      };
      updateElapsed();
      timerHandle = setInterval(updateElapsed, 1000);
    }
  }

  function onSessionTimerExpired(s) {
    if (!s || s.phase === 'done' || s.finishedAt) return;
    if (s.type === 'reading' && s.mode === 'timed') {
      finishTimedReading('timeout');
    } else if (s.type === 'true-exam' && s.phase === 'exam') {
      submitTrueExam(true);
    } else if (s.type === 'true-listening' && s.phase === 'exam') {
      submitTrueListening(document.getElementById('true-listening-form'));
    }
  }

  function exitSession() {
    const s = view.session;
    if (!s) { render(); return; }
    const isDone = s.phase === 'done' || s.phase === 'result';
    if (!isDone) {
      const ok = window.confirm('离开后本项不会记为完成，但已经提交的答案和错题会保存。确定离开？');
      if (!ok) return;
    }
    stopSpeech();
    stopTimer();
    view.session = null;
    render();
  }

  function finishSessionTo(tab) {
    stopSpeech();
    stopTimer();
    view.session = null;
    view.tab = tab || 'today';
    render();
  }

  function sessionReturnButton(s) {
    return '<button type="button" class="btn btn-primary" data-action="session-return">返回' + esc(returnLabel(s)) + ' ' + ICONS.arrow + '</button>';
  }

  function summaryErrorLine(s) {
    const count = s.summaryErrors || 0;
    return count ? '<p class="inline-note">本项有 ' + count + ' 道错题已记入错题本，约 10 分钟后可回炉。</p>' : '<p class="inline-note">本项没有新的错题记录。</p>';
  }

  function startTask(taskId) {
    const plan = currentPlan();
    const task = plan.tasks.find(function (t) { return t.id === taskId; });
    if (!task) { toast('这个任务已不在今日计划里，请重新安排。', 'warn'); return; }
    if (task.type === 'review') {
      const views = Store.selectReviewBatch(3);
      if (!views.length) { toast('现在没有到期复习。'); return; }
      startReviewQueue(views, { from: 'today', taskId: 'review' });
      return;
    }
    if (task.type === 'vocab') {
      const ids = (plan.assignment.vocabIds || []);
      const cards = ids.map(function (id) { return Store.findById(Store.content().vocabulary, id); }).filter(Boolean);
      startVocabSession(cards, { from: 'today', taskId: task.id });
      return;
    }
    if (task.type === 'listening') {
      const set = Store.findById(Store.content().listeningSets, task.contentId);
      if (!set) { toast('听力材料不存在。', 'warn'); return; }
      startListeningSession(set, { from: 'today', taskId: task.id });
      return;
    }
    if (task.type === 'reading') {
      const set = Store.findById(Store.content().readingSets, task.contentId);
      if (!set) { toast('阅读材料不存在。', 'warn'); return; }
      startReadingSession(set, { mode: task.timed ? 'timed' : 'practice', from: 'today', taskId: task.id });
      return;
    }
    if (task.type === 'output') {
      if (task.outputKind === 'writing') {
        const writingTask = Store.findById(Store.content().writingTasks, task.contentId);
        if (writingTask) startWritingSession(writingTask, { from: 'today', taskId: task.id });
      } else {
        const translationTask = Store.findById(Store.content().translationTasks, task.contentId);
        if (translationTask) startTranslationSession(translationTask, { from: 'today', taskId: task.id });
      }
    }
  }

  function nextVocabPicker(count) {
    const all = Store.content().vocabulary;
    const seen = Store.state.seenVocab || {};
    const unseen = all.filter(function (v) { return !seen[v.id]; });
    const pool = unseen.length >= count ? unseen : all.slice().sort(function (a, b) {
      return new Date((seen[a.id] && seen[a.id].lastSeenAt) || 0).getTime() - new Date((seen[b.id] && seen[b.id].lastSeenAt) || 0).getTime();
    });
    return pool.slice(0, count);
  }

  function startLibrary(kind) {
    if (kind === 'vocab') {
      const cards = nextVocabPicker(3);
      if (!cards.length) { toast('还没有可用词汇材料。', 'warn'); return; }
      startVocabSession(cards, { from: 'training' });
      return;
    }
    const sets = kind === 'listening' ? Store.content().listeningSets : Store.content().readingSets;
    if (!sets.length) { toast('还没有可用材料，去设置导入。', 'warn'); return; }
    const idx = Store.dayIndex(isoToday()) + Store.state.attempts.length;
    if (kind === 'listening') {
      startListeningSession(sets[idx % sets.length], { from: 'training' });
    } else if (kind === 'reading') {
      startReadingSession(sets[idx % sets.length], { mode: 'practice', from: 'training' });
    } else if (kind === 'timed-reading') {
      startReadingSession(sets[idx % sets.length], { mode: 'timed', from: 'training' });
    } else if (kind === 'writing') {
      const tasks = Store.content().writingTasks;
      if (!tasks.length) { toast('还没有写作材料。', 'warn'); return; }
      startWritingSession(tasks[Store.state.outputSessions.filter(function (x) { return x.module === 'writing'; }).length % tasks.length], { from: 'training' });
    } else if (kind === 'translation') {
      const tasks = Store.content().translationTasks;
      if (!tasks.length) { toast('还没有翻译材料。', 'warn'); return; }
      startTranslationSession(tasks[Store.state.outputSessions.filter(function (x) { return x.module === 'translation'; }).length % tasks.length], { from: 'training' });
    }
  }

  /* ============================== 语境词 ============================== */
  function startVocabSession(cards, options) {
    options = options || {};
    if (!cards || !cards.length) { toast('没有可练的语境词。', 'warn'); return; }
    view.session = {
      type: 'vocab',
      cards: cards,
      from: options.from || 'training',
      taskId: options.taskId || null,
      index: 0,
      phase: 'question',
      selected: null,
      correct: null,
      errorId: null,
      results: [],
      startedAt: Date.now(),
      questionStartedAt: Date.now()
    };
    stopSpeech();
    render();
  }

  function renderVocabSession(s) {
    if (s.phase === 'done') return renderVocabDone(s);
    const card = s.cards[s.index];
    const isFeedback = s.phase === 'feedback';
    let body = '';
    if (!isFeedback) {
      body = '<div class="study-card vocab-card">' +
        '<div class="study-progress-line"><span>语境词 ' + (s.index + 1) + ' / ' + s.cards.length + '</span><span>先判断句中的意思</span></div>' +
        '<div class="word-heading"><div><span class="word-pos">' + esc(card.pos) + '</span><h1>' + esc(card.word) + '</h1></div><div class="word-side"><button type="button" class="icon-button small" data-action="speak-word" data-text="' + esc(card.word) + '" aria-label="朗读单词">' + ICONS.play + '</button><span class="phonetic">' + esc(card.phonetic || '') + '</span></div></div>' +
        '<p class="context-sentence">' + highlightTerm(card.sentence, card.word) + '</p>' +
        (card.sentenceCn ? '<p class="context-translation">' + esc(card.sentenceCn) + '</p>' : '') +
        '<form id="vocab-form" class="question-form"><h2 class="question-title">' + esc(card.question.stem) + '</h2>' + radioOptions('answer', card.question.options, {}) +
          '<div class="form-actions"><button type="submit" class="btn btn-primary">提交答案</button><span class="form-hint">答错会自动进入回炉；答对明天换句复习</span></div>' +
        '</form>' + sourceDisclosure('备考常用词示例 · 原创语境，不是真题频次榜。') +
      '</div>';
    } else {
      const error = s.errorId ? Store.state.errors.find(function (e) { return e.id === s.errorId; }) : null;
      body = '<div class="study-card vocab-card">' +
        '<div class="study-progress-line"><span>语境词 ' + (s.index + 1) + ' / ' + s.cards.length + '</span><span>答案与用法</span></div>' +
        '<div class="answer-banner ' + (s.correct ? 'good' : 'bad') + '">' + (s.correct ? '答对了。' : '这题的意思判断偏了。') + '<span>正确答案：' + optionLetters(card.question.answer) + '</span></div>' +
        '<div class="answer-compare"><span>你的选择：' + esc(card.question.options[s.selected] || '未作答') + '</span><b>正确答案：' + optionLetters(card.question.answer) + ' · ' + esc(card.question.options[card.question.answer]) + '</b></div>' +
        '<div class="word-heading compact"><div><span class="word-pos">' + esc(card.pos) + '</span><h1>' + esc(card.word) + '</h1></div><div class="word-side"><button type="button" class="icon-button small" data-action="speak-word" data-text="' + esc(card.word) + '" aria-label="朗读单词">' + ICONS.play + '</button><span class="phonetic">' + esc(card.phonetic || '') + '</span></div></div>' +
        '<p class="context-sentence small">' + highlightTerm(card.sentence, card.word) + '</p>' +
        '<div class="meaning-lead"><span>在这个句子里</span><strong>' + esc(card.contextMeaning) + '</strong></div>' +
        '<p class="explain">' + esc(card.question.explain) + '</p>' +
        (error ? reasonChips('vocab', error.reasons || [], error.id) : '') +
        '<div class="vocab-detail-grid">' +
          '<div><span class="detail-label">其他常见义</span>' + (card.otherMeanings || []).map(function (x) { return '<p><b>' + esc(x.pos) + '</b> ' + esc(x.meaning) + '</p>'; }).join('') + '</div>' +
          '<div><span class="detail-label">常见搭配</span>' + (card.collocations || []).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>' +
          '<div><span class="detail-label">容易混淆</span><p>' + esc(card.confusion) + '</p></div>' +
          '<div><span class="detail-label">考试里怎么换</span><p>' + esc(card.examLink) + '</p></div>' +
        '</div>' +
        '<div class="example-box"><span class="detail-label">四级难度例句</span><p class="example-en">' + highlightTerm(card.example, card.word) + '</p><p class="example-cn">' + esc(card.exampleCn) + '</p><p class="aside-note">' + esc(card.exampleNote) + '</p></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="vocab-next">' + (s.index + 1 >= s.cards.length ? '完成本项' : '下一个词') + ' ' + ICONS.arrow + '</button>' + (s.correct ? '<span class="form-hint">已安排明天一次换句复习。</span>' : '<span class="form-hint">已加入错题本，可稍后回炉。</span>') + '</div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.materials) + '</p>' +
      '</div>';
    }
    renderSessionShell(s, {
      kicker: s.from === 'training' ? '语境词加练' : '今日 · 回炉与语境',
      title: '先判断词在句中的意思',
      body: body
    });
  }

  function submitVocabForm(form) {
    const s = view.session;
    if (!s || s.type !== 'vocab' || s.phase !== 'question') return;
    const card = s.cards[s.index];
    const fd = new FormData(form);
    if (fd.get('answer') === null) { toast('先选一个答案再提交。', 'warn'); return; }
    const selected = Number(fd.get('answer'));
    const correct = selected === card.question.answer;
    const seconds = Math.max(1, (Date.now() - s.questionStartedAt) / 1000);
    Store.recordAttempt({
      module: 'vocab',
      skill: '语境词义',
      source: 'practice',
      correct: correct,
      seconds: seconds,
      questionId: 'vocab:' + card.id
    });
    if (!correct) {
      const error = Store.recordError({
        kind: 'objective',
        module: 'vocab',
        question: Store.makeVocabQuestion(card),
        userAnswer: selected,
        reasons: ['context_meaning'],
        source: 'practice'
      });
      s.errorId = error.id;
      s.summaryErrors = (s.summaryErrors || 0) + 1;
      Store.recordVocabExposure(card, false);
    } else {
      Store.recordVocabExposure(card, true);
    }
    s.selected = selected;
    s.correct = correct;
    s.results.push({ correct: correct, selected: selected });
    s.phase = 'feedback';
    render();
  }

  function nextVocab() {
    const s = view.session;
    if (!s || s.type !== 'vocab') return;
    if (s.index + 1 < s.cards.length) {
      s.index += 1;
      s.phase = 'question';
      s.selected = null;
      s.correct = null;
      s.errorId = null;
      s.questionStartedAt = Date.now();
      render();
    } else {
      s.phase = 'done';
      s.finishedAt = Date.now();
      markSessionTask(s);
      render();
    }
  }

  function renderVocabDone(s) {
    const correct = s.results.filter(function (r) { return r.correct; }).length;
    const total = s.cards.length;
    const used = formatClock((Date.now() - s.startedAt) / 1000);
    renderSessionShell(s, {
      title: '语境词完成',
      body: '<div class="study-card session-summary"><p class="eyebrow">本项完成</p><h1>语境词不是只看认识。</h1><p class="lead">你现在做的是“在句子里判断意思”。接下来，错词会带着语境回到复习队列，正确项会在明天用新句子再检验。</p>' +
        '<div class="summary-stats"><div><b>' + correct + ' / ' + total + '</b><span>首次判断正确</span></div><div><b>' + used + '</b><span>用时</span></div><div><b>' + (s.summaryErrors || 0) + '</b><span>新增错题</span></div></div>' +
        summaryErrorLine(s) + '<div class="summary-actions">' + sessionReturnButton(s) + '<button type="button" class="btn btn-quiet" data-nav="errors">打开错题本</button></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.score) + '</p></div>'
    });
  }

  /* ============================== 听力 ============================== */
  function startListeningSession(set, options) {
    options = options || {};
    if (!set) { toast('没有听力材料。', 'warn'); return; }
    const mode = options.mode || 'practice';
    view.session = {
      type: 'listening',
      set: set,
      mode: mode,
      from: options.from || 'training',
      taskId: options.taskId || null,
      phase: 'pre',
      answers: [],
      errorIds: {},
      audioFallback: false,
      playing: false,
      plays: 0,
      startedAt: Date.now(),
      answerStartedAt: null,
      summaryErrors: 0
    };
    stopSpeech();
    render();
  }

  function listeningFullParts(set) {
    const parts = [];
    (set.script || []).forEach(function (line) {
      parts.push({ text: line.text, speaker: line.speaker === 'M' ? 'M' : 'W' });
    });
    (set.questions || []).forEach(function (q, i) {
      parts.push({ text: 'Question ' + (i + 1) + '. ' + q.stem, speaker: 'W', rate: 0.87 });
    });
    return parts;
  }

  function preReadOptionsHTML(set) {
    return '<div class="pre-read-grid">' + (set.questions || []).map(function (q, i) {
      return '<div class="pre-read-card"><span class="pre-read-label">第 ' + (i + 1) + ' 题选项</span><ol>' + q.options.map(function (op, oi) {
        return '<li><b>' + optionLetters(oi) + '</b><span>' + esc(op) + '</span></li>';
      }).join('') + '</ol></div>';
    }).join('') + '</div>';
  }

  function listeningTranscriptHTML(set, options) {
    options = options || {};
    return '<div class="transcript-box"><div class="transcript-head"><strong>听力原文</strong>' + (options.note ? '<span>' + esc(options.note) + '</span>' : '') + '</div>' +
      (set.script || []).map(function (line, index) {
        const isEvidence = options.evidenceIndexes && options.evidenceIndexes.indexOf(index) !== -1;
        return '<div class="transcript-line' + (isEvidence ? ' is-evidence' : '') + '"><span class="speaker">' + esc(line.speaker) + '</span><p>' + esc(line.text) + '</p><button type="button" class="mini-play" data-action="play-listening-line" data-index="' + index + '" aria-label="重听这句">' + ICONS.play + '</button></div>';
      }).join('') + '</div>';
  }

  function renderListeningSession(s) {
    if (s.phase === 'done') return renderListeningDone(s);
    if (s.phase === 'pre' || s.phase === 'answer' || s.phase === 'feedback') {
      // handled below
    }
    const set = s.set;
    let body = '<div class="study-card listening-card">' +
      '<div class="study-progress-line"><span>' + esc(set.scenario || '听力') + '</span><span>' + (s.mode === 'timed' ? '检验模式' : '练习模式') + '</span></div>' +
      '<div class="study-title-block"><div><h1>' + esc(set.title) + '</h1><p>' + esc(set.tip || '') + '</p></div><div class="source-badges">' + audioBadge() + '<span class="badge badge-outline">原创模拟 · 非真题</span></div></div>';
    if (s.phase === 'pre') {
      body += '<div class="pre-read-heading"><span class="section-kicker">第 1 步 · 预读</span><h2>先看选项，预判要听什么</h2><p>题目的问题也会在录音里读出。先扫一遍选项中的名词、动作和转折。</p></div>' +
        preReadOptionsHTML(set) +
        '<div class="audio-panel primary-audio"><div class="audio-symbol">' + ICONS.play + '</div><div><h3>播放录音</h3><p>合成语音 · 对话与问题 · 可重复播放</p></div><button type="button" class="btn btn-primary" data-action="listening-play">播放录音</button></div>' +
        '<div class="audio-status" id="listening-audio-status" aria-live="polite"></div>' +
        '<div class="form-actions"><button type="button" class="text-link-button" data-action="listening-fallback">无法播放？用文字稿继续（不计入听力正确率）</button></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.audio) + ' 录音不是官方音色，也不代表真题语速。</p>';
    } else if (s.phase === 'answer') {
      if (s.audioFallback) {
        body += '<div class="notice-box warn"><strong>本次使用文字替代</strong><p>你将看到录音原文。为了不让统计数据失真，这次作答会标记为“文字替代”，不计入听力正确率。</p></div>' + listeningTranscriptHTML(set, { note: '文字替代稿' });
      } else {
        body += '<div class="audio-complete-bar"><span>' + ICONS.check + ' 录音已播完</span><button type="button" class="text-link-button" data-action="listening-play">重听录音</button></div>';
      }
      body += '<form id="listening-form" class="question-form"><div class="question-stack">' + (set.questions || []).map(function (q, i) {
        return '<section class="sub-question"><div class="question-number">第 ' + (i + 1) + ' 题</div><h2 class="question-title">' + esc(q.stem) + '</h2>' + radioOptions('listening-' + i, q.options, {}) + '</section>';
      }).join('') + '</div><div class="form-actions"><button type="submit" class="btn btn-primary">提交本组并查看原文</button><span class="form-hint">提交后才会显示原文、答案依据和解析</span></div></form>' +
        '<p class="source-note">练习模式可以重听；真实考试是一次播放。做题时先抓“谁、做了什么、为什么、接下来做什么”。</p>';
    } else if (s.phase === 'feedback') {
      body += renderListeningFeedback(s);
    }
    body += '</div>';
    renderSessionShell(s, {
      kicker: s.from === 'training' ? '听力加练' : '今日 · 听力',
      title: s.phase === 'pre' ? '先预读，再听' : s.phase === 'answer' ? '作答' : '原文与依据',
      body: body
    });
  }

  function playListeningFull() {
    const s = view.session;
    if (!s || s.type !== 'listening') return;
    if (s.playing) return;
    if (!englishVoices().length) {
      s.audioFallback = true;
      if (s.phase === 'pre') { s.phase = 'answer'; s.answerStartedAt = Date.now(); }
      render();
      toast(speechUnavailableMessage(), 'warn');
      return;
    }
    s.playing = true;
    s.plays = (s.plays || 0) + 1;
    const status = document.getElementById('listening-audio-status');
    if (status) status.textContent = '正在播放…';
    const ok = speakParts(listeningFullParts(s.set), {
      onProgress: function (current, total) {
        if (view.session !== s) return;
        if (status) status.textContent = '正在播放 ' + current + ' / ' + total + '…';
      },
      onDone: function () {
        if (view.session !== s) return;
        s.playing = false;
        if (s.phase === 'pre') {
          s.phase = 'answer';
          s.answerStartedAt = Date.now();
        }
        render();
      },
      onError: function () {
        if (view.session !== s) return;
        s.playing = false;
        s.audioFallback = true;
        if (s.phase === 'pre') s.phase = 'answer';
        s.answerStartedAt = Date.now();
        render();
        toast('播放失败，已切换文字替代。本次不计入听力正确率。', 'warn');
      },
      onUnavailable: function () {
        s.playing = false;
        s.audioFallback = true;
        if (s.phase === 'pre') s.phase = 'answer';
        s.answerStartedAt = Date.now();
        render();
        toast(speechUnavailableMessage(), 'warn');
      }
    });
    if (!ok) {
      s.playing = false;
    }
  }

  function submitListeningForm(form) {
    const s = view.session;
    if (!s || s.type !== 'listening' || s.phase !== 'answer') return;
    const fd = new FormData(form);
    const answers = [];
    for (let i = 0; i < s.set.questions.length; i += 1) {
      const value = fd.get('listening-' + i);
      if (value === null) { toast('第 ' + (i + 1) + ' 题还没选答案。', 'warn'); return; }
      answers[i] = Number(value);
    }
    const secondsEach = Math.max(1, (Date.now() - (s.answerStartedAt || s.startedAt)) / 1000 / s.set.questions.length);
    let correctCount = 0;
    s.set.questions.forEach(function (q, i) {
      const correct = answers[i] === q.answer;
      if (correct) correctCount += 1;
      Store.recordAttempt({
        module: 'listening',
        skill: '听力理解',
        source: s.mode === 'timed' ? 'timed' : 'practice',
        correct: correct,
        seconds: secondsEach,
        questionId: 'listening:' + s.set.id + ':' + q.id,
        modality: s.audioFallback ? 'text-fallback' : 'audio'
      });
      if (!correct) {
        const error = Store.recordError({
          kind: 'objective',
          module: 'listening',
          question: Store.makeListeningQuestion(s.set, q),
          userAnswer: answers[i],
          reasons: ['sound_word'],
          source: 'practice'
        });
        s.errorIds[i] = error.id;
        s.summaryErrors = (s.summaryErrors || 0) + 1;
      }
    });
    s.answers = answers;
    s.correctCount = correctCount;
    s.phase = 'feedback';
    stopSpeech();
    render();
  }

  function renderListeningFeedback(s) {
    const set = s.set;
    const evidenceIndexes = [];
    set.questions.forEach(function (q) { if (q.evidenceIndex != null) evidenceIndexes.push(q.evidenceIndex); });
    const answerCount = s.correctCount || 0;
    return '<div class="feedback-banner ' + (answerCount === set.questions.length ? 'good' : 'mid') + '"><div><span class="feedback-kicker">本组结果</span><b>' + answerCount + ' / ' + set.questions.length + ' 正确</b></div><p>' + (s.audioFallback ? '本次使用了文字替代，正确率不计入进步指标。' : '下面逐题看依据；错题已进入回炉。') + '</p></div>' +
      listeningTranscriptHTML(set, { note: '提交后显示 · Q 依据句已标记', evidenceIndexes: evidenceIndexes }) +
      '<div class="feedback-question-list">' + set.questions.map(function (q, i) {
        const correct = s.answers[i] === q.answer;
        const error = s.errorIds[i] ? Store.state.errors.find(function (e) { return e.id === s.errorIds[i]; }) : null;
        return '<section class="feedback-block ' + (correct ? 'is-good' : 'is-bad') + '"><div class="feedback-block-head"><div><span class="feedback-index">第 ' + (i + 1) + ' 题</span><span class="result-chip">' + (correct ? '正确' : '错') + '</span></div><button type="button" class="text-link-button" data-action="play-listening-line" data-index="' + q.evidenceIndex + '">' + ICONS.play + ' 重听依据句</button></div>' +
          '<h3>' + esc(q.stem) + '</h3>' +
          '<div class="answer-compare"><span>你的选择：' + esc(q.options[s.answers[i]] || '未作答') + '</span><b>正确答案：' + optionLetters(q.answer) + ' · ' + esc(q.options[q.answer]) + '</b></div>' +
          '<p class="explain">' + esc(q.explain) + '</p>' +
          (q.evidenceIndex != null ? '<p class="evidence-line"><span>依据句</span>' + esc(set.script[q.evidenceIndex] ? set.script[q.evidenceIndex].text : '') + '</p>' : '') +
          (q.optionNotes && q.optionNotes.length ? '<div class="option-notes">' + q.optionNotes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>' : '') +
          (!correct && error ? reasonChips('listening', error.reasons || [], error.id) : '') +
          '<p class="source-note">' + esc(Data.DISCLAIMERS.audio) + '</p>' +
        '</section>';
      }).join('') + '</div>' +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="listening-finish">完成本项 ' + ICONS.arrow + '</button></div>' +
      '<div class="mini-tip"><b>区分两种“听不出来”</b><p>单词不认识，和“认识但没听出来”不是同一个问题。错误分类里可以选择；前者补词，后者要跟读和听辨。</p></div>';
  }

  function finishListening() {
    const s = view.session;
    if (!s || s.type !== 'listening') return;
    s.phase = 'done';
    s.finishedAt = Date.now();
    markSessionTask(s);
    render();
  }

  function renderListeningDone(s) {
    const used = formatClock((Date.now() - s.startedAt) / 1000);
    const total = s.set.questions.length;
    const correct = s.correctCount || 0;
    renderSessionShell(s, {
      title: '听力完成',
      body: '<div class="study-card session-summary"><p class="eyebrow">本项完成</p><h1>听力不是“听懂了每个词”。</h1><p class="lead">先抓问题，再抓关键信息，最后识别它和选项之间的同义替换。错句可以回到错题本重听。</p>' +
        '<div class="summary-stats"><div><b>' + correct + ' / ' + total + '</b><span>本组正确</span></div><div><b>' + used + '</b><span>用时</span></div><div><b>' + (s.summaryErrors || 0) + '</b><span>新增错题</span></div></div>' +
        (s.audioFallback ? '<p class="inline-note warn">本次使用文字替代，听力正确率不计入练习统计。建议换一个支持英语语音的浏览器再听一次。</p>' : '') +
        summaryErrorLine(s) + '<div class="summary-actions">' + sessionReturnButton(s) + '<button type="button" class="btn btn-quiet" data-nav="errors">打开错题本</button></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.audio) + ' ' + esc(Data.DISCLAIMERS.score) + '</p></div>'
    });
  }

  /* ============================== 真题逐题训练状态 ============================== */
  const CONFIDENCE_LABELS = { certain: '确定', eliminate: '排除后选', guess: '猜的', unanswered: '未选' };

  function realTrainingState() {
    if (!Store.state.realTraining || typeof Store.state.realTraining !== 'object') {
      Store.state.realTraining = { attempts: [], state: {}, watch: {} };
    }
    if (!Array.isArray(Store.state.realTraining.attempts)) Store.state.realTraining.attempts = [];
    if (!Store.state.realTraining.state || typeof Store.state.realTraining.state !== 'object') Store.state.realTraining.state = {};
    if (!Store.state.realTraining.watch || typeof Store.state.realTraining.watch !== 'object') Store.state.realTraining.watch = {};
    if (!Store.state.realTraining.vocab || typeof Store.state.realTraining.vocab !== 'object') Store.state.realTraining.vocab = {};
    if (!Array.isArray(Store.state.realTraining.listeningAttempts)) Store.state.realTraining.listeningAttempts = [];
    if (!Array.isArray(Store.state.realTraining.fillAttempts)) Store.state.realTraining.fillAttempts = [];
    if (!Store.state.realTraining.outputDrafts || typeof Store.state.realTraining.outputDrafts !== 'object') Store.state.realTraining.outputDrafts = {};
    if (!Array.isArray(Store.state.realTraining.outputAttempts)) Store.state.realTraining.outputAttempts = [];
    if (!Array.isArray(Store.state.realTraining.matchAttempts)) Store.state.realTraining.matchAttempts = [];
    if (Store.state.realTraining.pausedListening && typeof Store.state.realTraining.pausedListening !== 'object') Store.state.realTraining.pausedListening = null;
    return Store.state.realTraining;
  }

  function realQuestionById(id) {
    const hit = allRealQuestions().find(function (x) { return x.question.id === id; });
    return hit ? hit.question : null;
  }

  function startRealRecommendation(questionId) {
    const hit = findRealQuestion(questionId);
    if (!hit) { toast('这道同类题不存在。', 'warn'); return; }
    const passage = (hit.bank.paragraphs || []).find(function (p) { return p.id === hit.question.passageId; });
    const set = {
      id: 'recommend-' + hit.question.id,
      title: '同类真题 · ' + hit.bank.title,
      source: hit.bank.source,
      sourceLabel: '真题 · 同类补练 · 第三方答案 + AI补充解析',
      level: '真题 · 同类补练',
      estimatedMinutes: 3,
      isReal: true,
      examMeta: hit.bank.examMeta,
      paragraphs: passage ? [passage] : [],
      questions: [hit.question]
    };
    startReadingSession(set, { mode: 'practice', from: 'exam' });
  }

  function realSetById(id) {
    const data = window.CET4RealData;
    return data && Array.isArray(data.practiceSets) ? data.practiceSets.find(function (s) { return s.id === id; }) : null;
  }

  function realSingleSet(question) {
    if (!question) return null;
    const hit = findRealQuestion(question.id);
    const bank = hit ? hit.bank : null;
    const passages = bank ? bank.paragraphs : (window.CET4RealData ? window.CET4RealData.paragraphs : []);
    const passage = passages.find(function (p) { return p.id === question.passageId; });
    return {
      id: 'real-single-' + question.id,
      title: '同类真题 · ' + (bank ? bank.shortTitle : '第 ' + question.number + ' 题'),
      source: bank ? bank.source : ('原卷第 ' + question.page + ' 页'),
      sourceLabel: '真题 · 第三方答案 + AI补充解析',
      level: '真题 · 同类补练',
      estimatedMinutes: 3,
      isReal: true,
      examMeta: bank ? bank.examMeta : (window.CET4RealData ? window.CET4RealData.exam : {}),
      paragraphs: passage ? [passage] : [],
      questions: [question]
    };
  }

  function realWatchCount() {
    return Object.keys(realTrainingState().watch || {}).length;
  }

  function realPracticeFresh() {
    const rt = realTrainingState();
    const attempted = Object.keys(rt.state || {}).length;
    return attempted === 0;
  }

  function realPracticeSummary() {
    const rt = realTrainingState();
    const attempts = Array.isArray(rt.attempts) ? rt.attempts : [];
    const firstAttempts = attempts.filter(function (a) { return a.isFirst; });
    const correct = firstAttempts.filter(function (a) { return a.correct; });
    const independent = firstAttempts.filter(function (a) { return a.correct && a.hintsUsed === 0 && a.confidence === 'certain'; });
    const hinted = firstAttempts.filter(function (a) { return a.correct && a.hintsUsed > 0; });
    const guessed = firstAttempts.filter(function (a) { return a.correct && a.confidence === 'guess'; });
    const slowCorrect = firstAttempts.filter(function (a) { return a.correct && a.slow; });
    const wrong = firstAttempts.filter(function (a) { return !a.correct; });
    const watch = Object.keys(rt.watch || {}).map(function (key) { return rt.watch[key]; });
    const realErrors = (Store.state.errors || []).filter(function (e) { return e.question && e.question.isReal; });
    const realKeys = new Set(realErrors.map(function (e) { return e.questionKey; }));
    const reviewAttempts = (Store.state.attempts || []).filter(function (a) { return a.source === 'review' && realKeys.has(a.questionId); });
    const reviewCorrect = reviewAttempts.filter(function (a) { return a.correct; }).length;
    const firstSeconds = firstAttempts.reduce(function (sum, a) { return sum + (Number(a.seconds) || 0); }, 0);
    const firstAvgSeconds = firstAttempts.length ? Math.round(firstSeconds / firstAttempts.length) : 0;
    const timedFirst = firstAttempts.filter(function (a) { return a.source === 'real-timed'; });
    const timedFirstCorrect = timedFirst.filter(function (a) { return a.correct; }).length;
    const reviewItems = Store.state.reviewItems || [];
    const reviewPassed = realErrors.filter(function (e) {
      const item = reviewItems.find(function (r) { return r.kind === 'error' && r.refId === e.id; });
      return !!(item && ((item.passCount || 0) > 0 || item.lastOutcome === 'pass'));
    }).length;
    return {
      attemptedQuestions: Object.keys(rt.state || {}).length,
      totalQuestions: (window.CET4RealData && window.CET4RealData.questions || []).length,
      firstAttempts: firstAttempts.length,
      firstCorrect: correct.length,
      independentCorrect: independent.length,
      hintedCorrect: hinted.length,
      guessedCorrect: guessed.length,
      slowCorrect: slowCorrect.length,
      wrong: wrong.length,
      watch: watch.length,
      watchItems: watch,
      realErrors: realErrors.length,
      reviewAttempts: reviewAttempts.length,
      reviewCorrect: reviewCorrect,
      reviewPassed: reviewPassed,
      firstAvgSeconds: firstAvgSeconds,
      timedFirst: timedFirst.length,
      timedFirstCorrect: timedFirstCorrect
    };
  }

  function recordRealPracticeAttempt(input) {
    if (!input || !input.question) return null;
    const rt = realTrainingState();
    const q = input.question;
    const key = q.id;
    const previous = rt.state[key] || null;
    const isFirst = !previous;
    const hintsUsed = Number(input.hintsUsed) || 0;
    const confidence = input.confidence || 'unanswered';
    const seconds = Number(input.seconds) || 0;
    const slow = !!input.slow;
    const correct = !!input.correct;
    const independent = correct && hintsUsed === 0 && confidence === 'certain' && !slow;
    const attempt = {
      ts: new Date().toISOString(),
      questionId: key,
      number: q.number,
      source: input.source || 'real-practice',
      correct: correct,
      confidence: confidence,
      hintsUsed: hintsUsed,
      seconds: seconds,
      slow: slow,
      independent: independent,
      errorId: input.errorId || null,
      isFirst: isFirst
    };
    rt.attempts.push(attempt);
    if (rt.attempts.length > 3000) rt.attempts = rt.attempts.slice(-3000);
    const st = rt.state[key] || {
      firstSeenAt: attempt.ts,
      firstCorrect: null,
      attempts: 0,
      correct: 0,
      wrong: 0,
      independentCorrect: 0,
      hintedCorrect: 0,
      guessedCorrect: 0,
      slowCorrect: 0,
      lastAt: null,
      lastSeconds: 0,
      lastConfidence: null,
      lastCorrect: null
    };
    st.attempts += 1;
    st.lastAt = attempt.ts;
    st.lastSeconds = seconds;
    st.lastConfidence = confidence;
    st.lastCorrect = correct;
    if (correct) {
      st.correct += 1;
      if (hintsUsed > 0) st.hintedCorrect += 1;
      if (confidence === 'guess') st.guessedCorrect += 1;
      if (slow) st.slowCorrect += 1;
      if (independent) st.independentCorrect += 1;
    } else {
      st.wrong += 1;
    }
    if (isFirst) st.firstCorrect = correct;
    const needsWatch = correct && (hintsUsed > 0 || confidence !== 'certain' || slow);
    if (needsWatch) {
      const reasons = [];
      if (hintsUsed > 0) reasons.push('用了第 ' + hintsUsed + ' 层提示');
      if (confidence === 'guess') reasons.push('猜的');
      else if (confidence === 'eliminate') reasons.push('排除后选');
      if (slow) reasons.push('做对但超过目标时间');
      rt.watch[key] = {
        questionId: key,
        number: q.number,
        reasons: reasons,
        dueAt: Date.now() + 10 * 60 * 1000,
        addedAt: new Date().toISOString()
      };
    } else if (correct && independent) {
      delete rt.watch[key];
    }
    rt.state[key] = st;
    Store.save();
    return attempt;
  }

  function realHintsHTML(question, index, session) {
    if (!question.hints) return '';
    const levels = [
      { n: 1, label: '关键词', text: question.hints.keyword },
      { n: 2, label: '句子结构', text: question.hints.structure },
      { n: 3, label: '定位范围', text: question.hints.location }
    ];
    const used = (session.hintLevels && session.hintLevels[index]) || 0;
    return '<div class="layer-hints" data-hint-box="' + index + '"><div class="layer-hints-head"><span>卡住了？逐层提示</span><button type="button" class="btn btn-quiet btn-small" data-action="reading-hint" ' + (used >= 3 ? 'disabled' : '') + '>给一层提示</button><em id="hint-count-' + index + '">' + (used ? '已用 ' + used + ' / 3 层' : '未使用') + '</em></div>' +
      '<p class="layer-hints-note">提示会计入“提示后答对”，不会算作独立答对。完整解析仍然提交后才显示。</p>' +
      levels.map(function (level) {
        return '<div class="hint-layer" id="real-hint-' + index + '-' + level.n + '"' + (used >= level.n ? '' : ' hidden') + '><b>第 ' + level.n + ' 层 · ' + level.label + '</b><p>' + esc(level.text) + '</p></div>';
      }).join('') + '</div>';
  }

  function realConfidenceHTML(selected) {
    return '<div class="confidence-box"><div class="confidence-head"><span>你对这题有多大把握？</span><small>必选；猜对会进入待巩固</small></div><div class="confidence-options">' +
      [['certain', '确定'], ['eliminate', '排除后选'], ['guess', '猜的']].map(function (pair) {
        return '<label class="confidence-pill"><input type="radio" name="reading-confidence" value="' + pair[0] + '"' + (selected === pair[0] ? ' checked' : '') + '><span>' + pair[1] + '</span></label>';
      }).join('') + '</div></div>';
  }

  function realSentenceBreakdownHTML(question) {
    const b = question && question.breakdown;
    if (!b) return '';
    const sentence = b.sentence || findReadingEvidence({ paragraphs: window.CET4RealData.paragraphs }, b.sentenceId);
    return '<details class="sentence-breakdown" open><summary>关键句拆解 · 先找主干，再看修饰与逻辑</summary>' +
      '<p class="breakdown-sentence">' + esc(sentence || '') + '</p>' +
      '<div class="breakdown-row"><span>先判断：谁 + 做什么 + 对象</span><p>' + esc(b.svo) + '</p></div>' +
      '<div class="breakdown-row"><span>主干</span><p>' + esc(b.mainClause) + '</p></div>' +
      '<div class="breakdown-row"><span>修饰 / 否定 / 转折 / 因果</span><p>' + esc(b.modifiers + ' ' + b.logic) + '</p></div>' +
      '<div class="breakdown-row plain"><span>落到人话</span><p>' + esc(b.plain) + '</p></div>' +
      '<p class="source-note">拆解为 AI 补充（非官方），只用于核对句子关系，不改变原文。</p></details>';
  }

  function realEncounteredWordsHTML(question) {
    if (!question) return '';
    const saved = realTrainingState().vocab || {};
    const keys = Object.keys(saved);
    if (!keys.length) return '';
    const text = ((question.stem || '') + ' ' + (question.options || []).join(' ') + ' ' + (question.evidenceText || '')).toLowerCase();
    const hits = keys.filter(function (k) { return text.indexOf(k) !== -1 && !(question.vocabFocus || []).some(function (v) { return String(v.term).toLowerCase() === k; }); }).slice(0, 4);
    if (!hits.length) return '';
    return '<div class="encounter-note"><b>再次遇见你学过的词</b>' + hits.map(function (k) { const e = saved[k]; return '<span><strong>' + esc(e.term) + '</strong> ' + esc(e.meaning || '语境义待补') + '</span>'; }).join('') + '</div>';
  }

  function realVocabFocusHTML(question) {
    const list = question && question.vocabFocus;
    if (!list || !list.length) return '';
    const saved = realTrainingState().vocab || {};
    return '<div class="real-vocab-focus"><span class="detail-label">从这道真题原文提取的词</span>' + list.map(function (v) {
      const isSaved = !!saved[String(v.term || '').toLowerCase()];
      return '<div class="real-vocab-line"><div><b>' + esc(v.term) + '</b><span>' + esc(v.meaning) + '</span><small>' + esc(v.note) + '</small></div>' + (isSaved ? '<em class="vocab-saved">已加入</em>' : '<button type="button" class="btn btn-quiet btn-small" data-action="save-real-word" data-question-id="' + esc(question.id) + '" data-term="' + esc(v.term) + '">加入词本</button>') + '</div>';
    }).join('') + '</div>';
  }

  function findRealQuestionContext(questionId) {
    const hit = findRealQuestion(questionId);
    return hit;
  }

  function saveRealWord(questionId, term) {
    const hit = findRealQuestion(questionId);
    if (!hit) { toast('找不到这道题。', 'warn'); return; }
    const q = hit.question;
    const v = (q.vocabFocus || []).find(function (x) { return String(x.term).toLowerCase() === String(term).toLowerCase(); }) || { term: term, meaning: '语境义待补', note: '从这道真题的文章/题干/选项提取；详细释义待补' };
    const rt = realTrainingState();
    const key = String(v.term).toLowerCase();
    const existing = rt.vocab[key];
    const bankPassages = hit.bank.paragraphs || [];
    const termRe = new RegExp('\\b' + escapeRegExp(v.term) + '\\b', 'i');
    let sourceSentence = q.evidenceText || q.stem || '';
    let sourceKind = '原文';
    for (const p of bankPassages) {
      const s = (p.sentences || []).find(function (x) { return termRe.test(x.text); });
      if (s) { sourceSentence = s.text; sourceKind = '原文'; break; }
    }
    if (!termRe.test(sourceSentence)) {
      if (termRe.test(q.stem)) { sourceSentence = q.stem; sourceKind = '题干'; }
      else {
        const oi = (q.options || []).findIndex(function (o) { return termRe.test(o); });
        if (oi !== -1) { sourceSentence = q.options[oi]; sourceKind = '选项 ' + 'ABCD'[oi]; }
      }
    }
    const linkedError = (Store.state.errors || []).slice().reverse().find(function (e) { return e.question && e.question.sourceQuestionId === q.id; });
    const wordReasons = linkedError ? (linkedError.reasons || []).filter(function (r) { return r === 'word_unknown' || r === 'context_meaning'; }) : [];
    const source = {
      questionId: q.id,
      bankId: hit.bank.id,
      year: hit.bank.year,
      set: hit.bank.set,
      number: q.number,
      sentence: sourceSentence || q.stem || '',
      sourceKind: sourceKind,
      sourceLabel: q.sourceLabel || '',
      reasons: wordReasons
    };
    if (existing) {
      if (!existing.sources.some(function (s) { return s.questionId === q.id; })) existing.sources.push(source);
      existing.lookups = (existing.lookups || 0) + 1;
    } else {
      rt.vocab[key] = {
        term: v.term,
        meaning: v.meaning,
        note: v.note,
        sources: [source],
        reasons: wordReasons,
        lookups: 1,
        addedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        dueAt: Date.now(),
        reviews: [],
        knownCount: 0,
        unknownCount: 0,
        lastResult: null
      };
    }
    Store.save();
    toast('已加入真题词本：' + v.term);
    render();
  }

  function realDataScopeNote() {
    return '逐题统计范围：2024.06 第1套阅读 C 篇，10 题 / 2 篇；不是全部四级真题，也不代表官方高频榜。';
  }

  function realQuestionSourceNote(question) {
    return question.sourceLabel || ('真题：2024年6月第1套 · 原卷第 ' + question.page + ' 页 · 答案来自第三方答案速查 · 解析为 AI 补充（非官方）');
  }


  /* ============================== 阅读 ============================== */
  function startReadingSession(set, options) {
    options = options || {};
    if (!set) { toast('没有阅读材料。', 'warn'); return; }
    const mode = options.mode === 'timed' ? 'timed' : 'practice';
    const minutes = Math.max(5, set.estimatedMinutes || 8);
    view.session = {
      type: 'reading',
      set: set,
      mode: mode,
      from: options.from || 'training',
      taskId: options.taskId || null,
      index: 0,
      phase: mode === 'timed' ? 'timed-question' : 'question',
      answers: new Array((set.questions || []).length).fill(null),
      evidence: {},
      results: [],
      errorIds: {},
      hintLevels: {},
      confidences: {},
      questionTimes: [],
      isReal: !!set.isReal,
      startedAt: Date.now(),
      questionStartedAt: Date.now(),
      deadline: mode === 'timed' ? Date.now() + minutes * 60 * 1000 : null,
      expired: false,
      timerEnded: false,
      summaryErrors: 0
    };
    stopSpeech();
    render();
  }

  function readingPassageHTML(set, options) {
    options = options || {};
    const selected = options.selectedEvidence;
    const correct = options.correctEvidence;
    const feedback = !!options.feedback;
    return '<div class="reading-passage">' + (set.paragraphs || []).map(function (p, pi) {
      return '<p class="reading-paragraph" data-paragraph="' + (pi + 1) + '">' + (p.sentences || []).map(function (sentence) {
        const isSelected = selected === sentence.id;
        const isCorrect = correct === sentence.id;
        const cls = 'sentence' + (isSelected ? ' is-selected' : '') + (isCorrect && feedback ? ' is-correct-evidence' : '') + (isSelected && feedback && !isCorrect ? ' is-wrong-evidence' : '');
        return '<button type="button" class="sentence ' + cls + '" data-action="select-evidence" data-sentence-id="' + esc(sentence.id) + '">' + esc(sentence.text) + '</button> ';
      }).join('') + '</p>';
    }).join('') + '</div>';
  }

  function flatPassageHTML(question, options) {
    options = options || {};
    const paragraphs = question.paragraphs || null;
    if (paragraphs && paragraphs.length) {
      return '<div class="reading-passage">' + paragraphs.map(function (p, pi) {
        const text = (p.sentences || []).map(function (s) { return s.text; }).join(' ');
        let html = esc(text);
        if (options.evidenceId) {
          const hit = (p.sentences || []).find(function (s) { return s.id === options.evidenceId; });
          if (hit) html = html.replace(esc(hit.text), '<mark class="evidence-mark">' + esc(hit.text) + '</mark>');
        }
        return '<p class="reading-paragraph">' + html + '</p>';
      }).join('') + '</div>';
    }
    const flat = question.passage || [];
    return '<div class="reading-passage">' + flat.map(function (text) { return '<p class="reading-paragraph">' + esc(text) + '</p>'; }).join('') + '</div>';
  }

  function readingQuestionCardHTML(set, index, mode) {
    const q = set.questions[index];
    const s = view.session;
    const isReal = !!set.isReal;
    const pendingAnalysis = set.questions.some(function (x) { return x.analysisPending; });
    const selectedConfidence = s && s.confidences ? s.confidences[q.id] : null;
    const sourceLabel = set.examMeta && set.examMeta.shortTitle ? set.examMeta.shortTitle : set.title;
    const source = isReal
      ? '<div class="real-question-source"><span>' + esc(sourceLabel) + ' · 第 ' + q.number + ' 题</span><span>原卷第 ' + q.page + ' 页</span><span>' + (pendingAnalysis ? '答案表已对号 · 解析待补' : '第三方答案 · AI补充解析') + '</span></div>'
      : '';
    const hintBlock = (isReal && mode === 'practice') ? realHintsHTML(q, index, s) : '';
    const confidence = isReal ? realConfidenceHTML(selectedConfidence) : '';
    const genericKeyword = isReal ? '' : '<div class="keyword-hint"><span>题干关键词</span>' + esc(q.keywordTip || '先找题干中的人、事、时间或因果关系，再回原文定位。') + '</div>';
    return '<div class="reading-question-card' + (isReal ? ' is-real-question' : '') + '">' +
      source +
      '<div class="question-number">第 ' + (index + 1) + ' / ' + set.questions.length + ' 题' + (isReal ? ' · 真题' : '') + '</div>' +
      '<h2 class="question-title">' + esc(q.stem) + '</h2>' +
      hintBlock +
      genericKeyword +
      (mode === 'practice' ? '<p class="evidence-hint" id="evidence-hint">' + (pendingAnalysis ? '本组详细依据待补；先独立读原文、作答，提交后只核对答案。' : '先在左侧原文点出一句作为依据，再选答案。') + '</p>' : '<p class="evidence-hint timed-hint">限时模式不显示即时提示。整组提交后再看答案和结果。</p>') +
      '<form id="reading-form" class="question-form">' + confidence + radioOptions('reading-answer', q.options, {}) +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">' + (mode === 'timed' ? (index + 1 === set.questions.length ? '交卷并看结果' : '保存并进入下一题') : '提交本题') + '</button>' +
        (mode === 'timed' ? '<button type="button" class="text-link-button" data-action="reading-skip">这题先跳过</button>' : '') +
        '</div>' +
      '</form></div>';
  }

  function renderReadingSession(s) {
    if (s.phase === 'done') return renderReadingDone(s);
    const set = s.set;
    const q = set.questions[s.index];
    if (!q) return renderReadingDone(s);
    const isReal = !!set.isReal;
    if (s.mode === 'practice' && s.phase === 'question') {
      const body = '<div class="study-card reading-card"><div class="study-progress-line"><span>' + (isReal ? '真题逐题精练' : '阅读实践') + ' · ' + esc(set.level || 'CET-4 难度示例') + '</span><span>第 ' + (s.index + 1) + ' / ' + set.questions.length + ' 题</span></div>' +
        '<div class="study-title-block"><div><h1>' + esc(set.title) + '</h1><p>' + esc(set.source || '原创模拟阅读 · 非真题') + '</p></div><span class="' + (isReal ? 'badge badge-green' : 'badge badge-outline') + '">' + (isReal ? '真题 · 非模拟' : '原创模拟 · 非真题') + '</span></div>' +
        (isReal ? '<div class="real-reading-note"><b>先独立做。</b> 卡住时可用三层提示；提交后看依据、同义替换、干扰项和关键句拆解。猜对/提示后答对会单独进入待巩固，不算独立掌握。</div>' : '') +
        '<div class="reading-layout"><div class="passage-panel">' + readingPassageHTML(set, { selectedEvidence: s.evidence[s.index] }) + '<p class="passage-tip">点击一句话，把它标成你的依据。整篇文章始终保留。</p></div>' +
        readingQuestionCardHTML(set, s.index, 'practice') + '</div>' +
        '<p class="source-note">' + (isReal ? (esc(set.source || '') + ' 答案来自第三方答案表，非官方；' + (set.questions.some(function (x) { return x.analysisPending; }) ? '详细依据/解析待补。' : '解析为 AI 补充。')) : esc(Data.DISCLAIMERS.mock) + ' 阅读不是逐字翻译，先找问题需要的信息。') + '</p></div>';
      renderSessionShell(s, {
        kicker: isReal ? '真题 · 逐题精练' : (s.from === 'training' ? '阅读加练' : '今日 · 阅读定位'),
        title: isReal ? '真题阅读 · 先定位，再作答' : '先定位，再选答案',
        body: body
      });
      return;
    }
    if (s.mode === 'practice' && s.phase === 'feedback') {
      renderReadingFeedback(s);
      return;
    }
    if (s.mode === 'timed') {
      const answered = s.answers.filter(function (x) { return x !== null; }).length;
      const minutes = Math.max(5, set.estimatedMinutes || 8);
      const body = '<div class="study-card reading-card timed-reading"><div class="study-progress-line"><span>' + (isReal ? '真题连续限时' : '限时检验') + ' · 整组交卷后看解析</span><span>已完成 ' + answered + ' / ' + set.questions.length + '</span></div>' +
        '<div class="study-title-block"><div><h1>' + esc(set.title) + '</h1><p>' + (isReal ? '2024.06 第1套阅读 C 篇 · ' : '') + '限时 ' + minutes + ' 分钟 · 计时结束自动交卷</p></div><span class="' + (isReal ? 'badge badge-green' : 'badge badge-outline') + '">' + (isReal ? '真题 · 连续限时' : '限时检验') + '</span></div>' +
        (isReal ? '<p class="inline-note">连续模式不显示逐题解析，但每题仍要标记“确定/排除后选/猜的”。交卷后会统计用时和信心，不用一次点一个解析。</p>' : '') +
        '<div class="reading-layout"><div class="passage-panel">' + flatPassageHTML({ paragraphs: set.paragraphs }, {}) + '</div>' + readingQuestionCardHTML(set, s.index, 'timed') + '</div>' +
        '<p class="source-note">' + (isReal ? (esc(set.source || '') + ' 答案来自第三方整理，非官方；本页面不预测官方分数。') : '检验模式不显示依据提示和即时解析。先保正确，再练速度。' + esc(Data.DISCLAIMERS.score)) + '</p></div>';
      renderSessionShell(s, {
        kicker: isReal ? '真题 · 连续限时' : (s.from === 'training' ? '限时加练' : '今日 · 限时检验'),
        title: isReal ? '真题阅读连续限时' : '8 分钟阅读检验',
        body: body
      });
    }
  }

  function selectEvidence(id) {
    const s = view.session;
    if (!s || s.type !== 'reading' || s.phase !== 'question' || s.mode === 'timed') return;
    s.evidence[s.index] = id;
    document.querySelectorAll('.sentence').forEach(function (el) {
      el.classList.toggle('is-selected', el.getAttribute('data-sentence-id') === id);
    });
    const hint = document.getElementById('evidence-hint');
    if (hint) hint.textContent = '已标记一句依据。现在选答案，提交后核对。';
  }

  function submitReadingPractice(form) {
    const s = view.session;
    if (!s || s.type !== 'reading' || s.mode !== 'practice' || s.phase !== 'question') return;
    const q = s.set.questions[s.index];
    const fd = new FormData(form);
    if (fd.get('reading-answer') === null) { toast('先选一个答案。', 'warn'); return; }
    if (q.evidenceId && !s.evidence[s.index]) { toast('先在原文点击一句你的依据。', 'warn'); return; }
    const confidence = s.isReal ? fd.get('reading-confidence') : null;
    if (s.isReal && !confidence) { toast('先标记“确定 / 排除后选 / 猜的”，再做下一题。', 'warn'); return; }
    const selected = Number(fd.get('reading-answer'));
    const evidence = s.evidence[s.index] || null;
    const evidenceCorrect = q.evidenceId ? evidence === q.evidenceId : null;
    const correct = selected === q.answer;
    const hintsUsed = (s.hintLevels && s.hintLevels[s.index]) || 0;
    const seconds = Math.max(1, (Date.now() - s.questionStartedAt) / 1000);
    const slow = !!q.targetSeconds && seconds > q.targetSeconds;
    Store.recordAttempt({
      module: 'reading',
      skill: q.skillLabel || '定位与选项',
      source: s.isReal ? 'real-practice' : 'practice',
      correct: correct,
      seconds: seconds,
      questionId: 'reading:' + s.set.id + ':' + q.id,
      confidence: confidence,
      hintsUsed: hintsUsed,
      slow: slow,
      isReal: !!s.isReal
    });
    let errorId = null;
    if (!correct) {
      const suggested = evidenceCorrect === false ? 'no_evidence' : 'distractor';
      const error = Store.recordError({
        kind: 'objective',
        module: 'reading',
        question: Store.makeReadingQuestion(s.set, q),
        userAnswer: selected,
        reasons: s.isReal ? [] : [suggested],
        source: s.isReal ? 'real-practice' : 'practice'
      });
      if (s.isReal) {
        error.transfer = null;
        Store.save();
      }
      errorId = error.id;
      s.summaryErrors = (s.summaryErrors || 0) + 1;
    }
    if (s.isReal) {
      s.confidences[q.id] = confidence;
      recordRealPracticeAttempt({
        question: q,
        correct: correct,
        confidence: confidence,
        hintsUsed: hintsUsed,
        seconds: seconds,
        slow: slow,
        errorId: errorId,
        source: 'real-practice'
      });
    }
    s.results.push({ index: s.index, selected: selected, correct: correct, evidence: evidence, evidenceCorrect: evidenceCorrect, confidence: confidence, hintsUsed: hintsUsed, seconds: seconds, slow: slow });
    s.errorIds[s.index] = errorId;
    s.phase = 'feedback';
    render();
  }

  function renderReadingFeedback(s) {
    const set = s.set;
    const q = set.questions[s.index];
    const result = s.results[s.results.length - 1];
    const error = result.errorId ? Store.state.errors.find(function (e) { return e.id === result.errorId; }) : (s.errorIds[s.index] ? Store.state.errors.find(function (e) { return e.id === s.errorIds[s.index]; }) : null);
    const evidenceText = q.evidenceId ? findReadingEvidence(set, q.evidenceId) : '';
    const selectedEvidenceText = result.evidence ? findReadingEvidence(set, result.evidence) : '';
    const confidenceLabel = CONFIDENCE_LABELS[result.confidence] || '未标记';
    const real = !!s.isReal;
    const solid = result.correct && result.hintsUsed === 0 && result.confidence === 'certain' && !result.slow;
    const watchNote = real && result.correct && !solid ? '<div class="inline-note warn"><b>这题暂时对了，但仍进入待巩固。</b> 原因：' + (result.hintsUsed ? '用了第 ' + result.hintsUsed + ' 层提示' : '') + (result.confidence !== 'certain' ? (result.hintsUsed ? '；' : '') + '作答标记为“' + esc(confidenceLabel) + '”' : '') + (result.slow ? (result.hintsUsed || result.confidence !== 'certain' ? '；' : '') + '超过本题目标时间 ' + Math.round(q.targetSeconds || 0) + ' 秒' : '') + '。下一次要独立、按目标时间做对，才算真正稳固。</div>' : '';
    const realMeta = real ? '<div class="real-result-meta"><span>题型：' + esc((window.CET4RealData.skills[q.skills.primary] || {}).label || q.skills.primary) + '</span><span>把握：' + esc(confidenceLabel) + '</span><span>提示：' + (result.hintsUsed ? '第 ' + result.hintsUsed + ' 层' : '未使用') + '</span><span>用时：' + formatSecondsShort(result.seconds) + (result.slow ? ' · 超目标' : '') + '</span></div>' : '';
    const sourceLink = real ? '<a class="text-link-button" href="' + esc(set.examMeta.paperFile) + '#page=' + q.page + '" target="_blank" rel="noopener">查看原卷第 ' + q.page + ' 页 ' + ICONS.arrow + '</a>' : '';
    const body = '<div class="study-card reading-card"><div class="study-progress-line"><span>' + (real ? '真题逐题核对 · ' + ((set.examMeta && set.examMeta.shortTitle) || '') : '阅读实践') + ' · 第 ' + (s.index + 1) + ' / ' + set.questions.length + ' 题</span><span>' + (result.correct ? '答案与依据核对' : '回看依据') + '</span></div>' +
      '<div class="reading-layout"><div class="passage-panel">' + readingPassageHTML(set, { selectedEvidence: result.evidence, correctEvidence: q.evidenceId, feedback: true }) + '</div>' +
      '<div class="reading-question-card' + (real ? ' is-real-question' : '') + '"><div class="answer-banner ' + (result.correct ? 'good' : 'bad') + '">' + (result.correct ? '答案正确。' : '答案不正确。') + '<span>正确：' + optionLetters(q.answer) + '</span></div>' +
        realMeta +
        '<h2 class="question-title small">' + esc(q.stem) + '</h2>' +
        '<div class="evidence-check"><span>你的依据</span><p>' + esc(selectedEvidenceText || '没有标记依据句') + '</p><b class="' + (result.evidenceCorrect ? 'text-good' : 'text-warn') + '">' + (q.evidenceId ? (result.evidenceCorrect ? '依据句正确' : '依据句不匹配') : '该题未提供标准依据句') + '</b>' + (evidenceText ? '<em>标准依据：' + esc(evidenceText) + '</em>' : '') + '</div>' +
        watchNote +
        '<p class="explain"><span class="detail-label">' + (real ? (q.analysisPending ? '答案表已对号 · 解析待补' : 'AI 补充解析（非官方）') : '解析') + '</span>' + esc(q.explain) + '</p>' +
        (q.paraphrase ? '<div class="paraphrase-box"><span>原文 → 选项</span><p>' + esc(q.paraphrase) + '</p></div>' : '') +
        (q.optionNotes && q.optionNotes.length ? '<div class="option-notes">' + q.optionNotes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>' : '') +
        (real ? (q.analysisPending ? '<p class="inline-note">答案已核验；这题原文依据、干扰项分析和考点标签待补，先只核对答案，不冒充完整解析。</p>' : realSentenceBreakdownHTML(q)) + realVocabFocusHTML(q) + realEncounteredWordsHTML(q) : '') +
        (!result.correct && error ? reasonChips('reading', error.reasons || [], error.id) + (s.isReal ? realRecommendationPanel(error) : '') : '') +
        (!result.correct && error && !s.isReal && q.transfer ? '<p class="inline-note">已放入错题本。回炉时会先重做原题，再做一道同考点换题：<b>' + esc(q.transfer.title) + '</b>。两道都通过才拉长间隔。</p>' : '') +
        '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="reading-next">' + (s.index + 1 >= set.questions.length ? '完成本项' : '下一题') + ' ' + ICONS.arrow + '</button>' + sourceLink + '</div>' +
      '</div></div>' +
      '<p class="source-note">' + (real ? realQuestionSourceNote(q) + (q.analysisPending ? ' 答案来自原卷 KEYS/第三方答案表；详细解析待补，不冒充 AI 解析。' : ' 选项按原卷顺序；AI 解析只用于说明，不改变原文。') : esc(Data.DISCLAIMERS.mock)) + '</p></div>';
    renderSessionShell(s, {
      kicker: real ? '真题 · 依据与选项' : (s.from === 'training' ? '阅读加练' : '今日 · 阅读定位'),
      title: real ? '真题阅读 · 答案依据' : '依据与选项对照',
      body: body
    });
  }

  function nextReadingPractice() {
    const s = view.session;
    if (!s || s.type !== 'reading' || s.mode !== 'practice') return;
    if (s.index + 1 >= s.set.questions.length) {
      s.phase = 'done';
      s.finishedAt = Date.now();
      markSessionTask(s);
      render();
      return;
    }
    s.index += 1;
    s.phase = 'question';
    s.questionStartedAt = Date.now();
    render();
  }

  function submitTimedReading(form, skip) {
    const s = view.session;
    if (!s || s.type !== 'reading' || s.mode !== 'timed') return;
    const q = s.set.questions[s.index];
    if (!skip) {
      const fd = new FormData(form);
      const answer = fd.get('reading-answer');
      if (answer === null) { toast('先选一个答案，或点“这题先跳过”。', 'warn'); return; }
      s.answers[s.index] = Number(answer);
      if (s.isReal) {
        const confidence = fd.get('reading-confidence');
        if (!confidence) { toast('先标记“确定 / 排除后选 / 猜的”。', 'warn'); return; }
        s.confidences[q.id] = confidence;
      }
    }
    s.questionTimes[s.index] = Math.max(1, (Date.now() - s.questionStartedAt) / 1000);
    if (s.index + 1 >= s.set.questions.length) {
      finishTimedReading('submitted');
      return;
    }
    s.index += 1;
    s.questionStartedAt = Date.now();
    render();
  }

  function captureTimedCurrentAnswer() {
    const s = view.session;
    if (!s || s.type !== 'reading' || s.mode !== 'timed') return;
    const form = document.getElementById('reading-form');
    if (form) {
      const fd = new FormData(form);
      if (fd.get('reading-answer') !== null) s.answers[s.index] = Number(fd.get('reading-answer'));
      if (s.isReal && fd.get('reading-confidence') !== null) s.confidences[s.set.questions[s.index].id] = fd.get('reading-confidence');
      s.questionTimes[s.index] = Math.max(1, (Date.now() - s.questionStartedAt) / 1000);
    }
  }

  function finishTimedReading(reason) {
    const s = view.session;
    if (!s || s.type !== 'reading' || s.mode !== 'timed' || s.phase === 'done') return;
    captureTimedCurrentAnswer();
    s.deadline = null;
    s.phase = 'done';
    s.finishedAt = Date.now();
    s.endReason = reason;
    const set = s.set;
    const fallbackSeconds = Math.max(1, (Date.now() - s.startedAt) / 1000 / Math.max(1, set.questions.length));
    const rows = [];
    let correctCount = 0;
    let unanswered = 0;
    set.questions.forEach(function (q, i) {
      const answer = s.answers[i];
      const answered = answer !== null && answer !== undefined;
      if (!answered) unanswered += 1;
      const correct = answered && answer === q.answer;
      const confidence = (s.confidences && s.confidences[q.id]) || 'unanswered';
      const seconds = (s.questionTimes && s.questionTimes[i]) || (answered ? fallbackSeconds : 0);
      const slow = !!q.targetSeconds && seconds > q.targetSeconds;
      if (correct) correctCount += 1;
      Store.recordAttempt({
        module: 'reading',
        skill: '限时阅读',
        source: s.isReal ? 'real-timed' : 'timed',
        correct: correct,
        seconds: seconds,
        questionId: 'reading:' + set.id + ':' + q.id,
        timedOut: reason === 'timeout',
        confidence: confidence,
        slow: slow,
        isReal: !!s.isReal
      });
      let errorId = null;
      if (answered && !correct) {
        const error = Store.recordError({
          kind: 'objective',
          module: 'reading',
          question: Store.makeReadingQuestion(set, q),
          userAnswer: answer,
          reasons: [reason === 'timeout' ? 'time_short' : 'distractor'],
          source: s.isReal ? 'real-timed' : 'timed'
        });
        errorId = error.id;
        s.summaryErrors = (s.summaryErrors || 0) + 1;
      }
      if (s.isReal && answered) {
        recordRealPracticeAttempt({
          question: q,
          correct: correct,
          confidence: confidence,
          hintsUsed: 0,
          seconds: seconds,
          slow: slow,
          errorId: errorId,
          source: 'real-timed'
        });
      }
      rows.push({ index: i, answer: answer, answered: answered, correct: correct, errorId: errorId, seconds: seconds, confidence: confidence, slow: slow });
    });
    s.results = rows;
    s.correctCount = correctCount;
    s.unanswered = unanswered;
    s.timerEnded = reason === 'timeout';
    markSessionTask(s);
    stopSpeech();
    render();
  }

  function realTakeawaysHTML(set, results, timed) {
    const rows = results || [];
    const pendingCount = set.questions.filter(function (q) { return q.analysisPending; }).length;
    if (pendingCount === set.questions.length) {
      const independentPending = rows.filter(function (r) { return r.correct && (r.hintsUsed || 0) === 0 && !r.slow; }).length;
      return '<section class="takeaway-panel"><div class="panel-topline"><div><span class="section-kicker">收获卡 · 本组带走</span><h2>答案核对完成，详细解析待补</h2></div><span class="panel-meta">不伪造解析</span></div><p class="real-home-copy">这组题的文章、题干、选项和答案已经可作答；原文依据、干扰项分析和考点标签还没补，所以不生成“关键词/难句/同义替换”来凑收获。当前只确认：答案正确 ' + rows.filter(function (r) { return r.correct; }).length + ' / ' + rows.length + '，独立且按时 ' + independentPending + ' / ' + rows.length + '。</p><p class="takeaway-end"><b>可以到这里结束。</b> 详细解析补齐前，这组只作为答案核对与限时练习，不算“已讲透”。</p></section>';
    }
    const vocab = [];
    const seen = {};
    set.questions.forEach(function (q) {
      (q.vocabFocus || []).forEach(function (v) {
        const k = String(v.term).toLowerCase();
        if (seen[k]) return;
        seen[k] = true;
        vocab.push({ v: v, q: q });
      });
    });
    const focus = set.questions.find(function (q, i) {
      const r = rows[i];
      return r && r.correct === false;
    }) || set.questions[0];
    const sentence = focus && (focus.breakdown && focus.breakdown.sentence || focus.evidenceText || focus.breakdown && focus.breakdown.sentenceId || '');
    const evidenceKnown = rows.filter(function (r) { return r.evidenceCorrect !== undefined && r.evidenceCorrect !== null; }).length;
    const evidenceHits = rows.filter(function (r) { return r.evidenceCorrect; }).length;
    const independent = rows.filter(function (r) { return r.correct && (r.hintsUsed || 0) === 0 && (r.confidence === 'certain' || r.confidence === undefined) && !r.slow; }).length;
    return '<section class="takeaway-panel"><div class="panel-topline"><div><span class="section-kicker">本组带走</span><h2>今天具体学会了什么</h2></div><span class="panel-meta">不是分数</span></div>' +
      '<div class="takeaway-grid"><div class="takeaway-block"><b>关键词（' + Math.min(4, vocab.length) + '）</b>' + vocab.slice(0, 4).map(function (x) {
        return '<div class="takeaway-word"><span><strong>' + esc(x.v.term) + '</strong> ' + esc(x.v.meaning) + '</span><button type="button" class="btn btn-quiet btn-small" data-action="save-real-word" data-question-id="' + esc(x.q.id) + '" data-term="' + esc(x.v.term) + '">收词</button></div>';
      }).join('') + '</div>' +
      '<div class="takeaway-block"><b>一个难句</b><p class="takeaway-sentence">' + esc(sentence) + '</p>' + (focus && focus.breakdown && focus.breakdown.plain ? '<p class="takeaway-plain">' + esc(focus.breakdown.plain) + '</p>' : '') + '</div>' +
      '<div class="takeaway-block"><b>一处同义替换</b><p class="takeaway-synonym">' + esc((focus && focus.paraphrase) || '回到原文与正确选项对照一次。') + '</p></div>' +
      '<div class="takeaway-block"><b>本组证据 / 独立性</b><p>' + (evidenceKnown ? '证据句命中 <strong>' + evidenceHits + ' / ' + evidenceKnown + '</strong>；' : '') + '独立且按时答对 <strong>' + independent + ' / ' + rows.length + '</strong>。一次结果只算本次表现，不是掌握。</p></div></div>' +
      '<p class="takeaway-end"><b>可以到这里结束。</b> 不需要为了“打卡”再堆一组；想继续时再开另一篇。</p></section>';
  }

  function renderReadingDone(s) {
    const set = s.set;
    const real = !!s.isReal;
    if (s.mode === 'timed') {
      const rows = s.results;
      const timeUsed = formatClock((s.finishedAt - s.startedAt) / 1000);
      const timeAudit = real ? '<div class="real-time-audit"><div class="panel-topline"><div><span class="section-kicker">时间分配</span><h2>哪些题花得太多</h2></div><span class="panel-meta">目标仅作训练参考</span></div><div class="real-time-table"><div class="real-time-head"><span>题号</span><span>用时</span><span>把握</span><span>结果</span></div>' + rows.map(function (row) {
        const q = set.questions[row.index];
        return '<div class="real-time-row"><b>' + q.number + '</b><span class="' + (row.slow ? 'text-warn' : '') + '">' + formatSecondsShort(row.seconds) + (row.slow ? ' · 慢' : '') + '</span><span>' + esc(CONFIDENCE_LABELS[row.confidence] || '—') + '</span><span>' + (row.correct ? '对' : row.answered ? '错' : '未答') + '</span></div>';
      }).join('') + '</div><p class="aside-note">慢题不等于错题；会但太慢需要练定位与取舍，做错则要看理解与干扰项。</p></div>' : '';
      renderSessionShell(s, {
        title: real ? '真题连续限时结果' : '限时检验结果',
        body: '<div class="study-card reading-result-card"><p class="eyebrow">' + (real ? '2024.06 第1套 · 阅读 C 真题' : '整组已完成') + '</p><h1>' + (s.correctCount || 0) + ' / ' + set.questions.length + ' 正确</h1>' +
          '<p class="lead">' + (s.timerEnded ? '时间到，系统自动交卷。' : '按时交卷。') + ' 未作答 ' + (s.unanswered || 0) + ' 题，用时 ' + timeUsed + '。' + (real ? '这是客观题核对，不是官方四级分数；答案来自第三方，解析为 AI 补充。' : '单组检验的正确率不应直接拿来估考试分数。') + '</p>' +
          '<div class="summary-stats"><div><b>' + (s.correctCount || 0) + '/' + set.questions.length + '</b><span>本组正确</span></div><div><b>' + timeUsed + '</b><span>总用时</span></div><div><b>' + (s.summaryErrors || 0) + '</b><span>错题入本</span></div></div>' +
          timeAudit +
          (real ? realTakeawaysHTML(set, rows, true) : '') +
          (s.unanswered ? '<p class="inline-note warn">有 ' + s.unanswered + ' 题没有作答。这才是限时检验要暴露的问题：先标记、后回头，不要卡在一题。</p>' : '') +
          '<div class="timed-result-list">' + set.questions.map(function (q, i) {
            const row = rows[i];
            const error = row.errorId ? Store.state.errors.find(function (e) { return e.id === row.errorId; }) : null;
            const userText = row.answered ? '你的选择：' + q.options[row.answer] : '未作答';
            return '<section class="feedback-block ' + (row.correct ? 'is-good' : 'is-bad') + '"><div class="feedback-block-head"><div><span class="feedback-index">第 ' + (i + 1) + ' 题' + (real ? ' · 原卷 ' + q.number : '') + '</span><span class="result-chip">' + (row.correct ? '正确' : row.answered ? '错' : '未答') + '</span></div>' + (real ? '<span class="form-hint">' + formatSecondsShort(row.seconds) + ' · ' + esc(CONFIDENCE_LABELS[row.confidence] || '—') + '</span>' : '') + '</div>' +
              '<h3>' + esc(q.stem) + '</h3><div class="answer-compare"><span>' + esc(userText) + '</span><b>正确答案：' + optionLetters(q.answer) + ' · ' + esc(q.options[q.answer]) + '</b></div>' +
              '<p class="explain">' + esc(q.explain) + '</p>' +
              (q.evidenceId ? '<p class="evidence-line"><span>依据句</span>' + esc(findReadingEvidence(set, q.evidenceId)) + '</p>' : '') +
              (q.optionNotes && q.optionNotes.length ? '<div class="option-notes">' + q.optionNotes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>' : '') +
              (real ? realSentenceBreakdownHTML(q) : '') +
              (!row.correct && error ? reasonChips('reading', error.reasons || [], error.id) : '') +
            '</section>';
          }).join('') + '</div>' +
          '<div class="summary-actions">' + sessionReturnButton(s) + '<button type="button" class="btn btn-quiet" data-nav="errors">打开错题本</button></div>' +
          '<p class="source-note">' + (real ? '真题 2024.06 第1套阅读 C；答案来自第三方答案速查，AI 解析非官方。只按客观题正确数核对，不预测官方分数。' : esc(Data.DISCLAIMERS.score)) + '</p></div>'
      });
      return;
    }
    const correct = s.results.filter(function (r) { return r.correct; }).length;
    const evidenceHits = s.results.filter(function (r) { return r.evidenceCorrect; }).length;
    const evidenceKnown = s.results.filter(function (r) { return r.evidenceCorrect !== null; }).length;
    const used = formatClock((Date.now() - s.startedAt) / 1000);
    const realSummary = real ? '<div class="summary-stats"><div><b>' + s.results.filter(function (r) { return r.correct && r.hintsUsed === 0 && r.confidence === 'certain' && !r.slow; }).length + ' / ' + s.results.length + '</b><span>独立且按时答对</span></div><div><b>' + s.results.filter(function (r) { return r.correct && r.hintsUsed > 0; }).length + '</b><span>提示后答对</span></div><div><b>' + s.results.filter(function (r) { return r.correct && r.confidence === 'guess'; }).length + '</b><span>猜对（待巩固）</span></div><div><b>' + s.results.filter(function (r) { return r.correct && r.slow; }).length + '</b><span>做对但超时</span></div></div>' : '';
    renderSessionShell(s, {
      title: real ? '真题逐题精练完成' : '阅读完成',
      body: '<div class="study-card session-summary"><p class="eyebrow">' + (real ? '真题 · 2024.06 阅读 C' : '本项完成') + '</p><h1>' + (real ? '会做与猜对，分开算。' : '阅读不是“看懂了”。') + '</h1><p class="lead">' + (real ? '客观题答对要看依据和用时；提示后答对、猜对、做对但超时都会单独记录。错题已经进入回炉，同考点换题会作为换题检验。' : '你要能指出答案对应哪句原文，并说明正确选项怎样改写、干扰项错在哪里。依据不准，即使选对也值得回看。') + '</p>' +
        '<div class="summary-stats"><div><b>' + correct + ' / ' + set.questions.length + '</b><span>答案正确</span></div><div><b>' + (evidenceKnown ? evidenceHits + ' / ' + evidenceKnown : '—') + '</b><span>依据正确</span></div><div><b>' + used + '</b><span>用时</span></div></div>' + realSummary +
        (real ? realTakeawaysHTML(set, s.results, false) : '') +
        summaryErrorLine(s) + '<div class="summary-actions">' + sessionReturnButton(s) + '<button type="button" class="btn btn-quiet" data-nav="errors">打开错题本</button></div>' +
        '<p class="source-note">' + (real ? (esc(set.source || '') + ' 答案来自第三方；AI 补充解析非官方；不预测分数。') : esc(Data.DISCLAIMERS.score)) + '</p></div>'
    });
  }

  function findReadingEvidence(set, id) {
    let found = '';
    (set.paragraphs || []).forEach(function (p) { (p.sentences || []).forEach(function (s) { if (s.id === id) found = s.text; }); });
    return found;
  }

  /* ============================== 写作 ============================== */
  function startWritingSession(task, options) {
    options = options || {};
    if (!task) { toast('没有写作材料。', 'warn'); return; }
    view.session = {
      type: 'writing',
      task: task,
      from: options.from || 'training',
      taskId: options.taskId || null,
      phase: 'drills',
      drillIndex: 0,
      drillText: '',
      drillFeedback: null,
      paragraphText: '',
      feedback: null,
      selfRating: null,
      startedAt: Date.now()
    };
    stopSpeech();
    render();
  }

  function issueListHTML(items, emptyText) {
    if (!items || !items.length) return '<p class="check-empty">' + esc(emptyText) + '</p>';
    return '<ul class="issue-list">' + items.slice(0, 6).map(function (item) {
      return '<li><span class="issue-dot"></span><div>' + esc(item.message) + (item.snippet ? '<small>' + esc(item.snippet) + '</small>' : '') + '</div></li>';
    }).join('') + '</ul>';
  }

  function coverageChips(points) {
    return '<div class="coverage-chips">' + (points || []).map(function (p) {
      return '<span class="coverage-chip ' + (p.covered ? 'ok' : 'missing') + '">' + (p.covered ? '✓ ' : '○ ') + esc(p.label) + '</span>';
    }).join('') + '</div>';
  }

  function writingStructureHTML(task) {
    return '<details class="structure-box" open><summary>这次只用到的结构</summary><div class="structure-list">' + (task.structures || []).map(function (s) {
      return '<div><code>' + esc(s.pattern) + '</code><p>' + esc(s.example) + '</p><small>' + esc(s.note) + '</small></div>';
    }).join('') + '</div></details>';
  }

  function renderWritingSession(s) {
    if (s.phase === 'done') return renderWritingDone(s);
    const task = s.task;
    let body = '<div class="study-card writing-card"><div class="study-progress-line"><span>' + esc(task.typeLabel) + '</span><span>' + (s.phase === 'paragraph' ? '第 2 步 · 连成段' : s.phase === 'feedback' ? '检查结果' : '第 1 步 · 写对句子') + '</span></div>' +
      '<div class="study-title-block"><div><h1>' + esc(task.title) + '</h1><p>' + esc(task.promptZh) + '</p></div><span class="badge badge-outline">原创模拟题 · 非真题</span></div>' +
      '<div class="step-rail"><span class="' + (s.phase !== 'paragraph' && s.phase !== 'feedback' ? 'active' : 'done') + '">1 写对句子</span><span class="rail-line"></span><span class="' + (s.phase === 'paragraph' || s.phase === 'feedback' ? 'active' : '') + '">2 连成段</span></div>';
    if (s.phase === 'drills') {
      const drill = task.warmups[s.drillIndex];
      const draftKey = 'writing:' + task.id + ':drill:' + drill.id;
      const text = s.drillText || Store.getDraft(draftKey) || '';
      body += '<div class="drill-progress">句子 ' + (s.drillIndex + 1) + ' / ' + task.warmups.length + '</div>' +
        '<div class="prompt-box"><span class="prompt-label">中文提示</span><p>' + esc(drill.zh) + '</p><small>' + esc(drill.hint) + '</small></div>' +
        '<label class="field"><span class="field-label">你的英文句子</span><textarea id="writing-drill-input" class="writing-textarea" rows="4" data-draft-key="' + esc(draftKey) + '" placeholder="先写出主谓，再加连接词和修饰。">' + esc(text) + '</textarea></label>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-action="check-writing-drill">检查这句</button><span class="form-hint">本地只检查结构与要点覆盖，不给你打“分数”。</span></div>';
      if (s.drillFeedback) {
        const fb = s.drillFeedback;
        body += '<div class="check-result"><div class="check-result-head"><h3>可核对的地方</h3><span class="' + (fb.structureMatched ? 'status-good' : 'status-warn') + '">' + (fb.structureMatched ? '结构/关键词基本覆盖' : '结构和要点还没全出现') + '</span></div>' +
          coverageChips(fb.coverage) +
          '<p class="inline-note">关键词覆盖不是分数；它只说明本地关键词表命中了几个要点。</p>' +
          issueListHTML(fb.stats.issues.filter(function (x) { return x.tag === 'grammar' || x.tag === 'spelling' || x.tag === 'punctuation' || x.tag === 'chinese'; }), '本地规则未发现明显语法或拼写问题。') +
          '<div class="model-answer"><span class="detail-label">参考表达（不要求一字不差）</span><p>' + esc(drill.model) + '</p><small>' + esc(drill.note) + '</small></div>' +
          '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="writing-next-drill">' + (s.drillIndex + 1 >= task.warmups.length ? '进入成段写作' : '下一句') + ' ' + ICONS.arrow + '</button><button type="button" class="text-link-button" data-action="writing-rewrite-drill">再改一次</button></div>' +
        '</div>';
      }
      body += '<p class="source-note">' + esc(Data.DISCLAIMERS.grading) + '</p>';
    } else if (s.phase === 'paragraph') {
      const draftKey = 'writing:' + task.id + ':paragraph';
      const text = s.paragraphText || Store.getDraft(draftKey) || '';
      body += '<div class="prompt-box large"><span class="prompt-label">写作任务</span><p class="prompt-en">' + esc(task.promptEn) + '</p><small>目标 ' + task.targetWords[0] + '–' + task.targetWords[1] + ' 词 · 建议 ' + task.timeMinutes + ' 分钟。先把观点/目的写清楚，不用追求生僻词。</small></div>' +
        writingStructureHTML(task) +
        '<div class="requirement-list"><span class="detail-label">内容要点</span>' + (task.contentPoints || []).map(function (p) { return '<span>' + esc(p.label) + '</span>'; }).join('') + '</div>' +
        '<label class="field"><span class="field-label">你的段落</span><textarea id="writing-paragraph" class="writing-textarea paragraph-textarea" rows="9" data-draft-key="' + esc(draftKey) + '" data-word-count-target="writing-word-count" placeholder="先写主题句，再写理由/要点，最后收束。">' + esc(text) + '</textarea><span class="word-count-line"><span id="writing-word-count">' + Checker.wordCount(text) + '</span> 词 · 目标 ' + task.targetWords[0] + '–' + task.targetWords[1] + '</span></label>' +
        '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="check-writing-paragraph">检查我的段落</button><button type="button" class="btn btn-quiet" data-action="writing-back-drills">回到句子练习</button></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.grading) + '</p>';
    } else if (s.phase === 'feedback') {
      const fb = s.feedback;
      const groups = fb.groups;
      body += '<div class="feedback-banner mid"><div><span class="feedback-kicker">本地规则检查</span><b>' + fb.stats.words + ' 词 · ' + fb.stats.sentenceCount + ' 句</b></div><p>这不是官方或 AI 评分。先看能确定的问题，再对照参考表达自评。</p></div>' +
        '<div class="check-grid">' +
          '<section class="check-box"><h3>语法与标点</h3>' + issueListHTML(groups.grammar, '本地规则未发现明显语法/标点问题。') + '</section>' +
          '<section class="check-box"><h3>拼写</h3>' + issueListHTML(groups.spelling, '常见拼写错词表中未发现明显问题。') + '</section>' +
          '<section class="check-box"><h3>表达清楚</h3>' + issueListHTML(groups.unclear, '没有检测到超长句、缺少衔接或明显重复。') + '</section>' +
          '<section class="check-box"><h3>题目要点</h3>' + coverageChips(fb.points) + '<p class="inline-note">这是本地关键词覆盖，不是分数；覆盖全部要点也不代表语言和任务完成度达标。</p>' + (fb.notes.length ? '<div class="check-notes">' + fb.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</div>' : '') + '</section>' +
        '</div>' +
        '<details class="reference-box"><summary>看参考段落与结构标注（先自评，再打开）</summary><div class="reference-body"><p>' + nl2br(task.modelParagraph) + '</p><ul>' + (task.modelNotes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div></details>' +
        '<div class="self-check"><h3>最后自查</h3><p>你的段落是否做到了：观点/目的清楚、至少一个具体要点、句子基本完整、没有用中文凑意思？</p><div class="form-actions"><button type="button" class="btn btn-primary" data-action="finish-writing" data-rating="ok">基本达成，完成本项</button><button type="button" class="btn btn-secondary" data-action="finish-writing" data-rating="needs_work">需要重练，也保存记录</button><button type="button" class="btn btn-quiet" data-action="writing-back-paragraph">回去修改</button></div></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.grading) + ' 输出题不会被伪装成客观对错自动进错题本；自评“需要重练”会留在进度记录里。</p>';
    }
    body += '</div>';
    renderSessionShell(s, {
      kicker: s.from === 'training' ? '写作加练' : '今日 · 写作',
      title: '先写对，再写完整',
      body: body
    });
  }

  function checkWritingDrill() {
    const s = view.session;
    if (!s || s.type !== 'writing' || s.phase !== 'drills') return;
    const el = document.getElementById('writing-drill-input');
    const text = el ? el.value.trim() : '';
    if (!text) { toast('先写出一个英文句子。', 'warn'); return; }
    const drill = s.task.warmups[s.drillIndex];
    s.drillText = text;
    s.drillFeedback = Checker.checkWritingSentence(text, drill);
    Store.saveDraft('writing:' + s.task.id + ':drill:' + drill.id, text);
    render();
  }

  function writingNextDrill() {
    const s = view.session;
    if (!s || s.type !== 'writing') return;
    if (s.drillIndex + 1 < s.task.warmups.length) {
      s.drillIndex += 1;
      s.drillText = '';
      s.drillFeedback = null;
      render();
    } else {
      s.phase = 'paragraph';
      s.paragraphText = Store.getDraft('writing:' + s.task.id + ':paragraph') || '';
      render();
    }
  }

  function checkWritingParagraph() {
    const s = view.session;
    if (!s || s.type !== 'writing' || s.phase !== 'paragraph') return;
    const el = document.getElementById('writing-paragraph');
    const text = el ? el.value.trim() : '';
    if (!text) { toast('先写出段落再检查。', 'warn'); return; }
    s.paragraphText = text;
    s.feedback = Checker.checkWritingParagraph(text, s.task);
    Store.saveDraft('writing:' + s.task.id + ':paragraph', text);
    s.phase = 'feedback';
    s.feedbackAt = Date.now();
    render();
  }

  function finishWriting(rating) {
    const s = view.session;
    if (!s || s.type !== 'writing' || s.phase !== 'feedback') return;
    const used = Math.max(1, (Date.now() - s.startedAt) / 1000);
    s.selfRating = rating === 'needs_work' ? 'needs_work' : 'ok';
    Store.recordOutput({
      module: 'writing',
      taskId: s.task.id,
      words: s.feedback ? s.feedback.stats.words : Checker.wordCount(s.paragraphText),
      seconds: used,
      selfRating: s.selfRating,
      feedback: s.feedback ? {
        grammar: s.feedback.groups.grammar.length,
        spelling: s.feedback.groups.spelling.length,
        unclear: s.feedback.groups.unclear.length,
        missingPoints: s.feedback.missingPoints.length,
        wordCount: s.feedback.stats.words
      } : {},
      text: s.paragraphText
    });
    if (s.from === 'today') {
      markSessionTask(s);
    }
    s.finishedAt = Date.now();
    s.phase = 'done';
    render();
  }

  function renderWritingDone(s) {
    const used = formatClock((s.finishedAt - s.startedAt) / 1000);
    const words = s.feedback ? s.feedback.stats.words : Checker.wordCount(s.paragraphText);
    renderSessionShell(s, {
      title: '写作完成',
      body: '<div class="study-card session-summary"><p class="eyebrow">本项完成</p><h1>先写对，再写难。</h1><p class="lead">你把时间和词数放进了“可检查”的段落，而不是只背范文。下次先看语法、拼写、要点和句间关系，再考虑升级词汇。</p>' +
        '<div class="summary-stats"><div><b>' + words + '</b><span>写成词数</span></div><div><b>' + used + '</b><span>用时</span></div><div><b>' + (s.selfRating === 'needs_work' ? '需重练' : '基本达成') + '</b><span>你的自评</span></div></div>' +
        '<p class="inline-note">输出题不使用虚构分数。要再练一次，可直接从训练库重新打开这个任务；已写文本仍保存在本机草稿。</p>' +
        '<div class="summary-actions">' + sessionReturnButton(s) + '<button type="button" class="btn btn-quiet" data-action="restart-writing">再写一次</button></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.grading) + '</p></div>'
    });
  }

  /* ============================== 翻译 ============================== */
  function startTranslationSession(task, options) {
    options = options || {};
    if (!task) { toast('没有翻译材料。', 'warn'); return; }
    view.session = {
      type: 'translation',
      task: task,
      from: options.from || 'training',
      taskId: options.taskId || null,
      phase: 'write',
      index: 0,
      answers: {},
      feedback: null,
      results: {},
      selfRating: null,
      startedAt: Date.now()
    };
    stopSpeech();
    render();
  }

  function renderTranslationSession(s) {
    if (s.phase === 'done') return renderTranslationDone(s);
    const task = s.task;
    let body = '<div class="study-card translation-card"><div class="study-progress-line"><span>' + esc(task.topic || '翻译') + '</span><span>' + (s.phase === 'overview' ? '整体自评' : '第 ' + (s.index + 1) + ' / ' + task.sentences.length + ' 句') + '</span></div>' +
      '<div class="study-title-block"><div><h1>' + esc(task.title) + '</h1><p>' + esc(task.sourceZh) + '</p></div><span class="badge badge-outline">原创模拟段落 · 非真题</span></div>';
    if (s.phase === 'write' || s.phase === 'feedback') {
      const sentence = task.sentences[s.index];
      const draftKey = 'translation:' + task.id + ':' + sentence.id;
      const text = s.answers[sentence.id] || Store.getDraft(draftKey) || '';
      body += '<div class="prompt-box large"><span class="prompt-label">原句 ' + (s.index + 1) + '</span><p>' + esc(sentence.zh) + '</p><small>句子主干：' + esc(sentence.skeleton) + '</small></div>' +
        '<div class="chunk-hints"><span class="detail-label">先想清这些意义块</span>' + sentence.chunks.map(function (c) { return '<span>' + esc(c.label) + '</span>'; }).join('') + '</div>' +
        '<label class="field"><span class="field-label">你的译文</span><textarea id="translation-input" class="writing-textarea" rows="5" data-draft-key="' + esc(draftKey) + '" placeholder="先把主干译出来，再补修饰。">' + esc(text) + '</textarea></label>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" data-action="check-translation">检查这一句</button><span class="form-hint">允许多种正确表达；本地只核对要点词和基础语法。</span></div>';
      if (s.feedback) {
        const fb = s.feedback;
        body += '<div class="check-result"><div class="check-result-head"><h3>意义块覆盖</h3><span class="' + (fb.covered === fb.total ? 'status-good' : 'status-warn') + '">' + fb.covered + ' / ' + fb.total + '</span></div>' +
          coverageChips(fb.points) +
          '<p class="inline-note">意义块覆盖不是翻译分数；漏掉的词块只提示可能漏译，不能判断整句是否自然。</p>' +
          issueListHTML(fb.groups.grammar.concat(fb.groups.spelling, fb.groups.chinese), '本地规则未发现明显基础语法/拼写问题。') +
          '<div class="reference-box open"><div class="reference-body"><p class="detail-label">参考译文（不要求逐字相同）</p>' + sentence.references.map(function (r) { return '<p class="reference-en">' + esc(r) + '</p>'; }).join('') + '<p class="aside-note">' + esc(sentence.reminder) + '</p></div></div>' +
          '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="translation-next">' + (s.index + 1 >= task.sentences.length ? '看整体自评' : '下一句') + ' ' + ICONS.arrow + '</button><button type="button" class="text-link-button" data-action="translation-rewrite">再改一次</button></div>' +
        '</div>';
      }
    } else if (s.phase === 'overview') {
      const total = Object.keys(s.results).reduce(function (n, id) { const r = s.results[id]; return n + (r ? r.total : 0); }, 0);
      const covered = Object.keys(s.results).reduce(function (n, id) { const r = s.results[id]; return n + (r ? r.covered : 0); }, 0);
      body += '<div class="overview-panel"><div class="summary-stats"><div><b>' + covered + ' / ' + total + '</b><span>意义块覆盖</span></div><div><b>' + task.sentences.length + '</b><span>已检查句数</span></div><div><b>' + formatClock((Date.now() - s.startedAt) / 1000) + '</b><span>用时</span></div></div><p class="inline-note">覆盖数不是翻译分数；它只说明本地关键词表命中了几个意义块。</p>' +
        '<div class="reference-box open"><div class="reference-body"><p class="detail-label">整段参考（只是其中一种写法）</p><p class="reference-en">' + esc(task.fullReference) + '</p></div></div>' +
        '<div class="self-check"><h3>你的自评</h3><p>对照参考，是否有漏译、主干错误或看不懂的句子？选择“需要重练”会把这次输出记录到进度里；它不会被伪装成自动判分的错题。</p><div class="form-actions"><button type="button" class="btn btn-primary" data-action="finish-translation" data-rating="ok">基本达成，完成本项</button><button type="button" class="btn btn-secondary" data-action="finish-translation" data-rating="needs_work">需要重练，也保存记录</button><button type="button" class="btn btn-quiet" data-action="translation-prev">回去看上一句</button></div></div></div>';
    }
    body += '<p class="source-note">' + esc(Data.DISCLAIMERS.grading) + ' ' + esc(task.note || '') + '</p></div>';
    renderSessionShell(s, {
      kicker: s.from === 'training' ? '翻译加练' : '今日 · 翻译',
      title: '先主干，再修饰',
      body: body
    });
  }

  function checkTranslation() {
    const s = view.session;
    if (!s || s.type !== 'translation' || s.phase !== 'write') return;
    const el = document.getElementById('translation-input');
    const text = el ? el.value.trim() : '';
    if (!text) { toast('先写出译文。', 'warn'); return; }
    const sentence = s.task.sentences[s.index];
    s.answers[sentence.id] = text;
    s.feedback = Checker.checkTranslationSentence(text, sentence);
    s.results[sentence.id] = s.feedback;
    Store.saveDraft('translation:' + s.task.id + ':' + sentence.id, text);
    s.phase = 'feedback';
    render();
  }

  function translationNext() {
    const s = view.session;
    if (!s || s.type !== 'translation') return;
    if (s.index + 1 < s.task.sentences.length) {
      s.index += 1;
      s.feedback = null;
      s.phase = 'write';
      render();
    } else {
      s.feedback = null;
      s.phase = 'overview';
      render();
    }
  }

  function finishTranslation(rating) {
    const s = view.session;
    if (!s || s.type !== 'translation' || s.phase !== 'overview') return;
    const covered = Object.keys(s.results).reduce(function (n, id) { return n + (s.results[id] ? s.results[id].covered : 0); }, 0);
    const total = Object.keys(s.results).reduce(function (n, id) { return n + (s.results[id] ? s.results[id].total : 0); }, 0);
    s.selfRating = rating === 'needs_work' ? 'needs_work' : 'ok';
    Store.recordOutput({
      module: 'translation',
      taskId: s.task.id,
      words: Checker.wordCount(Object.keys(s.answers).map(function (k) { return s.answers[k]; }).join(' ')),
      seconds: Math.max(1, (Date.now() - s.startedAt) / 1000),
      selfRating: s.selfRating,
      feedback: { coverage: total ? covered / total : 0, covered: covered, total: total },
      text: Object.keys(s.answers).map(function (k) { return s.answers[k]; }).join('\n\n')
    });
    if (s.from === 'today') markSessionTask(s);
    s.finishedAt = Date.now();
    s.phase = 'done';
    render();
  }

  function renderTranslationDone(s) {
    const covered = Object.keys(s.results).reduce(function (n, id) { return n + (s.results[id] ? s.results[id].covered : 0); }, 0);
    const total = Object.keys(s.results).reduce(function (n, id) { return n + (s.results[id] ? s.results[id].total : 0); }, 0);
    renderSessionShell(s, {
      title: '翻译完成',
      body: '<div class="study-card session-summary"><p class="eyebrow">本项完成</p><h1>翻译不是逐字对号。</h1><p class="lead">先确定句子的主谓宾，再补时间、地点和修饰。参考译文不止一种；能保留关键意思、语法基本稳定，就是可用的译文。</p>' +
        '<div class="summary-stats"><div><b>' + covered + ' / ' + total + '</b><span>意义块覆盖</span></div><div><b>' + formatClock((s.finishedAt - s.startedAt) / 1000) + '</b><span>用时</span></div><div><b>' + (s.selfRating === 'needs_work' ? '需重练' : '基本达成') + '</b><span>你的自评</span></div></div>' +
        '<p class="inline-note">本地检查只提示要点词覆盖和基础语法，不能证明所有同义表达都错。最终请对照参考自评。</p>' +
        '<div class="summary-actions">' + sessionReturnButton(s) + '</div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.grading) + '</p></div>'
    });
  }

  /* ============================== 错题回炉 ============================== */
  function startReviewQueue(views, options) {
    options = options || {};
    const queue = (views || []).filter(function (v) {
      return v && (v.kind === 'vocab' || (v.error && v.error.kind !== 'output'));
    }).slice(0, options.limit || 3);
    if (!queue.length) { toast('现在没有可复习的项目。', 'warn'); return; }
    view.session = {
      type: 'review',
      queue: queue,
      index: 0,
      stage: '',
      from: options.from || 'errors',
      taskId: options.taskId || null,
      startedAt: Date.now(),
      questionStartedAt: Date.now(),
      originalAnswer: null,
      originalCorrect: null,
      transferAnswer: null,
      transferCorrect: null,
      textFallbackOriginal: false,
      textFallbackTransfer: false,
      outcomes: [],
      summaryErrors: 0
    };
    primeReviewItem(view.session);
    stopSpeech();
    render();
  }

  function primeReviewItem(s) {
    const v = s.queue[s.index];
    if (!v) return;
    s.stage = v.kind === 'vocab' ? 'transfer' : 'original';
    s.originalAnswer = null;
    s.originalCorrect = null;
    s.transferAnswer = null;
    s.transferCorrect = null;
    s.textFallbackOriginal = false;
    s.textFallbackTransfer = false;
    s.questionStartedAt = Date.now();
  }

  function currentReviewView(s) { return s.queue[s.index]; }

  function reviewOriginalBody(s, v) {
    const error = v.error;
    const q = error.question;
    let body = '<div class="review-before"><span class="step-tag">原题重做</span><h1>' + esc(error.module === 'vocab' ? (q.word || '语境词') : (q.setTitle || '原题')) + '</h1><p>先不看解析，按第一遍的要求再做一次。' + (error.module === 'listening' ? '录音可以重听。' : '') + '</p></div>';
    if (error.module === 'reading') {
      body += flatPassageHTML(q, {});
    } else if (error.module === 'listening') {
      body += '<div class="audio-panel primary-audio"><div class="audio-symbol">' + ICONS.play + '</div><div><h3>原题录音</h3><p>' + esc(q.setTitle || '原创模拟听力') + '</p></div><button type="button" class="btn btn-secondary" data-action="review-play-audio" data-target="original">' + ICONS.play + ' 播放</button></div>';
      if (s.textFallbackOriginal) {
        body += listeningTranscriptHTML({ script: q.script || [] }, { note: '文字替代 · 不计入听力正确率' });
      } else {
        body += '<button type="button" class="text-link-button" data-action="review-audio-fallback" data-target="original">无法播放？显示原文</button>';
      }
    } else {
      if (q.sentence) body += '<p class="context-sentence">' + highlightTerm(q.sentence, q.word || '') + '</p>';
    }
    body += '<form id="review-original-form" class="question-form"><h2 class="question-title">' + esc(q.stem) + '</h2>' + radioOptions('review-answer', q.options, {}) +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">提交重答</button><span class="form-hint">提交后才显示答案与解析</span></div></form>';
    return body;
  }

  function reviewTransferBody(v) {
    const error = v.error;
    const transfer = error ? error.transfer : null;
    const card = v.card;
    const t = error ? transfer : (card ? card.transfer : null);
    if (!t) return '<p class="inline-note warn">这道题没有可用的换题检验材料。</p><div class="form-actions"><button type="button" class="btn btn-primary" data-action="review-no-transfer">结束本项</button></div>';
    let body = '<div class="review-before"><span class="step-tag">换题检验</span><h1>' + esc(t.title || (error && error.module === 'listening' ? '再听一句' : error && error.module === 'reading' ? '再看一小篇' : '换一个句子')) + '</h1><p>这次不是背上一题答案，而是在新语境里再判断一次。</p></div>';
    if (error && error.module === 'listening') {
      body += '<div class="audio-panel primary-audio"><div class="audio-symbol">' + ICONS.play + '</div><div><h3>播放新句子</h3><p>' + audioBadge() + '</p></div><button type="button" class="btn btn-secondary" data-action="review-play-audio" data-target="transfer">' + ICONS.play + ' 播放</button></div>';
      if (s.textFallbackTransfer) {
        body += '<div class="transcript-box"><div class="transcript-head"><strong>文字替代</strong><span>练习参考</span></div><p>' + esc((t.script || []).map(function (x) { return x.text; }).join(' ')) + '</p></div>';
      } else {
        body += '<button type="button" class="text-link-button" data-action="review-audio-fallback" data-target="transfer">无法播放？显示原文</button>';
      }
    } else if (error && error.module === 'reading') {
      body += '<div class="reading-passage">' + (t.passage || []).map(function (p) { return '<p class="reading-paragraph">' + esc(p) + '</p>'; }).join('') + '</div>';
    } else if (t.sentence) {
      body += '<p class="context-sentence">' + esc(t.sentence) + '</p>';
    }
    body += '<form id="review-transfer-form" class="question-form"><h2 class="question-title">' + esc(t.stem) + '</h2>' + radioOptions('review-transfer-answer', t.options, {}) +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">提交换题检验</button><span class="form-hint">这次对了，才把间隔拉长</span></div></form>';
    return body;
  }

  function renderReviewSession(s) {
    if (s.phase === 'done' || s.stage === 'done') return renderReviewDone(s);
    const v = currentReviewView(s);
    if (!v) return renderReviewDone(s);
    const error = v.error;
    const module = error ? error.module : 'vocab';
    const item = Store.getReviewItemForKey(error ? error.reviewKey : v.item.key);
    let body = '<div class="study-card review-card"><div class="study-progress-line"><span>回炉 ' + (s.index + 1) + ' / ' + s.queue.length + '</span><span>' + esc(moduleLabel(module)) + ' · 已通过 ' + ((item && item.passCount) || 0) + ' 次</span></div>';
    if (s.stage === 'original') {
      body += reviewOriginalBody(s, v);
    } else if (s.stage === 'original_feedback') {
      body += renderReviewOriginalFeedback(s, v);
    } else if (s.stage === 'transfer') {
      body += reviewTransferBody(v);
    } else if (s.stage === 'transfer_feedback') {
      body += renderReviewTransferFeedback(s, v);
    }
    const reviewReal = !!(error && error.question && error.question.isReal);
    body += '<p class="source-note">' + (reviewReal ? '真题回炉：' + esc(error.question.sourceLabel || '2024.06 第1套阅读 C') + '。答案来自第三方，AI 解析非官方；' : esc(Data.DISCLAIMERS.mock)) + ' 复习成绩只记录实际作答。</p></div>';
    renderSessionShell(s, {
      kicker: '错题回炉',
      title: '先重做，再迁移',
      body: body
    });
  }

  function renderReviewOriginalFeedback(s, v) {
    const error = v.error;
    const q = error.question;
    const chosen = s.originalAnswer;
    const correct = !!s.originalCorrect;
    const context = error.module === 'vocab' && q.sentence
      ? '<p class="context-sentence small">' + highlightTerm(q.sentence, q.word || '') + '</p>'
      : '';
    const listening = error.module === 'listening' && q.script
      ? listeningTranscriptHTML({ script: q.script }, { note: '提交后可回看原文与依据句' })
      : '';
    const passage = error.module === 'reading' ? flatPassageHTML(q, { evidenceId: q.evidenceId }) : '';
    return '<div class="feedback-banner ' + (correct ? 'good' : 'bad') + '"><div><span class="feedback-kicker">原题重做</span><b>' + (correct ? '正确' : '仍然不正确') + '</b></div><p>' + (correct ? '这次答对了。还要用新语境确认不是记住了答案。' : '没有关系，先看依据，再做换题检验。') + '</p></div>' +
      passage + listening + context +
      '<h2 class="question-title small">' + esc(q.stem) + '</h2>' +
      radioOptions('review-original-feedback', q.options, { reveal: true, correct: q.answer, user: chosen, disabled: true }) +
      '<div class="answer-compare"><span>你的选择：' + esc(chosen !== null ? q.options[chosen] : '未作答') + '</span><b>正确答案：' + optionLetters(q.answer) + ' · ' + esc(q.options[q.answer]) + '</b></div>' +
      '<p class="explain">' + esc(q.explain) + '</p>' +
      '<p class="tri-ack"><button type="button" class="text-link-button" data-action="ack-evidence" data-error-id="' + esc(error.id) + '">' + (error.evidenceAcknowledgedAt ? '已确认：我看懂了依据' : '我看懂依据了') + '</button><span>只是第 1 阶段，不等于会做</span></p>' +
      (!correct ? reasonChips(error.module, error.reasons || [], error.id) : '') +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="review-to-transfer">进入换题检验 ' + ICONS.arrow + '</button></div>';
  }

  function renderReviewTransferFeedback(s, v) {
    const error = v.error;
    const t = error ? error.transfer : (v.card ? v.card.transfer : null);
    const item = Store.getReviewItemForKey(error ? error.reviewKey : v.item.key);
    const originalCorrect = !!s.originalCorrect;
    const transferCorrect = !!s.transferCorrect;
    const success = !!s.lastSuccess;
    const dueText = item ? Store.formatDue(item.dueAt) : '—';
    const outcome = error
      ? '<div class="review-outcome-row"><span>原题重做 <b class="' + (originalCorrect ? 'text-good' : 'text-warn') + '">' + (originalCorrect ? '正确' : '仍错') + '</b></span><span>换题检验 <b class="' + (transferCorrect ? 'text-good' : 'text-warn') + '">' + (transferCorrect ? '正确' : '仍错') + '</b></span></div>'
      : '';
    let failureNote = '';
    if (!success) {
      if (error && originalCorrect && !transferCorrect) failureNote = '原题这次做对了，但新语境没有通过，所以间隔仍然缩短。';
      else if (error && !originalCorrect && transferCorrect) failureNote = '换题做对了，但原题重做仍未通过，因此本次仍算未通过。';
      else if (!error) failureNote = '新语境没有通过，先回看这句里的词义和搭配。';
      else failureNote = '原题和换题至少有一项没有通过，下一次仍需先重做。';
    }
    return '<div class="feedback-banner ' + (success ? 'good' : 'bad') + '"><div><span class="feedback-kicker">换题结果</span><b>' + (success ? '本次通过' : '本次未通过') + '</b></div><p>' + (success ? '下一次复习会拉长到：' + esc(dueText) + '。' : '下一次：' + esc(dueText) + '。' + esc(failureNote)) + '</p></div>' +
      outcome +
      (t ? '<h2 class="question-title small">' + esc(t.stem) + '</h2>' + radioOptions('review-transfer-feedback', t.options, { reveal: true, correct: t.answer, user: s.transferAnswer, disabled: true }) + '<div class="answer-compare"><span>换题答案：' + esc(s.transferAnswer !== null && t.options[s.transferAnswer] ? t.options[s.transferAnswer] : '未作答') + '</span><b>正确答案：' + optionLetters(t.answer) + ' · ' + esc(t.options[t.answer]) + '</b></div><p class="explain">' + esc(t.explain) + '</p>' : '<p class="inline-note warn">没有换题材料，本次按原题结果记录。</p>') +
      (error && error.module === 'reading' && t && t.passage ? '<details class="reference-box"><summary>回看新短篇</summary><div class="reference-body">' + t.passage.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div></details>' : '') +
      '<div class="form-actions"><button type="button" class="btn btn-primary" data-action="review-next">' + (s.index + 1 >= s.queue.length ? '完成本批回炉' : '下一个复习') + ' ' + ICONS.arrow + '</button></div>';
  }

  function submitReviewOriginal(form) {
    const s = view.session;
    if (!s || s.type !== 'review' || s.stage !== 'original') return;
    const v = currentReviewView(s);
    const error = v.error;
    const fd = new FormData(form);
    if (fd.get('review-answer') === null) { toast('先选一个答案。', 'warn'); return; }
    const selected = Number(fd.get('review-answer'));
    const correct = selected === error.question.answer;
    Store.recordAttempt({
      module: error.module,
      skill: '错题复习',
      source: 'review',
      correct: correct,
      seconds: Math.max(1, (Date.now() - s.questionStartedAt) / 1000),
      questionId: error.questionKey,
      modality: s.textFallbackOriginal ? 'text-fallback' : undefined
    });
    s.originalAnswer = selected;
    s.originalCorrect = correct;
    if (!correct) {
      Store.recordError({
        kind: 'objective',
        module: error.module,
        question: error.question,
        userAnswer: selected,
        reasons: error.reasons && error.reasons.length ? error.reasons : ['distractor'],
        source: 'review'
      });
      s.summaryErrors = (s.summaryErrors || 0) + 1;
    }
    s.stage = 'original_feedback';
    stopSpeech();
    render();
  }

  function submitReviewTransfer(form) {
    const s = view.session;
    if (!s || s.type !== 'review' || s.stage !== 'transfer') return;
    const v = currentReviewView(s);
    const error = v.error;
    const t = error ? error.transfer : (v.card ? v.card.transfer : null);
    if (!t) { finishReviewItem(true); return; }
    const fd = new FormData(form);
    if (fd.get('review-transfer-answer') === null) { toast('先选一个答案。', 'warn'); return; }
    const selected = Number(fd.get('review-transfer-answer'));
    const correct = selected === t.answer;
    Store.recordAttempt({
      module: error ? error.module : 'vocab',
      skill: '换题检验',
      source: 'review',
      correct: correct,
      seconds: Math.max(1, (Date.now() - s.questionStartedAt) / 1000),
      questionId: (error ? error.questionKey : v.card.id) + ':transfer',
      modality: s.textFallbackTransfer ? 'text-fallback' : undefined
    });
    s.transferAnswer = selected;
    s.transferCorrect = correct;
    if (error && correct) {
      const nowIso = new Date().toISOString();
      if (!error.transferPassedAt) error.transferPassedAt = nowIso;
      else if (error.transferPassedAt && (Date.now() - new Date(error.transferPassedAt).getTime()) >= 24 * 60 * 60 * 1000) error.delayedPassedAt = nowIso;
      Store.save();
    }
    const success = error ? (!!s.originalCorrect && correct) : correct;
    const key = error ? error.reviewKey : v.item.key;
    const updated = Store.recordReviewOutcome(key, success, {
      originalCorrect: s.originalCorrect,
      transferCorrect: correct
    });
    s.lastSuccess = success;
    s.lastItem = updated;
    s.outcomes.push({ success: success, module: error ? error.module : 'vocab' });
    s.stage = 'transfer_feedback';
    stopSpeech();
    render();
  }

  function finishReviewItem(successOverride) {
    const s = view.session;
    if (!s || s.type !== 'review') return;
    const v = currentReviewView(s);
    const error = v.error;
    const t = error ? error.transfer : (v.card ? v.card.transfer : null);
    const success = typeof successOverride === 'boolean' ? successOverride : (error ? (!!s.originalCorrect && !!s.transferCorrect) : !!s.transferCorrect);
    s.outcomes.push({ success: success, module: error ? error.module : 'vocab' });
    s.lastSuccess = success;
    s.stage = 'transfer_feedback';
    render();
  }

  function reviewNext() {
    const s = view.session;
    if (!s || s.type !== 'review') return;
    if (s.index + 1 < s.queue.length) {
      s.index += 1;
      s.stage = '';
      primeReviewItem(s);
      stopSpeech();
      render();
    } else {
      s.phase = 'done';
      s.finishedAt = Date.now();
      if (s.taskId) markSessionTask(s);
      render();
    }
  }

  function renderReviewDone(s) {
    const passed = (s.outcomes || []).filter(function (x) { return x.success; }).length;
    const total = s.queue.length;
    const remaining = Store.dueReviewViews().length;
    renderSessionShell(s, {
      title: '回炉本批完成',
      body: '<div class="study-card session-summary"><p class="eyebrow">本批回炉</p><h1>' + passed + ' / ' + total + ' 通过。</h1><p class="lead">通过不等于“永远会了”，只是间隔可以拉长。失败的题会缩短间隔，下一次仍需先重做，再用新语境检验。</p>' +
        '<div class="summary-stats"><div><b>' + passed + '/' + total + '</b><span>本批通过</span></div><div><b>' + remaining + '</b><span>当前仍到期</span></div><div><b>' + formatClock((s.finishedAt - s.startedAt) / 1000) + '</b><span>用时</span></div></div>' +
        (remaining ? '<p class="inline-note warn">还有 ' + remaining + ' 个到期项目，不必一次清空；下一批再来。' : '<p class="inline-note">这一批到期项目已处理。新错题仍会约 10 分钟后进入当天回炉。</p>') +
        '<div class="summary-actions">' + sessionReturnButton(s) + '<button type="button" class="btn btn-quiet" data-nav="errors">查看错题本</button></div>' +
        '<p class="source-note">' + esc(Data.DISCLAIMERS.score) + '</p></div>'
    });
  }

  /* ============================== 会话入口 ============================== */
  function renderSession() {
    const s = view.session;
    if (!s) { view.session = null; render(); return; }
    if (s.type === 'true-exam') renderTrueExamSession(s);
    else if (s.type === 'true-listening') renderTrueListeningSession(s);
    else if (s.type === 'fill') renderFillSession(s);
    else if (s.type === 'output') renderOutputSession(s);
    else if (s.type === 'match') renderMatchSession(s);
    else if (s.type === 'vocab') renderVocabSession(s);
    else if (s.type === 'listening') renderListeningSession(s);
    else if (s.type === 'reading') renderReadingSession(s);
    else if (s.type === 'writing') renderWritingSession(s);
    else if (s.type === 'translation') renderTranslationSession(s);
    else if (s.type === 'review') renderReviewSession(s);
    else { view.session = null; render(); }
  }

  /* ============================== 事件处理 ============================== */
  function currentSession() { return view.session; }

  function playDiagnosticAudio() {
    if (!onboard || onboard.step !== 'test') return;
    const q = Data.DIAGNOSTIC.questions[onboard.index];
    if (!q || !q.audio) return;
    const status = document.getElementById('diagnostic-audio-status');
    const parts = Data.DIAGNOSTIC.listeningScript.map(function (line) {
      return { text: line.text, speaker: line.speaker };
    });
    parts.push({ text: 'Question. ' + q.stem, speaker: 'W', rate: 0.87 });
    const ok = speakParts(parts, {
      onProgress: function (current, total) {
        if (status) status.textContent = '正在播放 ' + current + ' / ' + total + '…';
      },
      onDone: function () { if (status) status.textContent = '播放完成。可以再听一次，或直接作答。'; },
      onError: function () {
        onboard.audioFallback = true;
        render();
        toast('播放失败，已切换文字替代。本次听力判断会标记为不可靠。', 'warn');
      },
      onUnavailable: function () {
        onboard.audioFallback = true;
        render();
        toast(speechUnavailableMessage(), 'warn');
      }
    });
    if (!ok) {
      onboard.audioFallback = true;
      render();
      toast(speechUnavailableMessage(), 'warn');
    }
  }

  function handleDiagnosticSubmit(form) {
    if (!onboard) return;
    const fd = new FormData(form);
    const skip = !!fd.get('skip');
    const value = fd.get('answer');
    if (!skip && value === null) { toast('先选一个答案，或点“不会，先跳过”。', 'warn'); return; }
    const seconds = Math.max(1, (Date.now() - (onboard.questionStartedAt || Date.now())) / 1000);
    onboard.answers.push({
      answer: skip || value === null ? null : Number(value),
      seconds: seconds,
      skipped: skip
    });
    stopSpeech();
    if (onboard.index + 1 < Data.DIAGNOSTIC.questions.length) {
      onboard.index += 1;
      onboard.questionStartedAt = Date.now();
      render();
    } else {
      onboard.result = Store.computeDiagnostic(onboard.answers);
      onboard.step = 'result';
      render();
      window.scrollTo(0, 0);
    }
  }

  function playListeningLine(index) {
    const s = view.session;
    if (!s || s.type !== 'listening') return;
    const line = s.set.script[Number(index)];
    if (!line) return;
    const ok = speakParts([{ text: line.text, speaker: line.speaker }], {
      onUnavailable: function () { toast('当前没有可用英语语音。', 'warn'); },
      onError: function () { toast('这句播放失败。', 'warn'); }
    });
    if (!ok) toast('当前没有可用英语语音。', 'warn');
  }

  function playReviewAudio(target) {
    const s = view.session;
    if (!s || s.type !== 'review') return;
    const v = currentReviewView(s);
    if (!v) return;
    const error = v.error;
    const transfer = error ? error.transfer : (v.card ? v.card.transfer : null);
    const script = target === 'transfer'
      ? (transfer && transfer.script ? transfer.script : [])
      : (error && error.question && error.question.script ? error.question.script : []);
    if (!script.length) { toast('这段没有可播放的录音。', 'warn'); return; }
    const parts = script.map(function (line) { return { text: line.text, speaker: line.speaker }; });
    const ok = speakParts(parts, {
      onUnavailable: function () {
        if (target === 'transfer') s.textFallbackTransfer = true; else s.textFallbackOriginal = true;
        render();
        toast(speechUnavailableMessage(), 'warn');
      },
      onError: function () {
        if (target === 'transfer') s.textFallbackTransfer = true; else s.textFallbackOriginal = true;
        render();
        toast('播放失败，已显示文字替代。', 'warn');
      }
    });
    if (!ok) {
      if (target === 'transfer') s.textFallbackTransfer = true; else s.textFallbackOriginal = true;
      render();
    }
  }

  function handleAction(actionEl) {
    const action = actionEl.getAttribute('data-action');
    const s = view.session;
    switch (action) {
      case 'onboarding-edit':
        if (onboard && onboard.step !== 'form') {
          onboard.step = 'form';
          render();
        }
        break;
      case 'diagnostic-start':
        onboard = { step: 'test', index: 0, answers: [], audioFallback: false, questionStartedAt: Date.now() };
        stopSpeech();
        render();
        break;
      case 'diagnostic-skip':
        if (!window.confirm('跳过短测后，计划按保守顺序安排；以后可以在设置里补测。确定跳过？')) return;
        Store.finishOnboarding(null);
        onboard = null;
        view.tab = 'today';
        render();
        toast('已按保守计划开始。你可以在设置里补做短测。');
        break;
      case 'diagnostic-audio':
        playDiagnosticAudio();
        break;
      case 'diagnostic-fallback':
        if (onboard) { onboard.audioFallback = true; render(); }
        break;
      case 'onboarding-finish':
        if (onboard && onboard.result) {
          Store.finishOnboarding(onboard.result);
          onboard = null;
          view.tab = 'today';
          render();
          toast('今日计划已生成。');
        }
        break;
      case 'retake-diagnostic':
        if (!window.confirm('重做短测会重新进入首次使用引导。已有错题、练习记录和复习安排不会自动清空。继续？')) return;
        Store.resetOnboarding();
        stopSpeech();
        stopTimer();
        view.session = null;
        onboard = { step: 'form', answers: [], index: 0, audioFallback: false };
        render();
        break;
      case 'start-real-practice':
        startRealPractice(actionEl.getAttribute('data-set'), actionEl.getAttribute('data-mode'));
        break;
      case 'start-reading-bank':
        startReadingBank(actionEl.getAttribute('data-bank-id'), actionEl.getAttribute('data-mode'));
        break;
      case 'start-reading-passage':
        startReadingPassage(actionEl.getAttribute('data-bank-id'), actionEl.getAttribute('data-passage-id'), actionEl.getAttribute('data-mode'));
        break;
      case 'select-home-topic':
        view.homeTopic = actionEl.getAttribute('data-topic') || 'all';
        render();
        break;
      case 'select-home-type':
        view.homeChoice.type = actionEl.getAttribute('data-type') || 'reading';
        view.homeChoice.amount = view.homeChoice.type === 'vocab' ? '5' : '1';
        render();
        break;
      case 'select-home-amount':
        view.homeChoice.amount = actionEl.getAttribute('data-amount') || '1';
        render();
        break;
      case 'select-listening-mode':
        view.homeChoice.listeningMode = actionEl.getAttribute('data-mode') || 'practice';
        render();
        break;
      case 'start-home-task':
        if (view.homeChoice.type === 'reading') startHomeReadingTask();
        else if (view.homeChoice.type === 'listening') startHomeListeningTask();
        else if (view.homeChoice.type === 'fill') { const sets = fillSets(); if (sets.length) startFillSession(sets[0].id); }
        else if (view.homeChoice.type === 'match') { const sets = matchSets(); if (sets.length) startMatchSession(sets[0].id); }
        else if (view.homeChoice.type === 'writing' || view.homeChoice.type === 'translation') startOutputTask(view.homeChoice.type);
        else startWordBatch(Number(view.homeChoice.amount) || 5);
        break;
      case 'pause-session':
        if (view.session && view.session.type === 'true-listening') pauseTrueListening();
        else pauseReadingSession();
        break;
      case 'resume-reading':
        resumeReadingSession();
        break;
      case 'resume-listening':
        resumeTrueListening();
        break;
      case 'start-real-recommendation':
        startRealRecommendation(actionEl.getAttribute('data-question-id'));
        break;
      case 'start-true-listening':
        startTrueListening(actionEl.getAttribute('data-set-id'), actionEl.getAttribute('data-mode'));
        break;
      case 'open-mode-picker':
        view.modePicker = actionEl.getAttribute('data-key');
        render();
        break;
      case 'close-mode-picker':
        view.modePicker = null;
        render();
        break;
      case 'true-filter':
        if (!view.trueFilter) trueFilterDefaults();
        view.trueFilter[actionEl.getAttribute('data-key')] = actionEl.getAttribute('data-value') || 'all';
        view.trueFilter.page = 1;
        view.trueScroll = null;
        render();
        break;
      case 'true-filter-reset':
        view.trueFilter = { type: 'reading', year: 'all', month: 'all', set: 'all', status: 'all', page: 1 };
        view.trueScroll = null;
        render();
        break;
      case 'true-page':
        if (!view.trueFilter) trueFilterDefaults();
        view.trueFilter.page = Math.max(1, Number(actionEl.getAttribute('data-page')) || 1);
        view.trueScroll = null;
        render();
        break;
      case 'jump-type-panel':
        (function () {
          const id = actionEl.getAttribute('data-panel');
          const el = document.getElementById(id);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('is-jump-target'); setTimeout(function () { el.classList.remove('is-jump-target'); }, 1200); }
          else toast('这个题型还没有可用题库。', 'warn');
        })();
        break;
      case 'jump-type-unavailable':
        toast(actionEl.getAttribute('data-reason') || '这个题型尚未接入。', 'warn');
        break;
      case 'start-fill':
        startFillSession(actionEl.getAttribute('data-set-id'));
        break;
      case 'start-output':
        startOutputTask(actionEl.getAttribute('data-output-kind'), actionEl.getAttribute('data-task-id'));
        break;
      case 'start-match':
        startMatchSession(actionEl.getAttribute('data-set-id'));
        break;
      case 'restart-match':
        startMatchSession(actionEl.getAttribute('data-set-id'));
        break;
      case 'submit-output':
        submitOutputSession();
        break;
      case 'save-output-draft':
        saveOutputDraft(); toast('草稿已保存。');
        break;
      case 'edit-output':
        if (view.session && view.session.type === 'output') { view.session.phase = 'edit'; render(); }
        break;
      case 'restart-fill':
        startFillSession(actionEl.getAttribute('data-set-id'));
        break;
      case 'restart-true-listening':
        startTrueListening(actionEl.getAttribute('data-set-id'), actionEl.getAttribute('data-mode'));
        break;
      case 'start-mock-listening':
        startMockListening();
        break;
      case 'tl-review-group':
        playListeningReview(Number(actionEl.getAttribute('data-index')), null);
        break;
      case 'tl-review-question':
        if (!view.session || view.session.type !== 'true-listening') break;
        playListeningReview(null, Number(actionEl.getAttribute('data-number')));
        break;
      case 'tl-prev':
        if (view.session && view.session.type === 'true-listening') { view.session.groupIndex = Math.max(0, view.session.groupIndex - 1); updateTrueListeningGroup(); }
        break;
      case 'tl-next':
        if (view.session && view.session.type === 'true-listening') { const groups = trueListeningGroupRanges(view.session.set); view.session.groupIndex = Math.min(groups.length - 1, view.session.groupIndex + 1); updateTrueListeningGroup(); }
        break;
      case 'tl-jump':
        if (view.session && view.session.type === 'true-listening') {
          const n = Number(actionEl.getAttribute('data-number'));
          const groups = trueListeningGroupRanges(view.session.set);
          const gi = groups.findIndex(function (g) { return n >= g.from && n <= g.to; });
          if (gi >= 0) { view.session.groupIndex = gi; updateTrueListeningGroup(); const q = document.getElementById('tl-q-' + n); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
        break;
      case 'tl-flag':
        if (view.session && view.session.type === 'true-listening') {
          const n = Number(actionEl.getAttribute('data-number'));
          view.session.flags[n] = !view.session.flags[n];
          syncTrueListeningNav();
        }
        break;
      case 'save-real-word':
        saveRealWord(actionEl.getAttribute('data-question-id'), actionEl.getAttribute('data-term'));
        break;
      case 'ack-evidence': {
        const e = Store.state.errors.find(function (x) { return x.id === actionEl.getAttribute('data-error-id'); });
        if (e) { e.evidenceAcknowledgedAt = e.evidenceAcknowledgedAt || new Date().toISOString(); Store.save(); render(); }
        break;
      }
      case 'vocab-page':
        view.vocabPage = Math.max(1, Number(actionEl.getAttribute('data-page')) || 1);
        render();
        break;
      case 'saved-page':
        view.savedPage = Math.max(1, Number(actionEl.getAttribute('data-page')) || 1);
        render();
        break;
      case 'review-word':
        reviewWord(actionEl.getAttribute('data-word-key'));
        break;
      case 'reveal-word':
        revealWordReview();
        break;
      case 'grade-word':
        gradeWordReview(actionEl.getAttribute('data-known') === '1');
        break;
      case 'close-word-review':
        view.wordReview = null;
        render();
        break;
      case 'start-real-diagnostic':
        startRealDiagnostic();
        break;
      case 'start-real-question':
        startRealQuestion(actionEl.getAttribute('data-question-id'));
        break;
      case 'start-true-exam':
        startTrueExam(actionEl.getAttribute('data-exam-id'), actionEl.getAttribute('data-mode'));
        break;
      case 'submit-true-exam':
        submitTrueExam(false);
        break;
      case 'retry-true-wrongs': {
        const session = view.session;
        if (!session || !session.result || !session.result.wrongs || !session.result.wrongs.length) break;
        startTrueExam(session.exam.id, session.mode.id, { retryQuestions: session.result.wrongs.map(function (w) { return w.q; }) });
        break;
      }
      case 'retry-true-record': {
        const rid = actionEl.getAttribute('data-record-id');
        const rec = (Store.state.trueExamRecords || []).find(function (r) { return r.id === rid; });
        if (rec && rec.examId && (rec.wrongQuestions || []).length) startTrueExam(rec.examId, rec.modeId, { retryQuestions: rec.wrongQuestions });
        break;
      }
      case 'retake-true-exam':
        if (s && s.type === 'true-exam') startTrueExam(s.exam.id, s.mode.id);
        break;
      case 'start-task':
        startTask(actionEl.getAttribute('data-task-id'));
        break;
      case 'start-library':
        startLibrary(actionEl.getAttribute('data-library'));
        break;
      case 'start-due-review': {
        const views = Store.selectReviewBatch(3);
        if (!views.length) { toast('现在没有到期复习。'); return; }
        startReviewQueue(views, { from: view.tab === 'errors' ? 'errors' : 'training', taskId: null });
        break;
      }
      case 'review-error': {
        const error = Store.state.errors.find(function (e) { return e.id === actionEl.getAttribute('data-error-id'); });
        if (!error) { toast('这条错题不在了。', 'warn'); return; }
        const item = Store.getReviewItemForKey(error.reviewKey);
        if (!item) { toast('这条记录没有复习安排。', 'warn'); return; }
        const reviewView = Store.getReviewItemView(item);
        if (!reviewView) { toast('这条记录缺少内容。', 'warn'); return; }
        startReviewQueue([reviewView], { from: 'errors', taskId: null });
        break;
      }
      case 'filter-errors':
        view.errorFilter = actionEl.getAttribute('data-filter') || 'all';
        render();
        break;
      case 'go-errors':
        go('errors');
        break;
      case 'go-training':
        go('train');
        break;
      case 'toggle-error-reason': {
        const errorId = actionEl.getAttribute('data-error-id');
        const reason = actionEl.getAttribute('data-reason');
        const error = Store.state.errors.find(function (e) { return e.id === errorId; });
        if (!error) return;
        let reasons = (error.reasons || []).slice();
        if (reasons.indexOf(reason) !== -1) reasons = reasons.filter(function (r) { return r !== reason; });
        else reasons.push(reason);
        Store.updateErrorReasons(errorId, reasons);
        actionEl.classList.toggle('selected', reasons.indexOf(reason) !== -1);
        actionEl.setAttribute('aria-pressed', String(reasons.indexOf(reason) !== -1));
        if (error.question && error.question.isReal) {
          updateRealTransfer(error);
          render();
        }
        break;
      }
      case 'speak-word': {
        const text = actionEl.getAttribute('data-text');
        const ok = speakText(text, 'W', {
          onUnavailable: function () { toast('当前没有可用英语语音。', 'warn'); }
        });
        if (!ok) toast('当前没有可用英语语音。', 'warn');
        break;
      }
      case 'exit-session':
        exitSession();
        break;
      case 'session-return':
        if (s) finishSessionTo(returnTab(s));
        break;
      case 'vocab-next':
        nextVocab();
        break;
      case 'listening-play':
        playListeningFull();
        break;
      case 'listening-fallback':
        if (s && s.type === 'listening') {
          s.audioFallback = true;
          s.phase = 'answer';
          s.answerStartedAt = Date.now();
          render();
          toast('已显示文字稿。本次不计入听力正确率。', 'warn');
        }
        break;
      case 'play-listening-line':
        playListeningLine(actionEl.getAttribute('data-index'));
        break;
      case 'listening-finish':
        finishListening();
        break;
      case 'reading-hint': {
        const s = view.session;
        if (!s || s.type !== 'reading' || !s.isReal || s.mode !== 'practice') break;
        const current = (s.hintLevels && s.hintLevels[s.index]) || 0;
        const next = Math.min(3, current + 1);
        s.hintLevels[s.index] = next;
        const layer = document.getElementById('real-hint-' + s.index + '-' + next);
        if (layer) layer.hidden = false;
        const count = document.getElementById('hint-count-' + s.index);
        if (count) count.textContent = '已用 ' + next + ' / 3 层';
        const btn = document.querySelector('[data-action="reading-hint"]');
        if (btn && next >= 3) btn.disabled = true;
        break;
      }
      case 'select-evidence':
        selectEvidence(actionEl.getAttribute('data-sentence-id'));
        break;
      case 'reading-next':
        nextReadingPractice();
        break;
      case 'reading-skip':
        if (s && s.type === 'reading' && s.mode === 'timed') submitTimedReading(null, true);
        break;
      case 'review-to-transfer':
        if (s && s.type === 'review') {
          s.stage = 'transfer';
          s.questionStartedAt = Date.now();
          stopSpeech();
          render();
        }
        break;
      case 'review-play-audio':
        playReviewAudio(actionEl.getAttribute('data-target'));
        break;
      case 'review-audio-fallback':
        if (s && s.type === 'review') {
          if (actionEl.getAttribute('data-target') === 'transfer') s.textFallbackTransfer = true;
          else s.textFallbackOriginal = true;
          render();
        }
        break;
      case 'review-next':
        reviewNext();
        break;
      case 'review-no-transfer': {
        if (!s || s.type !== 'review') break;
        const v = currentReviewView(s);
        const key = v.error ? v.error.reviewKey : v.item.key;
        const success = v.error ? !!s.originalCorrect : !!s.transferCorrect;
        const updated = Store.recordReviewOutcome(key, success, { originalCorrect: s.originalCorrect, noTransfer: true });
        s.lastItem = updated;
        s.lastSuccess = success;
        s.stage = 'transfer_feedback';
        s.transferCorrect = success;
        render();
        break;
      }
      case 'check-writing-drill':
        checkWritingDrill();
        break;
      case 'writing-next-drill':
        writingNextDrill();
        break;
      case 'writing-rewrite-drill':
        if (s && s.type === 'writing') { s.drillFeedback = null; render(); }
        break;
      case 'writing-back-drills':
        if (s && s.type === 'writing') { s.phase = 'drills'; s.drillFeedback = null; s.drillIndex = 0; render(); }
        break;
      case 'check-writing-paragraph':
        checkWritingParagraph();
        break;
      case 'writing-back-paragraph':
        if (s && s.type === 'writing') { s.phase = 'paragraph'; s.feedback = null; render(); }
        break;
      case 'finish-writing':
        finishWriting(actionEl.getAttribute('data-rating'));
        break;
      case 'restart-writing':
        if (s && s.type === 'writing') startWritingSession(s.task, { from: s.from, taskId: s.taskId });
        break;
      case 'check-translation':
        checkTranslation();
        break;
      case 'translation-next':
        translationNext();
        break;
      case 'translation-rewrite':
        if (s && s.type === 'translation') { s.feedback = null; s.phase = 'write'; render(); }
        break;
      case 'translation-prev':
        if (s && s.type === 'translation') {
          s.index = Math.max(0, s.index - 1);
          s.phase = 'write';
          s.feedback = null;
          render();
        }
        break;
      case 'finish-translation':
        finishTranslation(actionEl.getAttribute('data-rating'));
        break;
      case 'export-progress': {
        downloadText('cet4-progress-' + isoToday() + '.json', JSON.stringify(Store.exportProgress(), null, 2), 'application/json');
        toast('进度文件已导出。');
        break;
      }
      case 'download-template':
        downloadText('cet4-material-template.json', JSON.stringify(Store.exportMaterialTemplate(), null, 2), 'application/json');
        toast('材料模板已下载。');
        break;
      case 'reset-all':
        if (!window.confirm('这会删除所有设置、答题记录、错题、复习安排和导入材料，且无法撤销。建议先导出。确定继续？')) return;
        if (!window.confirm('最后确认：真的要清空全部本地数据吗？')) return;
        Store.resetAll();
        stopSpeech();
        stopTimer();
        view.session = null;
        view.tab = 'today';
        onboard = { step: 'form', answers: [], index: 0, audioFallback: false };
        render();
        toast('已清空。');
        break;
      default:
        break;
    }
  }

  function onClick(event) {
    const navEl = event.target.closest('[data-nav]');
    if (navEl && root.contains(navEl)) {
      event.preventDefault();
      if (view.session && view.session.phase !== 'done') {
        if (!window.confirm('当前训练还没完成。离开后本项不会记为完成，但已提交的答案会保存。继续？')) return;
      }
      go(navEl.getAttribute('data-nav'));
      return;
    }
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl || !root.contains(actionEl)) return;
    event.preventDefault();
    handleAction(actionEl);
  }

  function onSubmit(event) {
    const form = event.target.closest('form');
    if (!form) return;
    event.preventDefault();
    if (form.id === 'onboarding-form') {
      const fd = new FormData(form);
      const days = Number(fd.get('examDays'));
      const minutes = Number(fd.get('dailyMinutes'));
      if (!Number.isFinite(days) || days < 1 || days > 365) { toast('请填写 1–365 天之间的倒计时。', 'warn'); return; }
      if (!Number.isFinite(minutes) || minutes < 20 || minutes > 90) { toast('每天学习时间请选 20–90 分钟之间。', 'warn'); return; }
      Store.updateProfile({
        examDate: Store.toISODate(Store.addDays(new Date(), Math.round(days))),
        dailyMinutes: minutes,
        target: Number(fd.get('target')) || 550,
        pastExam: fd.get('pastExam') || 'none',
        selfWeak: fd.getAll('selfWeak')
      });
      onboard = { step: 'intro', answers: [], index: 0, audioFallback: false, questionStartedAt: Date.now() };
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (form.id === 'diagnostic-form') {
      handleDiagnosticSubmit(form);
      return;
    }
    if (form.id === 'vocab-form') {
      submitVocabForm(form);
      return;
    }
    if (form.id === 'listening-form') {
      submitListeningForm(form);
      return;
    }
    if (form.id === 'true-listening-form') {
      submitTrueListening(form);
      return;
    }
    if (form.id === 'fill-form') {
      submitFillSession(form);
      return;
    }
    if (form.id === 'match-form') {
      submitMatchSession(form);
      return;
    }
    if (form.id === 'reading-form') {
      const s = currentSession();
      if (!s || s.type !== 'reading') return;
      if (s.mode === 'timed') submitTimedReading(form, false);
      else submitReadingPractice(form);
      return;
    }
    if (form.id === 'review-original-form') {
      submitReviewOriginal(form);
      return;
    }
    if (form.id === 'review-transfer-form') {
      submitReviewTransfer(form);
      return;
    }
    if (form.id === 'profile-form') {
      const fd = new FormData(form);
      const date = String(fd.get('examDate') || '');
      const minutes = Number(fd.get('dailyMinutes'));
      if (!date || !Store.parseISODate(date)) { toast('请选择考试日期。', 'warn'); return; }
      if (!Number.isFinite(minutes) || minutes < 20 || minutes > 90) { toast('每天学习时间请选 20–90 分钟之间。', 'warn'); return; }
      Store.updateProfile({
        examDate: date,
        dailyMinutes: minutes,
        target: Number(fd.get('target')) || 550,
        selfWeak: fd.getAll('selfWeak')
      });
      toast('设置已保存。今日已生成的任务不会自动重排，明天的任务会按新预算生成。');
      render();
    }
  }

  function onInput(event) {
    const target = event.target;
    if (target.id === 'vocab-search') {
      view.vocabSearch = target.value;
      view.vocabPage = 1;
      view.savedPage = 1;
      render();
      setTimeout(function () { const el = document.getElementById('vocab-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
    } else if (target.id === 'output-text' && view.session && view.session.type === 'output') {
      view.session.text = target.value;
      saveOutputDraft();
    } else if (target.matches('input[type="range"][data-range]')) {
      const isSettings = target.getAttribute('data-range') === 'minutes-settings';
      const output = document.getElementById(isSettings ? 'minutes-output-settings' : 'minutes-output');
      if (output) output.textContent = target.value + ' 分钟';
    }
    if (target.matches('[data-word-count-target]')) {
      const countEl = document.getElementById(target.getAttribute('data-word-count-target'));
      if (countEl) countEl.textContent = Checker.wordCount(target.value);
    }
    if (target.matches('[data-draft-key]')) {
      const key = target.getAttribute('data-draft-key');
      const value = target.value;
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        Store.saveDraft(key, value);
        draftTimer = null;
      }, 450);
    }
  }

  function readFileAsText(file) {
    if (file.text) return file.text();
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('read error')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  async function onFileImport(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const kind = input.getAttribute('data-file-import');
    if (file.size > 2 * 1024 * 1024) {
      toast('文件超过 2 MB，未导入。', 'warn');
      input.value = '';
      return;
    }
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      if (kind === 'progress') {
        if (!window.confirm('导入进度会覆盖当前设置、答题记录、错题和复习安排。建议先导出当前进度。继续？')) {
          input.value = '';
          return;
        }
        const result = Store.importProgress(data);
        if (!result.ok) { toast(result.message, 'warn'); input.value = ''; return; }
        view.session = null;
        view.tab = 'today';
        onboard = null;
        render();
        toast(result.message);
      } else {
        const result = Store.importMaterials(data);
        input.value = '';
        if (!result.ok) {
          toast(result.message, 'warn');
          return;
        }
        if (result.warnings && result.warnings.length) {
          window.alert(result.message + '\n\n有内容被跳过：\n' + result.warnings.slice(0, 8).join('\n'));
        } else {
          toast(result.message);
        }
        render();
      }
    } catch (err) {
      toast('文件解析失败：请确认是有效的 JSON。', 'warn');
    }
    input.value = '';
  }

  function updateTrueAnsweredCount() {
    const fields = document.querySelectorAll('select[data-true-q]');
    if (!fields.length) return;
    let filled = 0;
    fields.forEach(function (el) { if (el.value) filled += 1; });
    const el = document.getElementById('true-answered-count');
    if (el) el.textContent = filled + ' / ' + fields.length;
  }

  function onChange(event) {
    const target = event.target;
    if (target.matches('[data-file-import]')) {
      onFileImport(target);
    } else if (target.matches('select[data-true-q]')) {
      updateTrueAnsweredCount();
    } else if (target.id === 'vocab-search') {
      view.vocabSearch = target.value;
      view.vocabPage = 1;
      view.savedPage = 1;
      render();
      setTimeout(function () { const el = document.getElementById('vocab-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
    } else if (target.id === 'output-text') {
      if (view.session && view.session.type === 'output') { view.session.text = target.value; saveOutputDraft(); }
    } else if (target.matches('input[name^="tl-"]')) {
      if (view.session && view.session.type === 'true-listening') {
        const n = target.name.replace('tl-', '');
        view.session.answers[n] = Number(target.value);
        syncTrueListeningNav();
      }
    } else if (target.matches('select[data-true-filter]')) {
      if (!view.trueFilter) trueFilterDefaults();
      const key = target.getAttribute('data-true-filter');
      view.trueFilter[key] = target.value;
      if (key === 'year') view.trueFilter.month = 'all';
      view.trueFilter.page = 1;
      view.trueScroll = null;
      render();
    } else if (target.matches('select[data-library-filter]')) {
      const key = target.getAttribute('data-library-filter');
      if (!view.libraryFilter) view.libraryFilter = { level: 'CET4', year: 'all', status: 'all' };
      view.libraryFilter[key] = target.value;
      if (key === 'level') view.libraryFilter.year = 'all';
      render();
    }
  }

  function warmUpSpeech() {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.getVoices();
      if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = function () {
          try { window.speechSynthesis.getVoices(); } catch (err) {}
        };
      }
    } catch (err) {}
  }

  function bindAppEvents() {
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
  }



  window.CET4App = {
    render: render,
    go: go,
    toast: toast,
    esc: esc,
    stopSpeech: stopSpeech,
    speakText: speakText,
    speakParts: speakParts,
    englishVoices: englishVoices,
    speechUnavailableMessage: speechUnavailableMessage,
    formatClock: formatClock,
    radioOptions: radioOptions,
    reasonChips: reasonChips,
    highlightTerm: highlightTerm,
    audioBadge: audioBadge,
    sourceDisclosure: sourceDisclosure,
    moduleLabel: moduleLabel,
    percent: percent,
    optionLetters: optionLetters,
    emptyState: emptyState,
    ICONS: ICONS
  };

  /* 供后续补充函数使用 */
  window.__CET4_APP_CORE__ = {
    root: root,
    view: view,
    get onboard() { return onboard; },
    set onboard(v) { onboard = v; },
    currentPlan: currentPlan,
    isoToday: isoToday,
    renderOnboarding: renderOnboarding,
    renderHome: renderHome,
    renderTraining: renderTraining,
    renderErrors: renderErrors,
    renderProgress: renderProgress,
    renderSettings: renderSettings,
    stopTimer: stopTimer,
    setTimer: function (handle) { timerHandle = handle; },
    clearDraftTimer: function () { if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; } },
    startOnboarding: startOnboarding,
    pageShell: pageShell,
    sectionHeading: sectionHeading,
    lastReasonHelp: lastReasonHelp
  };

  /* 初始化 */
  if (!Store.state.profile.onboarded) {
    onboard = {
      step: 'form',
      answers: [],
      index: 0,
      questionStartedAt: 0,
      audioFallback: false
    };
  }
  warmUpSpeech();
  bindAppEvents();
  render();
})();

