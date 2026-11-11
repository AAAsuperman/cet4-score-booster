/* Public demo data only. This is NOT a CET true exam.
 * It exists so the GitHub Pages demo can be opened without distributing
 * third-party PDFs, MP3s or question banks.
 */
(function () {
  'use strict';
  window.CET4Demo = true;
  window.CET4TrueData = { exams: [] };
  window.CET4RealData = { paragraphs: [], questions: [], practiceSets: [], skills: {}, exam: {} };
  window.CET4ListeningSets = [];
  window.CET4ListeningTranscripts = [];
  window.CET4FillSets = [];
  window.CET4MatchSets = [];
  window.CET4OutputTasks = [];
  window.CET4ReadingBanks = [{
    id: 'demo-reading',
    year: 'DEMO',
    set: 1,
    title: '公开演示 · 阅读短文',
    shortTitle: '公开演示 · 非真题',
    source: '公开演示数据（非真题，不含任何第三方题库/音频）',
    sourceLabel: '公开演示 · 非真题',
    level: '演示 · 阅读',
    isReal: true,
    verified: 0,
    answerVerified: 0,
    analysisPending: false,
    examMeta: { shortTitle: '公开演示', paperFile: '#' },
    paragraphs: [{
      id: 'demo-p1',
      label: 'Demo Passage',
      sentences: [
        { id: 'demo-s1', text: 'Taking notes by hand is slower than typing, but the slowness can be useful.' },
        { id: 'demo-s2', text: 'When students write a sentence in their own words, they must first decide what the speaker means.' },
        { id: 'demo-s3', text: 'This extra step helps them remember the main idea rather than a string of separate words.' },
        { id: 'demo-s4', text: 'Typing is faster, so students often copy a lecture word for word without processing it.' },
        { id: 'demo-s5', text: 'The best method is not simply to reject technology; it is to choose the tool that makes the learner think.' }
      ]
    }],
    questions: [
      {
        id: 'demo-q1', number: 1, passageId: 'demo-p1', page: 1,
        stem: 'Why can slower note-taking be useful?',
        options: ['It gives students more time to rest.', 'It forces students to process meaning.', 'It produces a longer record of the lecture.', 'It replaces the need to review.'],
        answer: 1, skills: { primary: 'detail', secondary: ['cause'] }, targetSeconds: 70,
        hints: { keyword: 'slow / useful', structure: 'Find the cause after “the slowness can be useful”.', location: 'Demo Passage sentence 2.' },
        explain: 'The passage says writing a sentence in one’s own words forces the learner to decide what the speaker means; that processing helps memory.',
        paraphrase: 'must first decide what the speaker means → forces students to process meaning.',
        optionNotes: ['A 错：没有提到休息。', 'B 对：own words → decide meaning。', 'C 错：手写反而更慢，不是更长记录。', 'D 错：没有说不需要复习。'],
        evidenceId: 'demo-s2', evidenceText: 'When students write a sentence in their own words, they must first decide what the speaker means.',
        vocabFocus: [{ term: 'in one’s own words', meaning: '用自己的话', note: '强调转述而不是照抄。' }],
        tags: { bigType: 'reading-c', skill: 'detail', difficulty: ['paraphrase'], distractors: ['unsupported'] },
        skillLabel: '细节定位', analysisSource: '公开演示解析（非真题）'
      },
      {
        id: 'demo-q2', number: 2, passageId: 'demo-p1', page: 1,
        stem: 'What do students often do when typing notes?',
        options: ['They discuss the lecture with classmates.', 'They copy the lecture without thinking about it.', 'They draw diagrams instead of writing.', 'They stop listening to the speaker.'],
        answer: 1, skills: { primary: 'detail', secondary: ['contrast'] }, targetSeconds: 70,
        hints: { keyword: 'typing / often', structure: 'Contrast with handwriting; “word for word”.', location: 'Demo Passage sentence 4.' },
        explain: 'The passage says typing is fast, so students often copy a lecture word for word without processing it.',
        paraphrase: 'copy a lecture word for word without processing it → copy without thinking about it.',
        optionNotes: ['A 错：没有讨论。', 'B 对：word for word without processing。', 'C 错：没有画图。', 'D 错：仍在听，只是未加工。'],
        evidenceId: 'demo-s4', evidenceText: 'Typing is faster, so students often copy a lecture word for word without processing it.',
        vocabFocus: [{ term: 'word for word', meaning: '逐字地', note: '强调照抄。' }],
        tags: { bigType: 'reading-c', skill: 'detail', difficulty: ['paraphrase'], distractors: ['unsupported'] },
        skillLabel: '细节定位', analysisSource: '公开演示解析（非真题）'
      },
      {
        id: 'demo-q3', number: 3, passageId: 'demo-p1', page: 1,
        stem: 'What is the author’s main point?',
        options: ['Handwriting should completely replace typing.', 'Technology should be banned in classrooms.', 'The tool should support active thinking.', 'Students should take fewer notes.'],
        answer: 2, skills: { primary: 'main_idea', secondary: ['attitude'] }, targetSeconds: 75,
        hints: { keyword: 'best method / not simply', structure: 'The last sentence rejects a simple either/or answer.', location: 'Demo Passage sentence 5.' },
        explain: 'The last sentence says the best method is not to reject technology but to choose the tool that makes the learner think.',
        paraphrase: 'choose the tool that makes the learner think → support active thinking.',
        optionNotes: ['A 错：作者没有要求完全取代。', 'B 错：没有说禁止技术。', 'C 对：选择让人思考的工具。', 'D 错：不是减少笔记。'],
        evidenceId: 'demo-s5', evidenceText: 'The best method is not simply to reject technology; it is to choose the tool that makes the learner think.',
        vocabFocus: [{ term: 'reject', meaning: '拒绝；排斥', note: 'not simply to reject...。' }],
        tags: { bigType: 'reading-c', skill: 'main_idea', difficulty: ['paraphrase'], distractors: ['absolute'] },
        skillLabel: '主旨', analysisSource: '公开演示解析（非真题）'
      },
      {
        id: 'demo-q4', number: 4, passageId: 'demo-p1', page: 1,
        stem: 'What does “this extra step” refer to?',
        options: ['Choosing a keyboard.', 'Deciding what the speaker means.', 'Reading the notes aloud.', 'Reviewing before an exam.'],
        answer: 1, skills: { primary: 'detail', secondary: ['reference'] }, targetSeconds: 70,
        hints: { keyword: 'this extra step', structure: 'Look at the previous sentence for the action.', location: 'Demo Passage sentences 2–3.' },
        explain: '“This extra step” refers back to deciding what the speaker means before writing the sentence in one’s own words.',
        paraphrase: 'decide what the speaker means → understand the meaning before writing.',
        optionNotes: ['A 错：没有键盘选择。', 'B 对：指前一句的判断动作。', 'C 错：没有朗读。', 'D 错：不是考前复习。'],
        evidenceId: 'demo-s2', evidenceText: 'When students write a sentence in their own words, they must first decide what the speaker means.',
        vocabFocus: [{ term: 'extra step', meaning: '额外的步骤', note: '指先理解再写。' }],
        tags: { bigType: 'reading-c', skill: 'detail', difficulty: ['reference'], distractors: ['detail_confusion'] },
        skillLabel: '指代', analysisSource: '公开演示解析（非真题）'
      },
      {
        id: 'demo-q5', number: 5, passageId: 'demo-p1', page: 1,
        stem: 'What does the author imply about note-taking tools?',
        options: ['They matter less than how the learner uses them.', 'They are equally effective for every student.', 'They should be chosen by price alone.', 'They determine a student’s intelligence.'],
        answer: 0, skills: { primary: 'inference', secondary: ['attitude'] }, targetSeconds: 80,
        hints: { keyword: 'imply / tools', structure: 'The final sentence focuses on the learner thinking, not the tool itself.', location: 'Demo Passage sentence 5.' },
        explain: 'The final sentence shifts the focus from rejecting technology to choosing a tool that makes the learner think, implying that use matters more than the tool label.',
        paraphrase: 'the tool that makes the learner think → how the learner uses it.',
        optionNotes: ['A 对：工具服务于思考。', 'B 错：没有说人人同等。', 'C 错：没有提价格。', 'D 错：把工具与智力挂钩，过度推断。'],
        evidenceId: 'demo-s5', evidenceText: 'The best method is not simply to reject technology; it is to choose the tool that makes the learner think.',
        vocabFocus: [{ term: 'imply', meaning: '暗示；意味着', note: '推断题常见题干词。' }],
        tags: { bigType: 'reading-c', skill: 'inference', difficulty: ['paraphrase'], distractors: ['overstatement'] },
        skillLabel: '推断', analysisSource: '公开演示解析（非真题）'
      }
    ]
  }];
})();
