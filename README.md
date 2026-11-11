# 四级提分台

一个**本地优先**的四级真题练习网页：真题阅读、听力题组、选词填空、长篇匹配、写作/翻译草稿、错题三阶段、真题词库。

> 当前版本：**v5.12.0**  
> 状态：本地基线已验证；**公开演示版已发布到 GitHub Pages**；完整题库/音频仍只在本机，不随公开仓库分发。

## 两种发布包

| 包 | 内容 | 用途 |
| --- | --- | --- |
| `release/cet4-score-booster-public-5.12.0.zip` | 代码 + 自写演示阅读，**不含任何真题 PDF/MP3/题库** | 已发布到 GitHub Pages 演示 |
| `release/cet4-score-booster-local-5.12.0.zip` | 代码 + 本机真题数据/音频 | **仅本人本地使用，不可公开再分发** |

完整题库和音频有第三方来源，公开再分发许可未确认，因此 GitHub 公开仓库只放 `docs/` 演示版。

### 从 GitHub 下载公开演示包（任何人都可以）

1. 打开 Releases：<https://github.com/AAAsuperman/cet4-score-booster/releases/tag/v5.12.0>
2. 下载 `cet4-score-booster-public-5.12.0.zip`（约 0.2 MB）。
3. 解压后进入目录：

```powershell
Expand-Archive -LiteralPath ".\cet4-score-booster-public-5.12.0.zip" -DestinationPath ".\cet4-score-booster-public" -Force
cd .\cet4-score-booster-public
```

4. 启动并打开：

```powershell
python -m http.server 8790 --bind 127.0.0.1
```

```text
http://127.0.0.1:8790/
```

公开包只有自写演示阅读，**没有真题音频是预期行为**。

### 本地完整包（不公开下载）

完整包 `release/cet4-score-booster-local-5.12.0.zip` 只在仓库所有者的本机；不要上传到 GitHub Release。它含真实题库和 MP3，用于本机验证和使用。

## 下载与解压

### 本地完整包

1. 取得 `cet4-score-booster-local-5.12.0.zip`。
2. 右键 → 全部解压，或 PowerShell：

```powershell
Expand-Archive -LiteralPath ".\cet4-score-booster-local-5.12.0.zip" -DestinationPath ".\cet4-score-booster-local" -Force
```

3. 进入解压目录：

```powershell
cd .\cet4-score-booster-local
```

### 公开演示包

```powershell
Expand-Archive -LiteralPath ".\cet4-score-booster-public-5.12.0.zip" -DestinationPath ".\cet4-score-booster-public" -Force
cd .\cet4-score-booster-public
```

公开包只有自写演示短文，页面顶部会标“公开演示数据，非真题”。

## 本地启动

需要 Python 3（Windows 自带或已安装均可）：

```powershell
python -m http.server 8790 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:8790/
```

也可以双击 `启动四级提分台.bat`（该脚本会启动同一端口）。不要直接双击 `index.html` 作为长期入口，浏览器对本地文件的存储/音频权限与 HTTP 不同。

**验证标准：**

- 页面能打开，顶部显示版本/题库。
- 「真题练习」能筛选、翻页、点“开始”进入答题。
- 完整包中能加载 150 道阅读、5 套听力；听力题组页应有真实 MP3。
- 公开包只有演示阅读；没有真题音频是预期行为，不是加载失败。

## 学习记录与同步

- 作答、错题、词本、草稿保存在当前浏览器的 `localStorage`，键名 `cet4_score_booster_v1`。
- **不跨设备同步**；换电脑/换浏览器需要“设置 → 导出进度/导入进度”。
- 清理浏览器站点数据会删除本地记录。公开演示版与本地完整版即使同域名不同路径，也可能是不同存储空间。

## 目录结构

```text
cet4-score-booster/
├─ index.html                 本地完整版入口
├─ assets/
│  ├─ app.js, styles.css      页面和交互
│  ├─ reading-*.js            阅读题库/解析
│  ├─ listening-*.js          听力题组/时间轴
│  ├─ fill-extra.js           选词填空
│  ├─ match-extra.js          长篇匹配
│  ├─ output-extra.js         写作/翻译题目
│  ├─ true-exams/             真题 PDF/MP3（不进入公开仓库）
│  └─ library/                本机资料目录联接（不提交）
├─ docs/                      公开演示版（GitHub Pages）
│  ├─ index.html
│  └─ assets/                 仅代码 + demo-data.js
├─ scripts/set-version.mjs    统一版本号脚本
├─ VERSION                    5.12.0
├─ CHANGELOG.md
├─ THIRD_PARTY.md
└─ LICENSE-CODE-PROPOSAL.md   许可证建议，待确认
```

## 版本管理

只改 `VERSION`，然后运行：

```powershell
node .\scripts\set-version.mjs
```

脚本会统一更新 `index.html`、`docs/index.html` 和启动脚本中的 `?v=` 查询串。不要逐行手改缓存版本。

## GitHub Pages（已启用）

- 仓库：<https://github.com/AAAsuperman/cet4-score-booster>
- 在线演示：<https://aaasuperman.github.io/cet4-score-booster/>
- Pages 源：`main` 分支 / `docs/` 目录

公开演示版顶部始终标注“非真题”；真实题库只在本地完整版使用。仓库没有提交 `assets/true-exams/`、`assets/library/` 或真题数据 JS。

后续更新：提交并推送 `main` 后，Pages 会自动重新构建。

### 本地 Git 命令

```powershell
git log --oneline --decorate
git show --stat HEAD
git diff HEAD~1..HEAD
git checkout v5.12.0
git switch -c experiment/next-change
git add .
git commit -m "说明本次改动"
git tag -a v5.12.1 -m "v5.12.1"
git push -u origin main
```

## 资料许可

- 代码：**MIT**（见仓库根目录 `LICENSE`，版权署名 AAAsuperman）。
- 自写公开演示数据：可与代码同许可。
- `CET46-Resources` 真题 PDF/MP3/题库：第三方整理，非官方；再分发许可未确认，不进入公开包。
- 答案来自第三方答案表/原卷 KEYS；OCR/ASR 文本是候选，不等于人工核验。

详见 `LICENSE`、`THIRD_PARTY.md`、`BANK-STATUS.md`（后者仅本地）。

## 干净发布包验证（2026-11-11）

| 包 | 大小 | 验证结果 |
| --- | ---: | --- |
| `release/cet4-score-booster-local-5.12.0.zip` | 约 133 MB | 解压后另起 8791 端口：页面打开；15 组 / 150 题加载；5 套听力加载；MP3 请求 HTTP 200，`audio.readyState=4`，时长 1352 秒；无控制台报错。 |
| `release/cet4-score-booster-public-5.12.0.zip` | 约 0.2 MB | 解压后另起 8792 端口：页面打开；1 组自写演示阅读加载；无真题音频为预期；无控制台报错。 |

完整包包含本机第三方资料，**不可公开上传**；公开包只有代码和自写演示数据。

> 注意：完整包移除了 `assets/library` 目录联接，因为 ZIP 不能可靠携带指向本机资料目录的联接。阅读/听力结构化题库不受影响；资料库的原始文件链接会失效，需要在本机重新建立联接或手动放置资料。


> 许可证：代码和自写演示数据采用 MIT License（Copyright 2026 AAAsuperman）；第三方真题/音频不在该许可范围内。
