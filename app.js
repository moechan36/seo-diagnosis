/* ============================================================
   ボタンクリック
============================================================ */
document.getElementById("checkBtn").addEventListener("click", async () => {
  const url = document.getElementById("urlInput").value.trim();
  const keyword = document.getElementById("keywordInput").value.trim();
  const result = document.getElementById("result");

  if (!url) {
    result.innerHTML = "<p>URLを入力してください。</p>";
    return;
  }

  result.innerHTML = "<p>診断中… 少しお待ちください。</p>";

  const proxy = "https://corsproxy.io/?";

  try {
    const response = await fetch(proxy + encodeURIComponent(url));
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    runFullSEOCheck(doc, keyword);

  } catch (error) {
    console.error(error);
    result.innerHTML = "<p>ページを取得できませんでした。</p>";
  }
});


/* ============================================================
   ▼ フルSEO診断メイン
============================================================ */
function runFullSEOCheck(doc, keyword) {
  const result = document.getElementById("result");

  /* -------------------------
     Title
  ------------------------- */
  const title = doc.querySelector("title")?.innerText.trim() || "なし";

  let scoreTitle = 0;
  let titleAdvice = "";

  if (title === "なし") titleAdvice = "タイトルがありません。";
  else if (title.length < 30) { titleAdvice = "短すぎます（30〜60文字推奨）。"; scoreTitle = 10; }
  else if (title.length > 60) { titleAdvice = "長すぎます（途中で切れます）。"; scoreTitle = 10; }
  else { titleAdvice = "良好です。"; scoreTitle = 20; }

  /* -------------------------
     Description
  ------------------------- */
  const description =
    doc.querySelector('meta[name="description"]')?.content || "なし";

  let scoreDescription = 0;
  let descAdvice = "";

  if (description === "なし") descAdvice = "description がありません。";
  else if (description.length < 80) { descAdvice = "短すぎます。"; scoreDescription = 10; }
  else if (description.length > 180) { descAdvice = "長すぎます。"; scoreDescription = 10; }
  else { descAdvice = "良好です。"; scoreDescription = 20; }

  /* -------------------------
     H1
  ------------------------- */
  let h1El = doc.querySelector("h1");
  let h1 = h1El ? h1El.innerText.trim() : "";
  let h1Count = doc.querySelectorAll("h1").length;

  if (!h1) {
    const fb = doc.querySelector("h2, h3, .title, .page-title");
    if (fb) h1 = fb.innerText.trim() + "（推定）";
    else h1 = "（H1が検出されません）";
  }

  let scoreH1 = 0;
  let h1Advice = "";

  if (h1Count === 0) h1Advice = "H1タグがありません。";
  else if (h1Count > 1) { h1Advice = "H1が複数あります。"; scoreH1 = 10; }
  else { h1Advice = "良好です。"; scoreH1 = 15; }

  /* -------------------------
     ALT
  ------------------------- */
  const images = [...doc.querySelectorAll("img")];
  const altMissing = images.filter(i => !i.alt).length;

  let scoreAlt = 0;
  const altAdvice =
    altMissing === 0
      ? "全てに alt が設定されています。"
      : `${altMissing}枚が alt 未設定です。`;

  if (altMissing === 0) scoreAlt = 15;
  else if (altMissing <= images.length * 0.3) scoreAlt = 7;

  /* -------------------------
     JSON-LD
  ------------------------- */
  let ldTypes = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const json = JSON.parse(s.innerText);
      if (json["@type"]) ldTypes.push(json["@type"]);
      if (Array.isArray(json)) {
        json.forEach(j => j["@type"] && ldTypes.push(j["@type"]));
      }
    } catch {}
  });
  let scoreLD = ldTypes.length > 0 ? 15 : 0;

  /* -------------------------
     canonical
  ------------------------- */
  const canonical =
    doc.querySelector('link[rel="canonical"]')?.href || "なし";

  let scoreCanonical = canonical !== "なし" ? 10 : 0;

  /* -------------------------
     OGP
  ------------------------- */
  const ogImage = doc.querySelector('meta[property="og:image"]')?.content || "なし";
  let scoreOGP = ogImage !== "なし" ? 5 : 0;


  /* ============================================================
       ▼ 高度SEO（H構造・内部リンク・本文量・noindex）
  ============================================================ */
  const headingResult = checkHeadingStructure(doc);
  const linkResult = checkInternalLinks(doc);
  const textResult = checkTextLength(doc);
  const indexResult = checkIndexStatus(doc);

  /* ============================================================
       ▼ 技術的SEO（Core Web Vitals ライト版）
  ============================================================ */
  const imgSizeResult = checkImageSizeAttributes(doc);
  const lazyResult = checkLazyLoad(doc);
  const resourceResult = checkResourceCount(doc);
  const htmlSizeResult = checkHTMLSize(doc);

  /* ============================================================
       ▼ 総合スコア（基本診断）
  ============================================================ */
  const totalScore =
    scoreTitle +
    scoreDescription +
    scoreH1 +
    scoreAlt +
    scoreLD +
    scoreCanonical +
    scoreOGP;


  /* ============================================================
       ▼ 出力HTML
  ============================================================ */
  result.innerHTML = `
    <h2>診断結果</h2>
    <h3>総合SEOスコア：${totalScore}点 / 100点</h3>
    <canvas id="scoreChart" width="200" height="200"></canvas>
  `;

  /* ▼ Title */
  result.innerHTML += createCard("Title", `内容: ${title}`, titleAdvice, scoreTitle);

  /* ▼ Description */
  result.innerHTML += createCard("Description", `内容: ${description}`, descAdvice, scoreDescription);

  /* ▼ H1 */
  result.innerHTML += createCard("H1", `内容: ${h1}`, h1Advice, scoreH1);

  /* ▼ ALT */
  result.innerHTML += createCard("画像 ALT", `未設定: ${altMissing}枚`, altAdvice, scoreAlt);

  /* ▼ JSON-LD */
  result.innerHTML += createCard("構造化データ（JSON-LD）",
    `検出タイプ: ${ldTypes.length ? ldTypes.join(", ") : "なし"}`, "", scoreLD);

  /* ▼ canonical */
  result.innerHTML += createCard("canonical", canonical, "", scoreCanonical);

  /* ▼ OGP */
  result.innerHTML += createCard("OGP（og:image）", ogImage, "", scoreOGP);


  /* ============================================================
       ▼ 高度SEO
  ============================================================ */
  result.innerHTML += `<h2 style="margin-top:40px;">高度SEOチェック</h2>`;
  result.innerHTML += createCard("Hタグ構造", headingResult.status, headingResult.message, headingResult.score);
  result.innerHTML += createCard("内部リンク数", linkResult.status, linkResult.message, linkResult.score);
  result.innerHTML += createCard("本文量", textResult.status, textResult.message, textResult.score);
  result.innerHTML += createCard("noindex / nofollow", indexResult.status, indexResult.message, indexResult.score);


  /* ============================================================
       ▼ 技術的SEO
  ============================================================ */
  result.innerHTML += `<h2 style="margin-top:40px;">技術的SEOチェック</h2>`;
  result.innerHTML += createCard("画像サイズ属性", imgSizeResult.status, imgSizeResult.message, imgSizeResult.score);
  result.innerHTML += createCard("lazyload", lazyResult.status, lazyResult.message, lazyResult.score);
  result.innerHTML += createCard("CSS / JS リソース数", resourceResult.status, resourceResult.message, resourceResult.score);
  result.innerHTML += createCard("HTML容量", htmlSizeResult.status, htmlSizeResult.message, htmlSizeResult.score);


  /* ============================================================
       ▼ AI総合コメント
  ============================================================ */
  const aiComment = generateAIComment({
    scoreTitle,
    scoreDescription,
    scoreH1,
    scoreAlt,
    linkScore: linkResult.score,
    textScore: textResult.score,
    indexScore: indexResult.score
  });

  result.innerHTML += `
    <div class="card" style="margin-top:30px;">
      <h4>総合AIコメント</h4>
      <p>${aiComment}</p>
    </div>
  `;


  /* ============================================================
       ▼ 検索意図診断
  ============================================================ */
  const intent = analyzeSearchIntent(keyword);
  result.innerHTML += `
    <h2 style="margin-top:40px;">検索意図診断</h2>
    <div class="card">
      <h4>検索意図</h4>
      <p><strong>キーワード:</strong> ${keyword || "未入力"}</p>
      <p><strong>分類:</strong> ${intent.type}</p>
      <p>${intent.detail}</p>
    </div>
  `;


  /* ============================================================
   ▼ キーワード抽出（改善版）
============================================================ */
const rawText = doc.body.innerText;

