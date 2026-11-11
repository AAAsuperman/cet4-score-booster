/* 四级提分台 · 内置示例内容
 * 说明：词汇为备考常用词示例，不是真题词频榜；
 * 听力/阅读/写作/翻译/短测均为原创模拟材料，不是四级真题。
 */
(function () {
  'use strict';

  const DISCLAIMERS = {
    materials: '内置词汇是“备考常用词示例”，不是真题高频榜；没有统计或声称任何年份、出现次数、出处。',
    mock: '内置听力、阅读、写作、翻译与短测均为原创模拟材料，不是四级真题，也不代表官方命题或难度。',
    audio: '听力由浏览器语音合成朗读，只是练习演示，不是真题录音，也不是官方音色。',
    grading: '写作与翻译使用本地规则检查要点覆盖、常见语法和拼写，只给出可核对的问题；不进行官方评分，也不冒充 AI 评分。参考表达不唯一。',
    score: '短测和练习统计只用于安排训练，不预测考试分数，也不保证达到目标分数。',
    privacy: '全部作答保存在本机浏览器 localStorage。清理浏览器数据会丢失进度，请定期导出备份。'
  };

  /* ============================== 语境词 ============================== */
  const VOCABULARY = [
    {
      id: 'address',
      word: 'address',
      phonetic: '/əˈdres/',
      pos: 'v.',
      tags: ['熟词生义', '常见搭配'],
      sentence: 'The report calls on the city to address the shortage of affordable housing.',
      sentenceCn: '报告呼吁该市解决经济适用房短缺的问题。',
      contextMeaning: '解决，处理（问题）',
      otherMeanings: [
        { pos: 'n.', meaning: '地址' },
        { pos: 'v.', meaning: '向……讲话；称呼' }
      ],
      collocations: ['address a problem / an issue', 'address a meeting', 'be addressed to sb.'],
      confusion: '不要只按“地址”理解。当宾语是 problem、need、concern、shortage 这类词时，address 常表示“着手处理/回应”。',
      example: 'The new manager promised to address the staff’s concerns at the next meeting.',
      exampleCn: '新经理承诺在下次会议上处理员工关心的问题。',
      exampleNote: 'address + concerns = 回应/处理关切，不是“给关切一个地址”。',
      examLink: '原文 address the shortage → 正确选项常用 deal with / tackle the lack of 改写。看到“问题、需求、关切”作宾语，先想到“处理”。',
      question: {
        stem: '在原句中，address 最接近的意思是：',
        options: ['给……写地址', '解决，处理', '发表演讲', '避开'],
        answer: 1,
        explain: '宾语是 the shortage of affordable housing（经济适用房短缺），address 在此表示“着手解决”。'
      },
      transfer: {
        stem: '新语境：The plan fails to address the needs of older residents. 这里 address 的意思是：',
        options: ['解决、满足（需求）', '为……提供住址', '公开批评', '记录'],
        answer: 0,
        explain: 'address the needs = 回应/满足需求，仍是“处理”这一类含义，不是“地址”。'
      }
    },
    {
      id: 'present',
      word: 'present',
      phonetic: '/prɪˈzent/',
      pos: 'v.',
      tags: ['多义词', '词性转换'],
      sentence: 'The report presents a familiar challenge in a new light.',
      sentenceCn: '这份报告从一个新的角度呈现了一个熟悉的挑战。',
      contextMeaning: '呈现，展示',
      otherMeanings: [
        { pos: 'n.', meaning: '礼物；现在' },
        { pos: 'adj.', meaning: '出席的；现在的' },
        { pos: 'v.', meaning: '提出；颁发' }
      ],
      collocations: ['present a challenge / findings', 'present sth in a new light', 'be present at', 'at present'],
      confusion: '作动词时重音在后 /prɪˈzent/，作名词或形容词时重音常在前 /ˈpreznt/。阅读里要按句子成分判断词性。',
      example: 'The survey presents evidence that students need more sleep.',
      exampleCn: '这项调查提供了学生需要更多睡眠的证据。',
      exampleNote: 'present evidence = 呈现/提供证据；不是“礼物证据”。',
      examLink: '原文 presents a challenge → 选项可改写为 raises / shows a difficulty。正确选项不一定重复原词。',
      question: {
        stem: '在原句中，presents 最接近的意思是：',
        options: ['赠送', '呈现，展示', '出席', '目前'],
        answer: 1,
        explain: '主语 the report，宾语 a familiar challenge；present 作动词，表示“呈现”。'
      },
      transfer: {
        stem: '新语境：The speaker presented her findings in a clear way. 这里 presented 的意思是：',
        options: ['展示，陈述', '赠送', '主持', '缺席'],
        answer: 0,
        explain: 'present findings = 陈述/展示研究结果。'
      }
    },
    {
      id: 'figure',
      word: 'figure',
      phonetic: '/ˈfɪɡə(r)/',
      pos: 'v.',
      tags: ['熟词生义', '动词用法'],
      sentence: 'Officials figure that the new bus route will reduce traffic in the city center.',
      sentenceCn: '官员们估计，新公交线路会减少市中心的交通流量。',
      contextMeaning: '认为，估计',
      otherMeanings: [
        { pos: 'n.', meaning: '数字；人物；身材' },
        { pos: 'v.', meaning: '计算；figure out 弄明白' }
      ],
      collocations: ['figure that ...', 'figure out', 'a key figure', 'sales figures'],
      confusion: 'figure 不只有“数字”义。作动词且后接 that 从句时，常表示“估计/认为”；figure out 才是“弄明白”。',
      example: 'It took us a while to figure out why the machine had stopped.',
      exampleCn: '我们花了一会儿才弄明白机器为什么停了。',
      exampleNote: 'figure out = work out / understand，是四级阅读和听力中常见的短语。',
      examLink: '原文 figure that ... → 选项可改写为 estimate / believe that ...。看到 figures 也不一定是“人物”，要看上下文。',
      question: {
        stem: '在原句中，figure 最接近的意思是：',
        options: ['画图', '认为，估计', '出现', '数字'],
        answer: 1,
        explain: 'Officials figure that ... = 官员们估计……。figure 后接 that 从句，作动词。'
      },
      transfer: {
        stem: '新语境：I can’t figure out how this app works. 这里 figure out 的意思是：',
        options: ['弄明白', '算出价格', '画出样子', '放弃'],
        answer: 0,
        explain: 'figure out = 弄明白、想出。'
      }
    },
    {
      id: 'secure',
      word: 'secure',
      phonetic: '/sɪˈkjʊə(r)/',
      pos: 'v.',
      tags: ['熟词生义', '合同场景'],
      sentence: 'The company secured a contract to supply electric buses to the city.',
      sentenceCn: '这家公司获得了一份向该市供应电动公交车的合同。',
      contextMeaning: '获得，争取到（合同、机会）',
      otherMeanings: [
        { pos: 'adj.', meaning: '安全的；牢固的' },
        { pos: 'v.', meaning: '保护，使安全' }
      ],
      collocations: ['secure a contract / a place / a job', 'secure against', 'feel secure'],
      confusion: '在求职、合同、名额语境中，secure 常是“成功获得”，不是“把……变安全”。',
      example: 'She secured a place on the course after a short interview.',
      exampleCn: '经过简短面试，她获得了这门课程的席位。',
      exampleNote: 'secure a place = 成功拿到名额；可与 obtain / win 替换。',
      examLink: '原文 secured a contract → 正确选项常用 obtained / won a contract 改写。不要只记住形容词“安全的”。',
      question: {
        stem: '在原句中，secured 最接近的意思是：',
        options: ['保护', '获得', '固定', '担保'],
        answer: 1,
        explain: '宾语是 a contract；secure a contract 表示“获得合同”。'
      },
      transfer: {
        stem: '新语境：The team secured a narrow victory in the final minute. 这里 secured 的意思是：',
        options: ['取得', '保护', '失去', '庆祝'],
        answer: 0,
        explain: 'secure a victory = 取得胜利；仍是“成功获得”的引申。'
      }
    },
    {
      id: 'reserve',
      word: 'reserve',
      phonetic: '/rɪˈzɜːv/',
      pos: 'n.',
      tags: ['多义词', '名词用法'],
      sentence: 'The reserve of clean water is shrinking faster than many people realize.',
      sentenceCn: '清洁水的储备正在以许多人没有意识到的速度减少。',
      contextMeaning: '储备（量）',
      otherMeanings: [
        { pos: 'v.', meaning: '预订；保留' },
        { pos: 'n.', meaning: '自然保护区' },
        { pos: 'adj.', meaning: 'reserved 矜持的；预留的' }
      ],
      collocations: ['water / oil reserves', 'reserve a table', 'nature reserve', 'without reserve'],
      confusion: 'reserve 作名词可以指“储备/保护区”，作动词才是“预订”。不要看到 reserve 就默认“预订”。',
      example: 'We reserved a table for six, but two guests cancelled.',
      exampleCn: '我们预订了一张六人桌，但有两位客人取消了。',
      exampleNote: '这里 reserve 是动词“预订”；reservation 是名词“预订”。',
      examLink: '原文 the reserve of clean water → 选项可能用 supply / stock of water 改写。词性判断先看冠词和 of 结构。',
      question: {
        stem: '在原句中，reserve 的意思是：',
        options: ['预订', '储备', '保护区', '保留意见'],
        answer: 1,
        explain: 'the reserve of clean water = 清洁水储备；reserve 作名词。'
      },
      transfer: {
        stem: '新语境：The nature reserve protects several rare birds. 这里 reserve 的意思是：',
        options: ['保护区', '预订', '储备量', '保留'],
        answer: 0,
        explain: 'nature reserve = 自然保护区，是常见搭配。'
      }
    },
    {
      id: 'practice',
      word: 'practice',
      phonetic: '/ˈpræktɪs/',
      pos: 'n.',
      tags: ['固定搭配', '熟词生义'],
      sentence: 'In practice, the new rule has made little difference to most students.',
      sentenceCn: '实际上，这项新规定对大多数学生几乎没有影响。',
      contextMeaning: '实际上，在实践中',
      otherMeanings: [
        { pos: 'n.', meaning: '练习；惯例，惯常做法' },
        { pos: 'v.', meaning: '练习（英式拼写常作 practise）' }
      ],
      collocations: ['in practice', 'put sth into practice', 'common practice', 'practice doing sth'],
      confusion: 'in practice 常不是“在练习中”，而是“实际上”。practice 作名词还可表示“惯常做法”。',
      example: 'It is common practice to ask for permission before recording a lecture.',
      exampleCn: '在录制讲座前先征得同意是一种常见做法。',
      exampleNote: 'common practice = 惯常做法；不是“常见练习”。',
      examLink: '原文 in practice → 正确选项常用 in reality / in fact 改写。短语题先判断它在句中作什么成分。',
      question: {
        stem: '在原句中，In practice 最接近的意思是：',
        options: ['在练习中', '实际上', '在实践中学习', '按规定'],
        answer: 1,
        explain: 'In practice 与后半句“几乎没有影响”构成转折/事实陈述，表示“实际上”。'
      },
      transfer: {
        stem: '新语境：The school has made it a practice to check the equipment every week. 这里 practice 的意思是：',
        options: ['惯例，惯常做法', '练习册', '开业', '实际操作'],
        answer: 0,
        explain: 'make it a practice to do = 把……作为惯例。'
      }
    },
    {
      id: 'subject',
      word: 'subject',
      phonetic: '/ˈsʌbdʒɪkt/',
      pos: 'adj.',
      tags: ['固定搭配', '被动含义'],
      sentence: 'The schedule is subject to change if the weather gets worse.',
      sentenceCn: '如果天气变差，日程可能会调整。',
      contextMeaning: '可能受……影响；取决于',
      otherMeanings: [
        { pos: 'n.', meaning: '科目；主题；研究对象' },
        { pos: 'v.', meaning: 'subject sb/sth to 使遭受' },
        { pos: 'adj.', meaning: 'be subject to 受制于；须经' }
      ],
      collocations: ['be subject to change', 'be subject to approval', 'change the subject', 'subject sb to sth'],
      confusion: 'be subject to 不是“成为主题”，而是“受……影响/须经……”。to 后面常接名词或动词原形。',
      example: 'All applications are subject to review by a committee.',
      exampleCn: '所有申请都须经委员会审核。',
      exampleNote: 'be subject to review = 须经审核；不是“成为审核的主题”。',
      examLink: '原文 is subject to change → 选项可用 may change / can be changed 改写。注意情态和被动语态。',
      question: {
        stem: '在原句中，is subject to change 的意思是：',
        options: ['改变了主题', '可能发生变化', '必须保持不变', '取决于天气'],
        answer: 1,
        explain: 'be subject to change = 可能会改变；if 从句进一步说明条件。'
      },
      transfer: {
        stem: '新语境：The plan is subject to the manager’s approval. 这里 subject to 的意思是：',
        options: ['须经……批准', '是……的主题', '受……欢迎', '代替……'],
        answer: 0,
        explain: 'be subject to approval = 须经批准。'
      }
    },
    {
      id: 'account',
      word: 'account',
      phonetic: '/əˈkaʊnt/',
      pos: 'v.',
      tags: ['短语动词', '因果逻辑'],
      sentence: 'The decline in sales can be accounted for by the rise in online shopping.',
      sentenceCn: '销售额下降的原因可以通过网购的兴起得到解释。',
      contextMeaning: 'account for = 解释；说明原因',
      otherMeanings: [
        { pos: 'n.', meaning: '账户；描述；账目' },
        { pos: 'phr.', meaning: 'take sth into account 考虑' },
        { pos: 'phr.', meaning: 'on account of 因为' }
      ],
      collocations: ['account for', 'take into account', 'on account of', 'a bank account'],
      confusion: 'account for 除了“占（比例）”，还常考“解释，说明原因”。判断依据是主语和 by 短语。',
      example: 'She could not account for the missing files.',
      exampleCn: '她无法解释这些文件为什么不见了。',
      exampleNote: 'account for the missing files = 解释文件去向；不是“为文件开账户”。',
      examLink: '原文 can be accounted for by → 选项可改写为 can be explained by。因果题常把短语换成普通动词。',
      question: {
        stem: '在原句中，can be accounted for 最接近的意思是：',
        options: ['可以被计算', '可以得到解释', '可以被记账', '应该被考虑'],
        answer: 1,
        explain: 'be accounted for by = 由……解释/说明。'
      },
      transfer: {
        stem: '新语境：Women account for nearly half of the workforce. 这里 account for 的意思是：',
        options: ['占（比例）', '解释', '照顾', '记账'],
        answer: 0,
        explain: 'account for + 比例 = 占……；同一短语的另一个常见考点。'
      }
    },
    {
      id: 'observe',
      word: 'observe',
      phonetic: '/əbˈzɜːv/',
      pos: 'v.',
      tags: ['熟词生义', '规则场景'],
      sentence: 'All visitors must observe the safety rules while the laboratory is open.',
      sentenceCn: '实验室开放期间，所有访客都必须遵守安全规则。',
      contextMeaning: '遵守（规则、法律）',
      otherMeanings: [
        { pos: 'v.', meaning: '观察；注意到' },
        { pos: 'v.', meaning: '评论，说' },
        { pos: 'n.', meaning: 'observation 观察' }
      ],
      collocations: ['observe the rules / the law', 'observe that ...', 'under observation'],
      confusion: 'observe 后接 rules、law、tradition 时是“遵守”，不是“观察规则”。',
      example: 'The researchers observed a clear change in the birds’ behaviour.',
      exampleCn: '研究人员观察到鸟类行为出现了明显变化。',
      exampleNote: 'observe + 现象 = 观察到；看宾语性质判断。',
      examLink: '原文 observe the safety rules → 选项常用 follow / obey the rules 改写。熟词生义题要允许同义替换。',
      question: {
        stem: '在原句中，observe 的意思是：',
        options: ['观察', '遵守', '评论', '庆祝'],
        answer: 1,
        explain: '宾语是 the safety rules；observe rules = 遵守规则。'
      },
      transfer: {
        stem: '新语境：She observed that few students used the recycling bins. 这里 observed 的意思是：',
        options: ['评论/指出', '遵守', '庆祝', '忽视'],
        answer: 0,
        explain: 'observe that ... = 评论/指出；也可理解为“注意到”。'
      }
    },
    {
      id: 'sustain',
      word: 'sustain',
      phonetic: '/səˈsteɪn/',
      pos: 'v.',
      tags: ['学术用词', '搭配'],
      sentence: 'It is difficult to sustain attention for two hours without a short break.',
      sentenceCn: '如果不短暂休息，很难连续两小时保持注意力。',
      contextMeaning: '维持，保持',
      otherMeanings: [
        { pos: 'v.', meaning: '支撑，承受' },
        { pos: 'v.', meaning: '遭受（伤害、损失）' },
        { pos: 'adj.', meaning: 'sustainable 可持续的' }
      ],
      collocations: ['sustain attention / growth', 'sustain an injury', 'sustainable development'],
      confusion: 'sustain 可表示“维持”，也可表示“遭受（伤害）”；看宾语是 attention/growth 还是 injury/loss。',
      example: 'The bridge is designed to sustain heavy loads.',
      exampleCn: '这座桥被设计成能承受重载。',
      exampleNote: 'sustain heavy loads = 承受重载；与前一个义项不同。',
      examLink: '原文 sustain attention → 选项可用 maintain focus 改写。注意 sustain 与 maintain 的同义替换。',
      question: {
        stem: '在原句中，sustain 最接近的意思是：',
        options: ['维持', '遭受', '证明', '打断'],
        answer: 0,
        explain: 'sustain attention = 维持注意力。'
      },
      transfer: {
        stem: '新语境：Several passengers sustained minor injuries in the accident. 这里 sustained 的意思是：',
        options: ['遭受', '维持', '支撑', '治疗'],
        answer: 0,
        explain: 'sustain injuries = 受伤，是固定搭配。'
      }
    },
    {
      id: 'bear',
      word: 'bear',
      phonetic: '/beə(r)/',
      pos: 'v.',
      tags: ['不规则变化', '费用场景'],
      sentence: 'The costs of the repair will be borne by the landlord.',
      sentenceCn: '维修费用将由房东承担。',
      contextMeaning: '承担（费用、责任）',
      otherMeanings: [
        { pos: 'v.', meaning: '忍受；承受；生育' },
        { pos: 'phr.', meaning: 'bear in mind 记住' },
        { pos: 'n.', meaning: '熊' }
      ],
      collocations: ['bear the cost / responsibility', 'bear in mind', 'can’t bear doing/to do'],
      confusion: 'borne 是 bear 的过去分词。“be borne by”在法律、费用语境是“由……承担”，不要误读成“被生育/被抬着”。',
      example: 'Students should bear in mind that the deadline cannot be extended.',
      exampleCn: '学生应记住，截止日期不能延长。',
      exampleNote: 'bear in mind = keep in mind；是提醒场景的常见短语。',
      examLink: '原文 will be borne by → 选项常用 will be paid by / will fall on 改写。被动语态题先找逻辑主语。',
      question: {
        stem: '在原句中，will be borne by 的意思是：',
        options: ['将由……承担', '将被……搬运', '将被……生育', '将被……忍受'],
        answer: 0,
        explain: 'the costs ... borne by the landlord = 费用由房东承担。'
      },
      transfer: {
        stem: '新语境：Please bear in mind that the library closes at nine. 这里 bear in mind 的意思是：',
        options: ['记住', '忍受', '承担费用', '带着'],
        answer: 0,
        explain: 'bear in mind = 记住、把……放在心上。'
      }
    },
    {
      id: 'claim',
      word: 'claim',
      phonetic: '/kleɪm/',
      pos: 'v.',
      tags: ['观点态度', '熟词生义'],
      sentence: 'The advertisement claims that the drink improves concentration, but no evidence is provided.',
      sentenceCn: '广告声称这种饮料能提高注意力，但没有提供任何证据。',
      contextMeaning: '声称，宣称',
      otherMeanings: [
        { pos: 'v.', meaning: '索取；认领' },
        { pos: 'v.', meaning: '夺去（生命）' },
        { pos: 'n.', meaning: '声明；索赔' }
      ],
      collocations: ['claim that ...', 'claim responsibility', 'make a claim', 'claim a prize'],
      confusion: 'claim that ... 常表示“声称”，不等于事实。阅读中作者可能对 claim 持怀疑态度，要关注 but、however 等转折。',
      example: 'The company has agreed to pay the claim for the damaged goods.',
      exampleCn: '公司已同意就受损货物支付索赔。',
      exampleNote: '这里 claim 是名词“索赔”；同词不同义。',
      examLink: '原文 claims that ... but no evidence → 选项可改写为 states without proof。观点态度题要看转折后的评价。',
      question: {
        stem: '在原句中，claims 的意思是：',
        options: ['索取', '声称', '认领', '夺去'],
        answer: 1,
        explain: '主语是 advertisement，后接 that 从句，表示“声称”；but 表明作者对其持保留态度。'
      },
      transfer: {
        stem: '新语境：The storm claimed the lives of several people. 这里 claimed 的意思是：',
        options: ['夺去', '声称', '索赔', '认领'],
        answer: 0,
        explain: 'claim lives = 夺去生命，是新闻中的固定搭配。'
      }
    }
  ];

  /* ============================== 听力 ============================== */
  const LISTENING_SETS = [
    {
      id: 'study-room',
      title: '校园对话：临时换学习地点',
      scenario: '校园 · 对话',
      source: '原创模拟听力 · 合成语音',
      tip: '先扫选项，留意“地点变化、原因、下一步动作”。录音中的问题也会被读出。',
      synthesized: true,
      script: [
        { speaker: 'M', text: 'I planned to study in the main library this afternoon, but the notice says it’s closed for maintenance until Thursday.' },
        { speaker: 'W', text: 'That’s inconvenient. Why don’t you use the group study room in the student center? It’s usually quieter than the café.' },
        { speaker: 'M', text: 'I need a place where I can discuss a group project, so quiet isn’t my priority. Does the room allow conversation?' },
        { speaker: 'W', text: 'Yes, the one on the second floor is designed for group work. You just need to book a slot online.' },
        { speaker: 'M', text: 'Good. I’ll reserve one for three o’clock tomorrow. I hope it’s still available.' }
      ],
      questions: [
        {
          id: 'q1',
          stem: 'Why does the man change his original plan?',
          options: [
            'He has a group meeting in the library.',
            'The library is unavailable this afternoon.',
            'He forgot to bring his student card.',
            'The café is too noisy for studying.'
          ],
          answer: 1,
          evidenceIndex: 0,
          keyPhrase: 'closed for maintenance',
          explain: '男生原计划去主图书馆，但通知说图书馆因维修关闭到周四，所以他需要换地点。',
          optionNotes: [
            'A 错：小组项目要讨论，但不是在图书馆开会。',
            'B 对：closed for maintenance = 无法使用，属于同义改写。',
            'C 错：没有提到学生证。',
            'D 错：咖啡馆只是被提到，不是他改变计划的原因。'
          ]
        },
        {
          id: 'q2',
          stem: 'What does the woman suggest the man do?',
          options: [
            'Use a room designed for group work.',
            'Study in the café instead.',
            'Ask the librarian for a quiet seat.',
            'Join a project group next week.'
          ],
          answer: 0,
          evidenceIndex: 1,
          keyPhrase: 'group study room',
          explain: '女士建议他去学生中心的 group study room；后面补充二楼那间就是为小组工作设计的。',
          optionNotes: [
            'A 对：group study room / designed for group work 是原文表达，选项做了概括。',
            'B 错：café 只用于比较安静程度，不是建议地点。',
            'C 错：没有建议找图书管理员。',
            'D 错：男生已有小组项目，不是下周才加入。'
          ]
        },
        {
          id: 'q3',
          stem: 'What will the man do next?',
          options: [
            'Cancel the group project.',
            'Wait until Thursday to study.',
            'Book a study room online.',
            'Meet his group in the library.'
          ],
          answer: 2,
          evidenceIndex: 3,
          keyPhrase: 'book a slot online',
          explain: '女士说需要在线预约时段（book a slot online），男生接着说会预订明天三点的房间，因此下一步是在线预订。',
          optionNotes: [
            'A 错：没有取消项目。',
            'B 错：图书馆周四才恢复，但他不打算等到周四。',
            'C 对：book a slot online → book a study room online，是动作改写。',
            'D 错：图书馆今天不开放。'
          ]
        }
      ]
    },
    {
      id: 'sleep-memory',
      title: '短文：熬夜复习为什么不一定有效',
      scenario: '学习讲座 · 独白',
      source: '原创模拟听力 · 合成语音',
      tip: '注意 however、instead 这样的转折信号；题目常把原文动作换一种说法。',
      synthesized: true,
      script: [
        { speaker: 'W', text: 'Many students believe that staying up late is a good way to prepare for exams.' },
        { speaker: 'W', text: 'However, sleep is when the brain organizes what you have learned.' },
        { speaker: 'W', text: 'If you cut your sleep by two hours to study, you may remember less the next day.' },
        { speaker: 'W', text: 'Instead of adding more hours, try studying in shorter, focused blocks and protect your sleep.' }
      ],
      questions: [
        {
          id: 'q1',
          stem: 'What do many students believe according to the speaker?',
          options: [
            'Staying up late helps them prepare for exams.',
            'Sleep is more important than revision.',
            'Short study blocks are ineffective.',
            'The brain stops working during sleep.'
          ],
          answer: 0,
          evidenceIndex: 0,
          keyPhrase: 'staying up late',
          explain: '第一句直接说 many students believe that staying up late is a good way to prepare for exams。',
          optionNotes: [
            'A 对：staying up late is a good way to prepare 是原文。',
            'B 错：这是说话人后面强调的观点，不是“很多学生相信”的内容。',
            'C 错：说话人建议 short focused blocks，并不认为无效。',
            'D 错：原文说睡眠时大脑整理信息，不是停止工作。'
          ]
        },
        {
          id: 'q2',
          stem: 'What may happen if students cut sleep to study?',
          options: [
            'They may organize information faster.',
            'They may remember less the next day.',
            'They may need fewer study breaks.',
            'They may perform better in exams.'
          ],
          answer: 1,
          evidenceIndex: 2,
          keyPhrase: 'remember less',
          explain: '条件句说：如果少睡两小时去学习，第二天可能记得更少。',
          optionNotes: [
            'A 错：组织信息发生在睡眠中，削减睡眠不利于它。',
            'B 对：remember less the next day 是原文，选项保留核心意思。',
            'C 错：没有提到休息次数减少。',
            'D 错：与原文意思相反。'
          ]
        },
        {
          id: 'q3',
          stem: 'What does the speaker suggest?',
          options: [
            'Studying for longer hours before exams.',
            'Sleeping during the day instead of at night.',
            'Using shorter focused blocks and protecting sleep.',
            'Stopping all revision in the evening.'
          ],
          answer: 2,
          evidenceIndex: 3,
          keyPhrase: 'shorter, focused blocks',
          explain: '最后一句用 instead of adding more hours 提出替代方案：shorter, focused blocks and protect your sleep。',
          optionNotes: [
            'A 错：原文反对单纯增加时长。',
            'B 错：没有建议白天睡代替夜间睡眠。',
            'C 对：原文建议的两种做法被完整保留。',
            'D 错：过于绝对，原文没有说晚上完全不要复习。'
          ]
        }
      ]
    }
  ];

  /* ============================== 阅读 ============================== */
  const READING_SETS = [
    {
      id: 'delivery',
      title: 'When convenience has a cost',
      source: '原创模拟阅读 · 非真题',
      level: 'CET-4 难度示例',
      estimatedMinutes: 8,
      paragraphs: [
        {
          id: 'p1',
          sentences: [
            { id: 'p1s1', text: 'Ordering a meal or a new pair of shoes online is now a matter of a few taps.' },
            { id: 'p1s2', text: 'For many city residents, same-day delivery has become part of daily life.' },
            { id: 'p1s3', text: 'Yet the speed that customers enjoy is supported by a system that is rarely visible to them: warehouses on the edge of cities, vans moving through crowded streets, and workers packing orders late into the night.' }
          ]
        },
        {
          id: 'p2',
          sentences: [
            { id: 'p2s1', text: 'The benefits are obvious.' },
            { id: 'p2s2', text: 'A small shop can reach customers far beyond its neighbourhood, and people with limited time can buy essentials without travelling across town.' },
            { id: 'p2s3', text: 'For older residents or parents with young children, this convenience is not merely a luxury; it can make daily tasks easier to manage.' }
          ]
        },
        {
          id: 'p3',
          sentences: [
            { id: 'p3s1', text: 'The costs, however, are shared more widely.' },
            { id: 'p3s2', text: 'More vans mean more traffic and more emissions.' },
            { id: 'p3s3', text: 'Returns - often free to the customer - create additional journeys and packaging waste.' },
            { id: 'p3s4', text: 'Consumers may feel they are making a green choice by ordering online instead of driving to a store, but a single order that is delivered, returned and then delivered again can produce a larger environmental burden than one trip in a car.' }
          ]
        },
        {
          id: 'p4',
          sentences: [
            { id: 'p4s1', text: 'Some companies are testing solutions.' },
            { id: 'p4s2', text: 'Electric vans, shared delivery points and clearer information about returns are all steps in the right direction.' },
            { id: 'p4s3', text: 'But these measures will have limited effect unless customers change their expectations.' },
            { id: 'p4s4', text: 'If speed remains the most important feature of delivery, companies will continue to compete on how quickly they can arrive, not on how little they can waste.' }
          ]
        },
        {
          id: 'p5',
          sentences: [
            { id: 'p5s1', text: 'The question, then, is not whether convenience is good or bad.' },
            { id: 'p5s2', text: 'It is how much we are willing to pay for it - not only in money, but in the kind of cities and environment we leave for others.' }
          ]
        }
      ],
      questions: [
        {
          id: 'q1',
          stem: 'What can be inferred about same-day delivery from the first paragraph?',
          options: [
            'It depends on a complex system that most customers do not see.',
            'It is too expensive for most city residents.',
            'It has replaced traditional shopping in city centres.',
            'It mainly benefits warehouse workers.'
          ],
          answer: 0,
          evidenceId: 'p1s3',
          keywordTip: '题干关键词：inferred / first paragraph / same-day delivery',
          explain: '第一段最后一句说，顾客享受的速度由一个“很少被他们看见”的系统支撑，并列举仓库、货车、夜班工人。因此可推断多数顾客看不到背后的复杂系统。',
          paraphrase: '原文 a system that is rarely visible to them → 正确选项 a complex system that most customers do not see。',
          optionNotes: [
            'A 对：rarely visible 与 do not see 对应，系统由仓库、车辆、工人组成。',
            'B 错：没有比较价格，也没说多数人负担不起。',
            'C 错：只提到网购普遍，没说取代传统购物。',
            'D 错：工人是系统的组成部分，不是“主要受益者”。'
          ]
        },
        {
          id: 'q2',
          stem: 'Why does the author mention older residents and parents with young children?',
          options: [
            'To show that convenience can meet real needs rather than merely satisfy wants.',
            'To argue that these groups spend more time online than others.',
            'To suggest that online shopping is replacing family activities.',
            'To compare their shopping habits with those of small shop owners.'
          ],
          answer: 0,
          evidenceId: 'p2s3',
          keywordTip: '题干关键词：older residents / parents / why mention',
          explain: '作者说对他们而言，这种便利“不只是奢侈品”，还能让日常事务更容易处理。这是在说明便利有真实需求，不只是“想要”。',
          paraphrase: '原文 not merely a luxury; it can make daily tasks easier → 正确选项 meet real needs rather than merely satisfy wants。',
          optionNotes: [
            'A 对：not merely a luxury 对应 rather than merely satisfy wants；easier to manage 对应 meet real needs。',
            'B 错：文中没有上网时长比较。',
            'C 错：没有讨论家庭活动被替代。',
            'D 错：小店主出现在前一句，且不是比较对象。'
          ]
        },
        {
          id: 'q3',
          stem: 'What does the author suggest is necessary for delivery solutions to work?',
          options: [
            'Companies must offer more free returns.',
            'Customers must value speed less than waste reduction.',
            'Cities must move warehouses into the centre.',
            'All deliveries must be made by electric vans.'
          ],
          answer: 1,
          evidenceId: 'p4s3',
          keywordTip: '题干关键词：necessary / solutions / work',
          explain: '第四段转折后指出：除非顾客改变期待，否则这些措施效果有限；最后一句进一步说，如果速度仍是首要，企业就会继续比谁更快，而不是比谁更少浪费。',
          paraphrase: '原文 unless customers change their expectations / if speed remains the most important → 正确选项 customers must value speed less than waste reduction。',
          optionNotes: [
            'A 错：更多免费退货会增加额外运输，不是解决方案的必要条件。',
            'B 对：必须改变对速度的期待，让减少浪费成为竞争点。',
            'C 错：原文的仓库在“城市边缘”，没有建议搬进市中心。',
            'D 错：电动货车只是步骤之一，不是“所有配送都必须”。'
          ]
        }
      ]
    },
    {
      id: 'walking-meetings',
      title: 'A short walk can change a meeting',
      source: '原创模拟阅读 · 非真题',
      level: 'CET-4 难度示例',
      estimatedMinutes: 7,
      paragraphs: [
        {
          id: 'p1',
          sentences: [
            { id: 'p1s1', text: 'Sitting for long periods has become normal in many offices.' },
            { id: 'p1s2', text: 'In recent years, some employers have begun to experiment with walking meetings, in which a small group discusses work while walking outdoors rather than sitting around a table.' }
          ]
        },
        {
          id: 'p2',
          sentences: [
            { id: 'p2s1', text: 'Supporters point to two possible benefits.' },
            { id: 'p2s2', text: 'First, light movement may help people stay alert during long discussions.' },
            { id: 'p2s3', text: 'Second, a change of setting can make a conversation feel less formal, which may encourage quieter team members to speak.' }
          ]
        },
        {
          id: 'p3',
          sentences: [
            { id: 'p3s1', text: 'Walking meetings are not suitable for every task.' },
            { id: 'p3s2', text: 'They work best for brainstorming or one-to-one conversations.' },
            { id: 'p3s3', text: 'Detailed financial reviews, confidential discussions and meetings that require a screen are usually better held indoors.' },
            { id: 'p3s4', text: 'Weather and accessibility also matter: a route that is pleasant for one employee may be difficult for another.' }
          ]
        },
        {
          id: 'p4',
          sentences: [
            { id: 'p4s1', text: 'Employers who want to try walking meetings therefore need more than a convenient path.' },
            { id: 'p4s2', text: 'They need clear guidelines, a backup plan and a genuine choice.' },
            { id: 'p4s3', text: 'When these conditions are met, a short walk can be a useful addition to the working day, not a replacement for every meeting.' }
          ]
        }
      ],
      questions: [
        {
          id: 'q1',
          stem: 'What is the main point of the passage?',
          options: [
            'Walking meetings can be useful in some situations but do not suit every task.',
            'Walking meetings should replace all indoor meetings.',
            'Most employees prefer walking meetings to sitting meetings.',
            'Walking meetings are mainly a way to reduce office costs.'
          ],
          answer: 0,
          evidenceId: 'p4s3',
          keywordTip: '题干关键词：main point',
          explain: '全文先讲可能的好处，再给出不适用场景，最后总结：在满足条件时，短途步行会议是有用补充，而不是替代所有会议。',
          paraphrase: '原文 a useful addition ... not a replacement for every meeting → 正确选项 useful in some situations but do not suit every task。',
          optionNotes: [
            'A 对：既保留“有用”，也保留“不适合所有任务”的限制。',
            'B 错：原文明确说 not a replacement for every meeting。',
            'C 错：只提到可能的好处，没有员工偏好调查。',
            'D 错：没有说主要目的是降低成本。'
          ]
        },
        {
          id: 'q2',
          stem: 'According to the passage, walking meetings are best suited to which tasks?',
          options: [
            'Brainstorming and one-to-one conversations.',
            'Detailed financial reviews.',
            'Confidential discussions.',
            'Meetings that require a screen.'
          ],
          answer: 0,
          evidenceId: 'p3s2',
          keywordTip: '题干关键词：best suited / tasks',
          explain: '第三段明确指出 work best for brainstorming or one-to-one conversations。其他三项都被列为通常更适合室内的会议。',
          paraphrase: '原文 work best for brainstorming or one-to-one conversations → 选项几乎原词复现，但要注意其余选项是反向干扰。',
          optionNotes: [
            'A 对：原文直接列出。',
            'B、C、D 错：这三类在下一句中被列为 usually better held indoors。'
          ]
        },
        {
          id: 'q3',
          stem: 'What does the author emphasize in the final paragraph?',
          options: [
            'Planning and choice matter more than simply finding a route.',
            'Employees should be required to walk during every meeting.',
            'Outdoor meetings are always more productive than indoor ones.',
            'Companies should avoid meetings that require a screen.'
          ],
          answer: 0,
          evidenceId: 'p4s1',
          keywordTip: '题干关键词：emphasize / final paragraph',
          explain: '最后一段说光有一条方便的路线不够，还需要明确规则、备用方案和真正的选择权。强调“规划与选择”，而不是“有路就走”。',
          paraphrase: '原文 need more than a convenient path / clear guidelines, a backup plan and a genuine choice → 正确选项 planning and choice matter more than simply finding a route。',
          optionNotes: [
            'A 对：more than a convenient path 对应 more than simply finding a route；guidelines/choice 对应 planning and choice。',
            'B 错：原文说 genuine choice，不是强制。',
            'C 错：always 过于绝对，与全文语气不符。',
            'D 错：文章只说某些会议更适合室内，没有要求公司避免。'
          ]
        }
      ]
    }
  ];

  /* ============================== 写作 ============================== */
  const WRITING_TASKS = [
    {
      id: 'book-swap',
      title: '校园通知：图书交换活动',
      typeLabel: '应用文 · 通知',
      promptZh: '校学生会将在下周六举办图书交换活动。请为校园网站写一则通知，说明活动目的、时间地点和参与方式。',
      promptEn: 'Suppose your student union will hold a book swap next Saturday. Write a notice of about 90–120 words for the campus website. Your notice should include the purpose, time and place, and how students can take part.',
      targetWords: [90, 120],
      timeMinutes: 12,
      structures: [
        { pattern: 'be scheduled to', example: 'The event is scheduled to take place at 3 p.m.', note: '通知中说明既定安排。' },
        { pattern: 'Those who ... can ...', example: 'Those who are interested can sign up online.', note: '比 All students should ... 更自然。' },
        { pattern: 'We would appreciate it if ...', example: 'We would appreciate it if you could arrive on time.', note: '礼貌请求，不用堆砌生僻词。' }
      ],
      warmups: [
        {
          id: 'bw1',
          zh: '图书交换活动将于下周六下午三点在学生中心一楼举行。',
          hint: '用 be scheduled to 和 take place；地点可写 on the first floor of the Student Center。',
          requiredAny: [
            ['scheduled'],
            ['student center', 'student centre'],
            ['saturday'],
            ['3 p.m.', '3 pm', 'three']
          ],
          keyIdeas: [
            { label: '活动名称', options: ['book swap', 'book exchange', 'swap books'] },
            { label: '时间', options: ['next saturday', 'saturday', '3 p.m.', '3 pm', 'three'] },
            { label: '地点', options: ['student center', 'student centre'] }
          ],
          model: 'The book swap is scheduled to take place at 3 p.m. next Saturday on the first floor of the Student Center.',
          note: '中文的“举行”不一定逐字译成 hold；be scheduled to take place 更符合通知语体。'
        },
        {
          id: 'bw2',
          zh: '有兴趣的同学可以带两本旧书到现场，与其他同学交换。',
          hint: '用 Those who ... can ...，并把“交换”写成 exchange ... for ... 或 swap ... with ...。',
          requiredAny: [
            ['those who', 'students who'],
            ['bring'],
            ['exchange', 'swap']
          ],
          keyIdeas: [
            { label: '有兴趣的同学', options: ['those who are interested', 'interested students', 'students who are interested'] },
            { label: '带旧书', options: ['bring', 'take'] },
            { label: '交换', options: ['exchange', 'swap'] }
          ],
          model: 'Those who are interested can bring up to two old books and exchange them with other students on site.',
          note: '用 up to two 表示“最多两本”，比生硬地写 two books 更准确。'
        },
        {
          id: 'bw3',
          zh: '如果你想参加，请在本周五前填写在线报名表。',
          hint: '用 If you wish to ... 和 fill in the online form by ...。',
          requiredAny: [
            ['if you'],
            ['fill', 'complete', 'sign up', 'register'],
            ['friday']
          ],
          keyIdeas: [
            { label: '如果想参加', options: ['if you wish to', 'if you want to', 'if you would like to'] },
            { label: '填写报名表', options: ['fill in', 'fill out', 'complete', 'sign up', 'register'] },
            { label: '周五前', options: ['by friday', 'before friday'] }
          ],
          model: 'If you wish to join, please fill in the online form by Friday.',
          note: 'by Friday 是“不晚于周五”，before Friday 更强调“周五之前”；两者通常都可接受。'
        }
      ],
      contentPoints: [
        { label: '活动目的', keywords: ['book swap', 'swap books', 'exchange books', 'exchange old books', 'share books'] },
        { label: '时间', keywords: ['saturday', '3 p.m.', '3 pm', 'three'] },
        { label: '地点', keywords: ['student center', 'student centre', 'first floor'] },
        { label: '参与方式', keywords: ['bring', 'online form', 'sign up', 'register', 'fill'] }
      ],
      modelParagraph: 'Book Swap on Campus\n\nTo help students make better use of their old books, the Student Union is scheduled to hold a book swap next Saturday. The event will take place at 3 p.m. on the first floor of the Student Center. Students who are interested can bring up to three books and exchange them for others on site. Please make sure the books are clean and in good condition. Light refreshments will be provided after the swap. If you would like to join, please fill in the online form before Friday. We look forward to seeing you there.',
      modelNotes: [
        '第一句用 To help ... 说明目的，再用 be scheduled to 交代安排。',
        '第二句只补时间地点，不重复活动名称。',
        '第三、四句说明参与方式，最后用礼貌收尾。',
        '全文没有堆砌高级词：make better use of、on site、look forward to 都是可复用表达。'
      ],
      revision: {
        title: '换题微写作：旧衣捐赠通知',
        promptZh: '假设学校将举办旧衣捐赠活动，请写一则简短通知，包含目的、时间地点和参与方式。',
        targetWords: [70, 100],
        model: 'The Student Union is scheduled to hold a clothing donation next Sunday. It will take place at the east gate of the sports field from 2 p.m. to 5 p.m. Students who are interested can bring clean clothes in good condition. All donations will be given to families in need. If you wish to help, please sign up online by Saturday. Thank you for your support.'
      }
    },
    {
      id: 'part-time-jobs',
      title: '观点段：大学生要不要做兼职',
      typeLabel: '短文 · 观点段',
      promptZh: '有些大学生在学习期间做兼职。请写一段短文，表达你的看法，并给出一个理由和一个例子。',
      promptEn: 'Some students take part-time jobs while studying. Write a short paragraph of about 90–120 words giving your opinion. Include one reason and one example.',
      targetWords: [90, 120],
      timeMinutes: 12,
      structures: [
        { pattern: 'While ..., ...', example: 'While part-time jobs take up time, they can teach useful skills.', note: '让步后给出主观点，避免 although ... but ...。' },
        { pattern: 'One reason is that ...', example: 'One reason is that work teaches time management.', note: '直接给理由，不绕圈。' },
        { pattern: 'For example, ...', example: 'For example, a classmate of mine ...', note: '例子要短，服务于理由。' }
      ],
      warmups: [
        {
          id: 'pw1',
          zh: '虽然兼职会占用时间，但也能让学生获得实际经验。',
          hint: '用 While 引导让步，不要把 although 和 but 放在同一句。',
          requiredAny: [
            ['while', 'although', 'though'],
            ['part-time', 'part time'],
            ['experience']
          ],
          keyIdeas: [
            { label: '让步', options: ['while', 'although', 'though'] },
            { label: '占用时间', options: ['take up time', 'take time', 'leave less time'] },
            { label: '实际经验', options: ['practical experience', 'real-world experience', 'work experience'] }
          ],
          model: 'While part-time jobs take up time, they can also give students practical experience.',
          note: '中文“虽然……但……”在英语里只保留一个连接词：While ..., ... 或 Although ..., ...。'
        },
        {
          id: 'pw2',
          zh: '一个原因是兼职有助于培养时间管理能力。',
          hint: '用 One reason is that ...，主语之后注意第三人称单数。',
          requiredAny: [
            ['one reason'],
            ['time management', 'manage their time', 'manage time']
          ],
          keyIdeas: [
            { label: '一个原因', options: ['one reason'] },
            { label: '有助于', options: ['help', 'develop', 'improve', 'teach'] },
            { label: '时间管理', options: ['time management', 'manage their time', 'manage time'] }
          ],
          model: 'One reason is that a part-time job helps students develop time management skills.',
          note: 'helps students develop 后面接动词原形，不要写 helps students to developing。'
        },
        {
          id: 'pw3',
          zh: '例如，我的一位同学通过提前安排时间，既能工作又能保持成绩。',
          hint: '用 For example + 具体人物，再用 by doing ... 说明方法。',
          requiredAny: [
            ['for example', 'for instance'],
            ['classmate', 'friend', 'student'],
            ['schedule', 'plan', 'arrange']
          ],
          keyIdeas: [
            { label: '例如', options: ['for example', 'for instance'] },
            { label: '同学', options: ['classmate', 'friend', 'student'] },
            { label: '安排时间', options: ['schedule', 'plan', 'arrange', 'manage'] },
            { label: '保持成绩', options: ['grades', 'academic performance', 'studies'] }
          ],
          model: 'For example, one of my classmates plans her schedule in advance, so she can work and still keep up with her studies.',
          note: '例子不必写得很长；一句具体事实比三句空泛评价更有效。'
        }
      ],
      contentPoints: [
        { label: '明确观点', keywords: ['i think', 'i believe', 'in my view', 'i agree', 'i disagree', 'should', 'can benefit', 'useful'] },
        { label: '理由', keywords: ['because', 'reason', 'experience', 'time management', 'money', 'skill'] },
        { label: '例子', keywords: ['for example', 'for instance', 'such as', 'classmate', 'friend'] },
        { label: '收束', keywords: ['therefore', 'in short', 'overall', 'as long as', 'balance'] }
      ],
      modelParagraph: 'I believe that students can benefit from part-time jobs if they manage their time carefully. While work takes up several hours a week, it can teach skills that are hard to learn in class. One reason is that a job helps students develop time management. For example, one of my classmates plans her shifts at the beginning of each week, so she can work and still keep up with her studies. Therefore, part-time work is not simply a way to earn money; it can also prepare students for life after graduation.',
      modelNotes: [
        '第一句给出有条件的观点，避免绝对化。',
        '第二句用 While 让步，再引出好处。',
        '第三、四句用 One reason + For example 形成“理由—例子”链条。',
        '最后用 Therefore 收束，没有引入新理由。'
      ],
      revision: {
        title: '换题微写作：线上学习',
        promptZh: '请用 One reason is that ... 和 For example, ... 写 3–4 句，表达线上学习的一个好处。',
        targetWords: [45, 80],
        model: 'One reason why online learning can be useful is that it allows students to review difficult lessons at their own pace. For example, a student who misses a point in class can watch the recording again instead of falling behind. This makes learning more flexible, as long as the student stays organized.'
      }
    }
  ];

  /* ============================== 翻译 ============================== */
  const TRANSLATION_TASKS = [
    {
      id: 'museums',
      title: '博物馆的周末',
      topic: '文化生活',
      sourceZh: '近年来，越来越多的年轻人开始喜欢在周末逛博物馆。博物馆不仅是了解历史的地方，也为人们提供了安静的学习空间。为了吸引更多参观者，一些博物馆延长了开放时间，并推出了免费的线上展览。',
      sourceLabel: '原创模拟段落 · 非真题',
      timeMinutes: 12,
      sentences: [
        {
          id: 's1',
          zh: '近年来，越来越多的年轻人开始喜欢在周末逛博物馆。',
          skeleton: 'In recent years, more and more young people have begun to ...',
          chunks: [
            { label: '近年来', options: ['in recent years', 'over recent years', 'recently'] },
            { label: '越来越多', options: ['more and more', 'a growing number of', 'an increasing number of', 'increasing numbers of'] },
            { label: '年轻人', options: ['young people', 'younger people', 'the young'] },
            { label: '开始喜欢', options: ['have begun to enjoy', 'started to enjoy', 'are beginning to enjoy', 'have become interested in', 'show growing interest in'] },
            { label: '周末逛博物馆', options: ['visiting museums on weekends', 'visit museums at weekends', 'going to museums on weekends', 'museum visits on weekends'] }
          ],
          references: [
            'In recent years, more and more young people have begun to enjoy visiting museums on weekends.',
            'In recent years, an increasing number of young people have started to spend their weekends visiting museums.'
          ],
          reminder: '“开始喜欢”可以用 have begun to enjoy / have started to enjoy；“逛博物馆”用 visit museums 即可，不必逐字译“逛”。'
        },
        {
          id: 's2',
          zh: '博物馆不仅是了解历史的地方，也为人们提供了安静的学习空间。',
          skeleton: 'Museums are not only ... but also ...',
          chunks: [
            { label: '不仅是……也……', options: ['not only', 'not merely', 'more than'] },
            { label: '了解历史的地方', options: ['a place to learn about history', 'places for learning about history', 'where people can learn about history'] },
            { label: '提供', options: ['provide', 'offer', 'give'] },
            { label: '人们', options: ['people', 'visitors'] },
            { label: '安静的学习空间', options: ['a quiet space for learning', 'quiet spaces to study', 'a quiet place to study'] }
          ],
          references: [
            'Museums are not only places where people can learn about history, but also offer them a quiet space for study.',
            'Museums serve not merely as places to learn history; they also give people a quiet place to study.'
          ],
          reminder: 'not only 与 but also 后面的结构尽量平行。不要写成 Museums not only are ... , also ...。'
        },
        {
          id: 's3',
          zh: '为了吸引更多参观者，一些博物馆延长了开放时间，并推出了免费的线上展览。',
          skeleton: 'To attract more visitors, some museums have ...',
          chunks: [
            { label: '为了吸引更多参观者', options: ['to attract more visitors', 'in order to attract more visitors', 'as a way to attract more visitors'] },
            { label: '一些博物馆', options: ['some museums'] },
            { label: '延长了开放时间', options: ['extended their opening hours', 'stayed open longer', 'extended opening hours'] },
            { label: '推出了', options: ['launched', 'introduced', 'offered', 'started'] },
            { label: '免费的线上展览', options: ['free online exhibitions', 'online exhibitions for free', 'free digital exhibitions'] }
          ],
          references: [
            'To attract more visitors, some museums have extended their opening hours and launched free online exhibitions.',
            'Some museums have stayed open longer and introduced free online exhibitions in order to attract more visitors.'
          ],
          reminder: '“延长开放时间”用 extend opening hours；不要写成 prolong the open time。'
        }
      ],
      fullReference: 'In recent years, more and more young people have begun to enjoy visiting museums on weekends. Museums are not only places where people can learn about history, but also offer them a quiet space for study. To attract more visitors, some museums have extended their opening hours and launched free online exhibitions.',
      note: '参考译文有两种以上表达。本地检查只核对意义要点是否出现，不能判定所有正确的同义表达。'
    },
    {
      id: 'urban-parks',
      title: '城市里的绿色空间',
      topic: '城市生活',
      sourceZh: '城市公园对居民的生活很重要。它们不仅提供了锻炼的场所，也让人们在忙碌的一天后有机会放松。因此，市政府应该增加绿地，并确保每个人都能方便地到达这些公园。',
      sourceLabel: '原创模拟段落 · 非真题',
      timeMinutes: 10,
      sentences: [
        {
          id: 's1',
          zh: '城市公园对居民的生活很重要。',
          skeleton: 'Urban parks are important to ...',
          chunks: [
            { label: '城市公园', options: ['urban parks', 'city parks'] },
            { label: '居民的生活', options: ['residents’ lives', 'residents’ daily lives', 'the lives of residents', 'people’s lives'] },
            { label: '很重要', options: ['are important', 'matter a lot', 'play an important role'] }
          ],
          references: [
            'Urban parks are important to residents’ lives.',
            'City parks play an important role in the daily lives of residents.'
          ],
          reminder: '“对……很重要”用 be important to ... 或 play an important role in ...。'
        },
        {
          id: 's2',
          zh: '它们不仅提供了锻炼的场所，也让人们在忙碌的一天后有机会放松。',
          skeleton: 'They not only provide ... but also give people a chance to ...',
          chunks: [
            { label: '不仅……也……', options: ['not only', 'not merely'] },
            { label: '提供', options: ['provide', 'offer', 'give'] },
            { label: '锻炼的场所', options: ['places for exercise', 'spaces for exercise', 'places to exercise'] },
            { label: '有机会放松', options: ['a chance to relax', 'the opportunity to relax', 'a chance to unwind'] },
            { label: '忙碌的一天后', options: ['after a busy day', 'after a long day'] }
          ],
          references: [
            'They not only provide places for exercise but also give people a chance to relax after a busy day.',
            'They offer both spaces for exercise and an opportunity for people to unwind after a long day.'
          ],
          reminder: '如果不想用 not only ... but also ...，可以用 both ... and ...，但后面的结构仍要平行。'
        },
        {
          id: 's3',
          zh: '因此，市政府应该增加绿地，并确保每个人都能方便地到达这些公园。',
          skeleton: 'Therefore, the city government should ... and make sure that ...',
          chunks: [
            { label: '因此', options: ['therefore', 'as a result', 'so'] },
            { label: '市政府', options: ['city government', 'local government', 'municipal government'] },
            { label: '增加绿地', options: ['increase green spaces', 'create more green spaces', 'add green areas'] },
            { label: '确保', options: ['make sure', 'ensure', 'guarantee'] },
            { label: '方便地到达', options: ['can easily reach', 'have easy access to', 'can get to ... easily'] }
          ],
          references: [
            'Therefore, the city government should create more green spaces and make sure that everyone can reach these parks easily.',
            'The local government should therefore add more green areas and ensure that all residents have easy access to these parks.'
          ],
          reminder: '“方便地到达”可写成 have easy access to ...，不必逐字译成 arrive conveniently。'
        }
      ],
      fullReference: 'Urban parks are important to residents’ lives. They not only provide places for exercise but also give people a chance to relax after a busy day. Therefore, the city government should create more green spaces and make sure that everyone can reach these parks easily.',
      note: '参考译文不唯一；“到达”可以用 reach / get to / have access to。'
    }
  ];

  /* ============================== 换题检验库 ============================== */
  const TRANSFER_BANK = {
    listening: [
      {
        id: 'ltr-computer-lab',
        title: '换句听辨：机房时间',
        script: [
          { speaker: 'W', text: 'The computer lab will close an hour early tomorrow because of maintenance. Students who need to print their assignments should do so before eight.' }
        ],
        questionAudio: 'Why will the computer lab close early tomorrow?',
        stem: 'Why will the computer lab close early tomorrow?',
        options: ['Because of maintenance.', 'Because a class needs the room.', 'Because the printer is broken.', 'Because of a public holiday.'],
        answer: 0,
        explain: '原句直接说 because of maintenance；closes an hour early 是结果，不是原因。'
      },
      {
        id: 'ltr-workshop',
        title: '换句听辨：工作坊改期',
        script: [
          { speaker: 'M', text: 'I thought the workshop was on Friday, but the email says it has been moved to Thursday afternoon.' }
        ],
        questionAudio: 'When will the workshop be held?',
        stem: 'When will the workshop be held?',
        options: ['Thursday afternoon.', 'Friday morning.', 'Friday afternoon.', 'Thursday morning.'],
        answer: 0,
        explain: '原文 moved to Thursday afternoon 说明改到周四下午。考生易被前半句 Friday 干扰。'
      }
    ],
    reading: [
      {
        id: 'rtr-handwriting',
        title: '换篇定位：手写笔记',
        passage: [
          'Taking notes by hand may feel slower than typing, but the extra effort can help students remember what they hear.',
          'Because handwriting cannot keep up with every word, learners must decide what matters and summarize it in their own words.',
          'Typing, by contrast, makes it easy to record a lecture without really processing it.'
        ],
        stem: 'Why can handwritten notes help memory?',
        options: [
          'They force learners to select and restate key ideas.',
          'They are faster than typing.',
          'They allow learners to record every word.',
          'They make lectures easier to attend.'
        ],
        answer: 0,
        explain: '第二句说手写跟不上每个词，所以学习者必须判断重点并用自己的话概括，这正是帮助记忆的原因。',
        optionNotes: [
          'A 对：select what matters + summarize in their own words。',
          'B 错：原文说手写 may feel slower。',
          'C 错：手写恰恰不能记下每个词。',
          'D 错：与笔记是否帮助记忆无关。'
        ]
      },
      {
        id: 'rtr-fruit',
        title: '换篇定位：办公室免费水果',
        passage: [
          'Many offices now offer free fruit instead of snacks.',
          'The change is popular, but it does not automatically make employees healthier.',
          'People may eat more fruit simply because it is nearby, while the snacks they miss are bought elsewhere.',
          'Health habits depend more on what is available all day than on a single free item.'
        ],
        stem: 'What does the author suggest about free fruit in offices?',
        options: [
          'Availability alone does not guarantee healthier habits.',
          'It has replaced all unhealthy snacks.',
          'It makes employees eat less fruit.',
          'It is more expensive than offering snacks.'
        ],
        answer: 0,
        explain: '第二、四句指出免费水果不会自动让人更健康；健康习惯取决于全天可选择的食物，而不只是一个免费项目。',
        optionNotes: [
          'A 对：does not automatically make employees healthier 的同义概括。',
          'B 错：员工想念的零食会去别处买，并未全部消失。',
          'C 错：因为近，可能吃得更多。',
          'D 错：没有比较成本。'
        ]
      }
    ],
    vocab: [
      {
        id: 'vtr-allowance',
        title: '换句检验：allowance',
        sentence: 'The new policy allows students to use their phones during breaks.',
        stem: '这里 allows 最接近的意思是：',
        options: ['允许', '分配', '减少', '记录'],
        answer: 0,
        explain: 'allow sb to do sth = 允许某人做某事。'
      },
      {
        id: 'vtr-concern',
        title: '换句检验：concern',
        sentence: 'The rise in food prices has caused widespread concern.',
        stem: '这里 concern 的意思是：',
        options: ['担忧', '涉及', '公司', '关心的人'],
        answer: 0,
        explain: 'cause concern = 引起担忧；concern 在此是名词。'
      }
    ]
  };

  /* ============================== 写作 / 翻译换题材料 ============================== */
  const OUTPUT_TRANSFERS = {
    writing: {
      title: '换题检验：一段有理由和例子的短文',
      promptZh: '请用 3–4 句英文表达：大学生是否应该每天安排固定的学习时间。至少包含一个理由和一个例子。',
      targetWords: [45, 80],
      model: 'I believe that students should set aside a fixed time for study every day. One reason is that a regular schedule makes it easier to form a habit. For example, a student who studies from 7 to 8 every evening may find it less difficult to start than someone who waits for free time. Therefore, a fixed study period can make learning more consistent, as long as it leaves room for rest.',
      checklist: ['观点清楚', '至少一个理由', '至少一个具体例子', '有收束句']
    },
    translation: {
      title: '换句检验：一句城市生活翻译',
      sourceZh: '为了方便居民出行，越来越多的城市正在增加公交线路。',
      chunks: [
        { label: '为了方便居民出行', options: ['to make travel easier for residents', 'to make it easier for residents to travel', 'to improve residents’ travel'] },
        { label: '越来越多的城市', options: ['more and more cities', 'an increasing number of cities', 'a growing number of cities'] },
        { label: '正在增加', options: ['are adding', 'are increasing', 'are expanding'] },
        { label: '公交线路', options: ['bus routes', 'bus lines'] }
      ],
      references: [
        'To make travel easier for residents, more and more cities are adding bus routes.',
        'An increasing number of cities are expanding their bus routes to make it easier for residents to get around.'
      ]
    }
  };

  /* ============================== 首次短测 ============================== */
  const DIAGNOSTIC = {
    intro: '9 道原创小题，约 7–9 分钟。不是模考，不能预测你的四级分数；只用来判断先练哪几项。',
    listeningScript: [
      { speaker: 'W', text: 'I was going to take the 8:30 train, but the ticket app says it’s fully booked.' },
      { speaker: 'M', text: 'There’s a bus at 9:15 that gets in at 10:40 — only twenty minutes later than the train.' },
      { speaker: 'W', text: 'That works. I’ll book it.' }
    ],
    questions: [
      {
        id: 'd1',
        module: 'vocab',
        skill: '语境词义',
        stem: 'Schools are encouraged to adopt a more flexible approach to homework. 这里 adopt 最接近的意思是：',
        options: ['收养', '采用', '改编', '拒绝'],
        answer: 1,
        explain: 'adopt an approach = 采用一种方法。“收养”只适用于孩子/宠物等语境。'
      },
      {
        id: 'd2',
        module: 'vocab',
        skill: '短语理解',
        stem: 'The company has decided to cut back on business travel to reduce costs. 这里 cut back on 最接近的意思是：',
        options: ['增加', '减少', '安排', '支付'],
        answer: 1,
        explain: 'cut back on = reduce；后面 to reduce costs 也提供了语义线索。'
      },
      {
        id: 'd3',
        module: 'syntax',
        skill: '长句主干',
        stem: 'What surprised the researchers was not the number of people who joined the program, but how long they stayed. 研究者在乎的主要意外是什么？',
        options: ['项目人数太少', '参与者停留的时间长度', '项目成本比预期高', '参与者不是研究人员'],
        answer: 1,
        explain: 'not A but B 的重点在 B：how long they stayed（他们待了多久）。'
      },
      {
        id: 'd4',
        module: 'listening',
        skill: '听力细节',
        stem: 'Why can’t the woman take the 8:30 train?',
        options: ['She missed it.', 'It is fully booked.', 'It is too expensive.', 'It leaves from another station.'],
        answer: 1,
        audio: true,
        explain: '女士说 the ticket app says it’s fully booked。fully booked = 票已售罄。'
      },
      {
        id: 'd5',
        module: 'listening',
        skill: '听力行动推断',
        stem: 'What will the woman do?',
        options: ['Take a bus at 9:15.', 'Wait for the next train.', 'Take a taxi.', 'Change her destination.'],
        answer: 0,
        audio: true,
        explain: '男士提出 9:15 的巴士，女士说 That works. I’ll book it，说明她会坐这班巴士。'
      },
      {
        id: 'd6',
        module: 'reading',
        skill: '定位细节',
        stem: 'According to the passage, what tends to happen after about 45 minutes of study?',
        options: ['Students become more productive.', 'Attention begins to drop.', 'Students need a longer lecture.', 'Breaks become less useful.'],
        answer: 1,
        passage: [
          'Many students believe that longer study sessions are always more productive.',
          'In fact, attention tends to drop after about 45 minutes.',
          'Short breaks can help restore focus, as long as they remain brief and do not turn into long distractions.'
        ],
        explain: '第二句直接说 attention tends to drop after about 45 minutes。'
      },
      {
        id: 'd7',
        module: 'reading',
        skill: '选项改写',
        stem: 'What does the passage suggest about very long study sessions?',
        options: ['They may be less effective than students assume.', 'They are always necessary before exams.', 'They make short breaks unnecessary.', 'They are more useful than focused blocks.'],
        answer: 0,
        passage: [
          'Many students believe that longer study sessions are always more productive.',
          'In fact, attention tends to drop after about 45 minutes.',
          'Short breaks can help restore focus, as long as they remain brief and do not turn into long distractions.'
        ],
        explain: '第一句说学生以为越长越高效，第二句用 In fact 反驳：45 分钟后注意力下降。因此长时段可能没有学生想的那么有效。'
      },
      {
        id: 'd8',
        module: 'writing',
        skill: '句子语法',
        stem: '下面哪一句语法正确、适合四级写作？',
        options: [
          'Although online courses are convenient, but they require self-discipline.',
          'Online courses are convenient, however they require self-discipline.',
          'Online courses are convenient; however, they require self-discipline.',
          'Online courses are convenient, they require self-discipline.'
        ],
        answer: 2,
        explain: 'however 连接两个完整句子时，前面用分号或句号。although 和 but 不同时使用；两个完整句也不能只用逗号连接。'
      },
      {
        id: 'd9',
        module: 'translation',
        skill: '意义与结构',
        stem: '“这项措施不仅降低了成本，也提高了效率。”下面哪种译法最准确、语法最稳？',
        options: [
          'This measure not only reduced costs but also improved efficiency.',
          'This measure not only reduced costs, and improved efficiency.',
          'This measure reduced not only costs but also improved efficiency.',
          'This measure only reduced costs but also improved efficiency.'
        ],
        answer: 0,
        explain: 'not only ... but also ... 连接两个并列的动词短语；A 的结构和意义都完整。'
      }
    ],
    skillLabels: {
      vocab: '语境词义',
      syntax: '长句结构',
      listening: '听力理解',
      reading: '阅读定位/改写',
      writing: '写作句法',
      translation: '翻译表达'
    },
    help: {
      vocab: '你背过单词，但需要练“在句子里判断词义”和同义替换。',
      syntax: '先找主谓宾和转折关系，再回选项对照。',
      listening: '练预读、抓关键信息和听出同义替换；合成语音只用于练习。',
      reading: '先定位依据，再看正确选项如何改写原文。',
      writing: '先把简单句写对，再练连接成段，不追求生僻词。',
      translation: '先找句子主干，再补修饰；允许不同正确表达。'
    }
  };

  /* ============================== 错因 ============================== */
  const REASONS = {
    word_unknown: { label: '单词不认识', help: '回到语境卡片，先看词性和搭配，再记在这个句子里的意思。' },
    context_meaning: { label: '认识但语境义判断错误', help: '不要只背第一个释义；用宾语、转折和上下文验证词义。' },
    syntax: { label: '句子结构没看懂', help: '练找主句的主谓宾，先删去插入语和从句。' },
    sound_word: { label: '认识但没听出来', help: '用合成语音做跟读和听辨，而不是只看听力稿。' },
    paraphrase_miss: { label: '没听出同义替换', help: '把原文表达和正确选项并排抄一次，积累“换说法”。' },
    question_miss: { label: '没抓住问题', help: '播放前先扫选项，听的时候确认题目问的是原因、行动还是态度。' },
    no_evidence: { label: '没找到依据', help: '阅读先点出一句原文依据，再选答案；不要凭印象。' },
    synonym_miss: { label: '同义替换没认出', help: '把原文表达和正确选项并排抄一次，注意词性、对象和范围是否保持一致。' },
    inference_error: { label: '推断过度/无依据', help: '回到原文，只允许从证据句推出一步；不要加入文章没有的信息。' },
    distractor: { label: '被干扰项误导', help: '逐项写出“错在哪个词”，特别注意绝对化、偷换对象和无中生有。' },
    time_short: { label: '时间不够', help: '下一组用限时模式；先做有依据的题，卡住就标记后跳。' },
    careless: { label: '粗心/看错', help: '提交前回读题干里的 NOT、EXCEPT 和数字。' },
    writing_grammar: { label: '语法错误', help: '优先检查主谓一致、连接词、时态和句子是否完整。' },
    writing_spelling: { label: '拼写错误', help: '把拼错的词放回短语里记，不要孤立背字母。' },
    writing_unclear: { label: '表达不清', help: '一句话只讲一个核心意思；先写主语+动词，再加修饰。' },
    writing_offtopic: { label: '偏题/漏要点', help: '动笔前列出题目要求的 3 个要点，逐项打勾。' },
    translation_missing: { label: '漏译/误译', help: '先圈出每句的主干和并列成分，再逐块译；允许意译。' },
    translation_grammar: { label: '语法/拼写', help: '先保证主谓和单复数，再使用 not only ... but also ... 等结构。' }
  };

  const REASON_GROUPS = {
    vocab: ['word_unknown', 'context_meaning', 'distractor', 'careless'],
    listening: ['word_unknown', 'sound_word', 'paraphrase_miss', 'question_miss', 'distractor', 'time_short'],
    reading: ['word_unknown', 'context_meaning', 'syntax', 'no_evidence', 'synonym_miss', 'inference_error', 'distractor', 'time_short', 'careless'],
    writing: ['writing_grammar', 'writing_spelling', 'writing_unclear', 'writing_offtopic'],
    translation: ['translation_missing', 'translation_grammar', 'writing_unclear']
  };

  const CONTENT_META = {
    version: '1.0.0',
    builtAt: '2026-11-10',
    counts: {
      vocabulary: VOCABULARY.length,
      listening: LISTENING_SETS.length,
      reading: READING_SETS.length,
      writing: WRITING_TASKS.length,
      translation: TRANSLATION_TASKS.length
    }
  };

  window.CET4Data = {
    VOCABULARY,
    LISTENING_SETS,
    READING_SETS,
    WRITING_TASKS,
    TRANSLATION_TASKS,
    TRANSFER_BANK,
    OUTPUT_TRANSFERS,
    DIAGNOSTIC,
    REASONS,
    REASON_GROUPS,
    DISCLAIMERS,
    CONTENT_META
  };
})();
