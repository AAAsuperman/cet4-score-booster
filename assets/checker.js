/* 四级提分台 · 本地规则检查
 * 只用于提示“可核对的问题”，不做评分、不冒充 AI 批改。
 */
(function () {
  'use strict';

  const SPELLING = [
    ['enviroment', 'environment'],
    ['goverment', 'government'],
    ['benifit', 'benefit'],
    ['sucess', 'success'],
    ['successfull', 'successful'],
    ['reponsibility', 'responsibility'],
    ['responsibilty', 'responsibility'],
    ['developement', 'development'],
    ['colleage', 'colleague'],
    ['oppurtunity', 'opportunity'],
    ['recieve', 'receive'],
    ['seperate', 'separate'],
    ['becuase', 'because'],
    ['thier', 'their'],
    ['alot', 'a lot'],
    ['studing', 'studying'],
    ['definately', 'definitely'],
    ['neccessary', 'necessary'],
    ['competant', 'competent'],
    ['acheive', 'achieve'],
    ['accomodation', 'accommodation'],
    ['independant', 'independent'],
    ['occured', 'occurred'],
    ['prefered', 'preferred'],
    ['wether', 'whether'],
    ['wich', 'which'],
    ['immediatly', 'immediately'],
    ['comunication', 'communication'],
    ['knowlege', 'knowledge'],
    ['univercity', 'university'],
    ['convinient', 'convenient'],
    ['intresting', 'interesting'],
    ['tommorow', 'tomorrow'],
    ['untill', 'until'],
    ['writeing', 'writing']
  ];

  const CONNECTORS = /\b(however|therefore|moreover|furthermore|in addition|for example|for instance|as a result|although|though|while|because|since|first|second|finally|overall|in short|on the other hand)\b/gi;

  function normalize(text) {
    return String(text || '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeForMatch(text) {
    return normalize(text)
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[!,;:?()\[\]{}"“”]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordCount(text) {
    const clean = normalize(text).replace(/[’']/g, "'");
    const english = clean.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || [];
    return english.length;
  }

  function sentenceList(text) {
    const clean = normalize(text);
    if (!clean) return [];
    // 保护常见缩写/时间，避免把 "3 p.m. on the first floor" 误拆成新句。
    const protectedText = clean.replace(/\b(a\.m|p\.m|e\.g|i\.e|Mr|Mrs|Ms|Dr|Prof|St|vs|etc)\./gi, function (m) {
      return m.replace(/\./g, '\u0001');
    });
    // 英文新句通常以大写/引号开头；用这个边界减少 "p.m. on..." 这类误判。
    const rough = protectedText.split(/(?<=[.!?])\s+(?=[A-Z"“'])/).map(function (s) {
      return s.replace(/\u0001/g, '.').trim();
    }).filter(Boolean);
    if (rough.length) return rough;
    return [clean];
  }

  function snippetAround(text, index, length) {
    const start = Math.max(0, index - 22);
    const end = Math.min(text.length, index + length + 28);
    let out = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (start > 0) out = '…' + out;
    if (end < text.length) out += '…';
    return out;
  }

  function addIssue(list, tag, message, snippet) {
    const key = tag + '|' + message + '|' + String(snippet || '').slice(0, 60);
    if (list.some(function (x) { return x.key === key; })) return;
    list.push({ key: key, tag: tag, message: message, snippet: snippet || '' });
  }

  function checkText(text) {
    const original = normalize(text);
    const lower = original.toLowerCase();
    const issues = [];
    const words = wordCount(original);
    const sentences = sentenceList(original);
    let sentenceCount = sentences.length;
    const avgSentenceLength = sentenceCount ? Math.round((words / sentenceCount) * 10) / 10 : 0;

    if (!original) {
      return { words: 0, sentenceCount: 0, avgSentenceLength: 0, issues: [], sentences: [], connectors: 0 };
    }

    if (/[\u4e00-\u9fff]/.test(original)) {
      addIssue(issues, 'chinese', '包含中文字符；考试作答需要全英文。', '');
    }

    SPELLING.forEach(function (pair) {
      const re = new RegExp('\\b' + pair[0] + '\\b', 'gi');
      let m;
      while ((m = re.exec(original)) !== null) {
        addIssue(issues, 'spelling', '拼写疑似错误：' + m[0] + ' → ' + pair[1], snippetAround(original, m.index, m[0].length));
        if (re.lastIndex === m.index) re.lastIndex++;
      }
    });

    const grammarRules = [
      {
        re: /\b(he|she|it)\s+(go|have|do|make|take|study|like|want|need|think|say|help|use|live|work)\b/gi,
        message: '第三人称单数：主语是 he/she/it 时，一般现在时动词通常加 -s/-es。'
      },
      {
        re: /\b(people|students|they|we|you)\s+(is|was|has)\b/gi,
        message: '主谓一致：people/students/they/we/you 后通常用 are/were/have。'
      },
      {
        re: /\bI\s+(is|are|has)\b/gi,
        message: '主谓一致：I 后通常用 am/were/have。'
      },
      {
        re: /\bmore\s+(better|easier|faster|cheaper|more)\b/gi,
        message: '比较级重复：more 与 -er 或 more 不要叠加。'
      },
      {
        re: /\b(most|the most)\s+(best|easiest|fastest|cheapest)\b/gi,
        message: '最高级重复：most 与 -est 不要叠加。'
      },
      {
        re: /\bthere\s+(have|has)\b/gi,
        message: '“有”表示存在时，可用 there is/are；不要写 there have。'
      },
      {
        re: /\b(can|must|should|will|may|might|could)\s+to\s+\w+/gi,
        message: '情态动词后直接接动词原形，不加 to。'
      },
      {
        re: /\bwill\s+can\b/gi,
        message: '不要连用 will can；可改成 will be able to。'
      },
      {
        re: /\b(discuss about|explain me|look forward to see|marry with)\b/gi,
        message: '固定搭配疑似错误：discuss sth / explain sth to sb / look forward to doing / marry sb。'
      },
      {
        re: /\bI\s+very\s+(like|want|need|enjoy)\b/gi,
        message: 'very 通常不直接修饰动词；可用 I really like 或 I like ... very much。'
      },
      {
        re: /\bone of the\s+(student|book|reason|way|thing)\b/gi,
        message: 'one of the 后通常接可数名词复数。'
      },
      {
        re: /\bnot only\b[^.!?]*\bbut\s+also\b/gi,
        message: '使用了 not only ... but also ...；提交前确认前后结构是否平行。',
        soft: true
      }
    ];

    grammarRules.forEach(function (rule) {
      let m;
      while ((m = rule.re.exec(original)) !== null) {
        addIssue(issues, rule.soft ? 'style' : 'grammar', rule.message, snippetAround(original, m.index, m[0].length));
        if (rule.re.lastIndex === m.index) rule.re.lastIndex++;
      }
    });

    const althoughBut = /\b(although|though|even though)\b[^.!?]*\bbut\b/gi;
    let ab;
    while ((ab = althoughBut.exec(original)) !== null) {
      addIssue(issues, 'grammar', 'although/though 与 but 不在同一句里同时使用。', snippetAround(original, ab.index, ab[0].length));
      if (althoughBut.lastIndex === ab.index) althoughBut.lastIndex++;
    }

    const becauseSo = /\bbecause\b[^.!?]*\bso\b/gi;
    let bs;
    while ((bs = becauseSo.exec(original)) !== null) {
      addIssue(issues, 'grammar', 'because 和 so 不在同一句里同时使用。', snippetAround(original, bs.index, bs[0].length));
      if (becauseSo.lastIndex === bs.index) becauseSo.lastIndex++;
    }

    const commaHowever = /,\s*(however|therefore|moreover|furthermore)\s+(?![,.;])/gi;
    let ch;
    while ((ch = commaHowever.exec(original)) !== null) {
      addIssue(issues, 'grammar', '连接副词前常见问题：两个完整句之间用分号或句号，不要只用逗号。', snippetAround(original, ch.index, ch[0].length));
      if (commaHowever.lastIndex === ch.index) commaHowever.lastIndex++;
    }

    const redundant = [
      [/\bin my opinion,?\s+i think\b/gi, '语义重复：In my opinion 与 I think 取一个即可。'],
      [/\bnowadays,?\s+with the rapid development of\b/gi, '开头略显模板化；可以更具体地说明现象。'],
      [/\bmore and more\b/gi, 'more and more 可以用，但全篇反复出现会显得单一；可换 a growing number of。', true]
    ];
    redundant.forEach(function (item) {
      let m;
      while ((m = item[0].exec(original)) !== null) {
        addIssue(issues, item[2] ? 'style' : 'clarity', item[1], snippetAround(original, m.index, m[0].length));
        if (item[0].lastIndex === m.index) item[0].lastIndex++;
      }
    });

    sentences.forEach(function (sentence, index) {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      if (!/^[A-Z"']/.test(trimmed)) {
        addIssue(issues, 'punctuation', '句首字母或引号需要大写。', snippetAround(trimmed, 0, Math.min(18, trimmed.length)));
      }
      const lettersOnly = trimmed.replace(/[^A-Za-z]/g, '');
      if (/[A-Za-z]/.test(trimmed) && !/[.!?]["']?$/.test(trimmed)) {
        addIssue(issues, 'punctuation', '句子末尾缺少标点。', snippetAround(trimmed, Math.max(0, trimmed.length - 36), 36));
      }
      if (wordCount(trimmed) > 32) {
        addIssue(issues, 'clarity', '这一句超过 32 词，读者可能抓不住主干；考虑拆成两句。', snippetAround(trimmed, 0, Math.min(64, trimmed.length)));
      }
      if (lettersOnly.length === 0) {
        addIssue(issues, 'clarity', '这一句没有英文内容。', '');
      }
      if (index > 0 && trimmed.length > 0) {
        const prev = sentences[index - 1].trim();
        if (prev && !/[.!?]["']?$/.test(prev)) {
          addIssue(issues, 'punctuation', '上一句末尾可能缺少标点。', snippetAround(prev, Math.max(0, prev.length - 32), 32));
        }
      }
    });

    if (sentenceCount >= 3) {
      const connectors = lower.match(CONNECTORS) || [];
      if (connectors.length === 0) {
        addIssue(issues, 'clarity', '段内没有明显的衔接词；可以加一处 however / for example / therefore，让逻辑更清楚。', '');
      }
    }

    const connectors = (lower.match(CONNECTORS) || []).length;
    return {
      words: words,
      sentenceCount: sentenceCount,
      avgSentenceLength: avgSentenceLength,
      connectors: connectors,
      issues: issues,
      sentences: sentences
    };
  }

  function groupIssues(issues) {
    return {
      grammar: issues.filter(function (x) { return x.tag === 'grammar' || x.tag === 'punctuation'; }),
      spelling: issues.filter(function (x) { return x.tag === 'spelling'; }),
      unclear: issues.filter(function (x) { return x.tag === 'clarity' || x.tag === 'style'; }),
      chinese: issues.filter(function (x) { return x.tag === 'chinese'; })
    };
  }

  function matchGroup(text, options) {
    const normalized = normalizeForMatch(text);
    return (options || []).some(function (option) {
      const o = normalizeForMatch(option);
      return o && normalized.indexOf(o) !== -1;
    });
  }

  function coverage(text, groups) {
    return (groups || []).map(function (group) {
      return {
        label: group.label,
        covered: matchGroup(text, group.options || group.keywords || []),
        options: group.options || group.keywords || []
      };
    });
  }

  function checkWritingSentence(text, drill) {
    const checked = checkText(text);
    const ideaCoverage = coverage(text, drill.keyIdeas || []);
    let requiredMatched = 0;
    const requiredGroups = drill.requiredAny || [];
    requiredGroups.forEach(function (group) {
      if (matchGroup(text, group)) requiredMatched += 1;
    });
    const structureMatched = requiredGroups.length === 0 || requiredMatched === requiredGroups.length;
    return {
      empty: !normalize(text),
      text: normalize(text),
      stats: checked,
      coverage: ideaCoverage,
      coverageCount: ideaCoverage.filter(function (x) { return x.covered; }).length,
      structureMatched: structureMatched,
      requiredMatched: requiredMatched,
      requiredTotal: requiredGroups.length
    };
  }

  function checkWritingParagraph(text, task) {
    const checked = checkText(text);
    const points = coverage(text, task.contentPoints || []);
    const groups = groupIssues(checked.issues);
    const target = task.targetWords || [90, 120];
    const notes = [];
    if (checked.words < target[0]) {
      notes.push('篇幅偏短：目前 ' + checked.words + ' 词，题目建议约 ' + target[0] + '–' + target[1] + ' 词。');
    } else if (checked.words > target[1] + 25) {
      notes.push('篇幅超出较多：目前 ' + checked.words + ' 词，先删重复解释，保留清楚的观点、理由和例子。');
    }
    const missing = points.filter(function (p) { return !p.covered; });
    if (missing.length) {
      notes.push('有 ' + missing.length + ' 个内容要点没有被本地关键词识别：' + missing.map(function (p) { return p.label; }).join('、') + '。这不等于一定偏题，但请回看题目要求。');
    }
    return {
      empty: !normalize(text),
      stats: checked,
      groups: groups,
      points: points,
      missingPoints: missing,
      notes: notes,
      target: target
    };
  }

  function checkTranslationSentence(text, sentence) {
    const checked = checkText(text);
    const points = coverage(text, sentence.chunks || []);
    const covered = points.filter(function (p) { return p.covered; }).length;
    return {
      empty: !normalize(text),
      stats: checked,
      groups: groupIssues(checked.issues),
      points: points,
      covered: covered,
      total: points.length,
      ratio: points.length ? covered / points.length : 0
    };
  }

  function checkTranslationTask(answers, task) {
    let covered = 0;
    let total = 0;
    const results = task.sentences.map(function (sentence, index) {
      const text = (answers && answers[index]) || '';
      const result = checkTranslationSentence(text, sentence);
      covered += result.covered;
      total += result.total;
      return result;
    });
    return {
      results: results,
      covered: covered,
      total: total,
      ratio: total ? covered / total : 0
    };
  }

  window.CET4Checker = {
    normalize: normalize,
    normalizeForMatch: normalizeForMatch,
    wordCount: wordCount,
    sentenceList: sentenceList,
    checkText: checkText,
    groupIssues: groupIssues,
    coverage: coverage,
    matchGroup: matchGroup,
    checkWritingSentence: checkWritingSentence,
    checkWritingParagraph: checkWritingParagraph,
    checkTranslationSentence: checkTranslationSentence,
    checkTranslationTask: checkTranslationTask
  };
})();