// 日本語・英語を含む単語抽出（句読点・記号除外）
const cleanedText = rawText
  .replace(/[\n\r]/g, " ")
  .replace(/[0-9０-９]/g, "")   // 数字削除（kmなど残す場合は外す）
  .replace(/[、。,.!！?？"“”'’・/()（）【】『』\[\]{}]/g, " ")
  .replace(/\s+/g, " ")         // 連続スペース除去
  .trim();

const words = cleanedText.split(" ").filter(w =>
  w.length >= 2 &&            // 2文字未満は除外（: や . を防ぐ）
  !/^[A-Za-z]{1}$/.test(w) && // 英字1文字も除外
  w !== ":" &&
  w !== "：" &&
  w !== "const"               // JSコード断片除外
);

const freq = {};
words.forEach(w => freq[w] = (freq[w] || 0) + 1);

// 出現回数が多い順にトップ20
const sortedWords = Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

result.innerHTML += `
  <h2 style="margin-top:40px;">主要キーワード（自動抽出）</h2>
  <div class="card">
    ${sortedWords.map(([w, c]) => `<p>${w} : ${c}回</p>`).join("")}
  </div>
`;

  /* ============================================================
       ▼ 円グラフ
  ============================================================ */
  drawScoreChart(totalScore);
}


/* ============================================================
   ▼ カードUI
============================================================ */
function createCard(title, content, advice, score) {
  return `
    <div class="card">
      <span class="priority">優先度：${priority(score)}</span>
      <h4>${title}</h4>
      <p><strong>内容:</strong> ${content}</p>
      <p>${advice}</p>
    </div>
  `;
}


/* ============================================================
   ▼ 優先度判定
============================================================ */
function priority(score) {
  if (score === 0) return "高";
  if (score <= 10) return "中";
  return "低";
}


/* ============================================================
   ▼ 高度SEO判定
============================================================ */
function checkHeadingStructure(doc) {
  const hs = [...doc.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(h => h.tagName);

  if (hs.length <= 1)
    return { status: "改善", message: "見出し構造が少ないです。", score: 0 };

  let ok = true;
  for (let i = 0; i < hs.length - 1; i++) {
    const now = Number(hs[i][1]);
    const next = Number(hs[i+1][1]);
    if (next - now > 1) ok = false;
  }

  return ok
    ? { status: "良好", message: "見出し階層は適切です。", score: 15 }
    : { status: "注意", message: "見出し階層に飛びがあります。", score: 7 };
}


function checkInternalLinks(doc) {
  const links = [...doc.querySelectorAll("a")].length;

  if (links === 0) return { status: "改善", message: "内部リンクがありません。", score: 0 };
  if (links < 5) return { status: "注意", message: `内部リンクが少ないです（${links}件）。`, score: 7 };

  return { status: "良好", message: `内部リンクは十分です（${links}件）。`, score: 15 };
}


function checkTextLength(doc) {
  const len = doc.body.innerText.replace(/\s+/g, "").length;

  if (len < 300) return { status: "改善", message: `本文量が少なすぎます（${len}文字）。`, score: 0 };
  if (len < 800) return { status: "注意", message: `本文量は少なめです（${len}文字）。`, score: 7 };

  return { status: "良好", message: `本文量は十分です（${len}文字）。`, score: 15 };
}


function checkIndexStatus(doc) {
  const robots = doc.querySelector('meta[name="robots"]')?.content || "";

  if (robots.includes("noindex"))
    return { status: "改善", message: "noindex が設定されています。", score: 0 };

  if (robots.includes("nofollow"))
    return { status: "注意", message: "nofollow が設定されています。", score: 7 };

  return { status: "良好", message: "インデックスは正常です。", score: 15 };
}


/* ============================================================
   ▼ 技術的SEO
============================================================ */
function checkImageSizeAttributes(doc) {
  const imgs = [...doc.querySelectorAll("img")];
  const missing = imgs.filter(img => !img.width || !img.height).length;

  if (missing === 0)
    return { status: "良好", message: "全画像に width/height があります。", score: 15 };

  if (missing <= imgs.length * 0.3)
    return { status: "注意", message: `${missing}枚の画像にサイズ属性が不足。`, score: 7 };

  return { status: "改善", message: `${missing}枚の画像に size 属性なし。`, score: 0 };
}


function checkLazyLoad(doc) {
  const imgs = [...doc.querySelectorAll("img")];
  const lazy = imgs.filter(i => i.loading === "lazy").length;

  if (lazy === 0)
    return { status: "改善", message: "lazyload が設定されていません。", score: 0 };

  if (lazy < imgs.length * 0.5)
    return { status: "注意", message: `lazyload が一部のみ（${lazy}枚）。`, score: 7 };

  return { status: "良好", message: "lazyload が適切です。", score: 15 };
}


function checkResourceCount(doc) {
  const cssCount = doc.querySelectorAll('link[rel="stylesheet"]').length;
  const jsCount = doc.querySelectorAll("script[src]").length;

  const total = cssCount + jsCount;
  let score = 15;
  let msg = `CSS: ${cssCount} / JS: ${jsCount}`;

  if (total > 20) { score = 0; msg += " → 多すぎです。"; }
  else if (total > 10) { score = 7; msg += " → やや多め。"; }

  return { status: score === 15 ? "良好" : score === 7 ? "注意" : "改善", message: msg, score };
}


function checkHTMLSize(doc) {
  const html = doc.documentElement.outerHTML;
  const size = new Blob([html]).size / 1024;

  if (size < 100)
    return { status: "良好", message: `ページサイズ：${Math.round(size)} KB`, score: 15 };

  if (size < 300)
    return { status: "注意", message: `ページサイズ：${Math.round(size)} KB（少し重い）`, score: 7 };

  return { status: "改善", message: `ページサイズ：${Math.round(size)} KB（重い）`, score: 0 };
}


/* ============================================================
   ▼ 検索意図診断
============================================================ */
function analyzeSearchIntent(keyword) {
  if (!keyword) return { type: "未入力", detail: "キーワードが入力されていません。" };

  const k = keyword.toLowerCase();

  if (k.includes("とは") || k.includes("意味") || k.includes("方法") || k.includes("やり方") || k.includes("相場"))
    return { type: "Know（知りたい）", detail: "情報収集目的の検索意図です。" };

  if (k.includes("予約") || k.includes("申込み") || k.includes("査定") || k.includes("問い合わせ"))
    return { type: "Do（行動したい）", detail: "行動を目的とした検索意図です。" };

  if (k.includes("店舗") || k.includes("アクセス") || k.includes("営業時間"))
    return { type: "Go（場所探し）", detail: "場所やアクセスを探す意図です。" };

  if (k.includes("購入") || k.includes("買う") || k.includes("料金") || k.includes("値段"))
    return { type: "Buy（購入したい）", detail: "購入意図が強い検索です。" };

  return { type: "Know（知りたい）", detail: "一般的な情報収集型の検索意図です。" };
}


/* ============================================================
   ▼ AI総合コメント
============================================================ */
function generateAIComment(r) {
  let c = "総合的に見て、";

  c += r.scoreTitle < 15 ? "タイトルには改善の余地があります。" : "タイトルは適切です。";
  c += r.scoreDescription < 15 ? " descriptionを最適化すると良いでしょう。" : " descriptionは良好です。";
  c += r.scoreH1 < 15 ? " H1タグに改善の余地があります。" : " H1は適切に設定されています。";
  c += r.scoreAlt < 15 ? " ALT不足があります。" : "";
  c += r.linkScore < 15 ? " 内部リンクが不足しています。" : " 内部リンクは適切です。";
  c += r.textScore < 15 ? " 本文量は少なめです。" : " 本文量は十分です。";
  c += r.indexScore < 15 ? " インデックス設定に注意が必要です。" : "";

  return c + " 全体としてSEO基礎は整っています。";
}


/* ============================================================
   ▼ 円グラフ
============================================================ */
function drawScoreChart(totalScore) {
  const canvas = document.getElementById("scoreChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const percentage = totalScore / 100;

  let color = "#e74c3c";
  if (totalScore >= 80) color = "#2ecc71";
  else if (totalScore >= 40) color = "#f1c40f";

  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2);
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(100, 100, 80, -Math.PI / 2, Math.PI * 2 * percentage - Math.PI / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(`${totalScore}点`, 100, 110);
}
