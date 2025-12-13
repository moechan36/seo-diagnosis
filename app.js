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
       ▼ 高度SEO
  ============================================================ */
  const headingResult = checkHeadingStructure(doc);
  const linkResult = checkInternalLinks(doc);
  const textResult = checkTextLength(doc);
  const indexResult = checkIndexStatus(doc);

  /* ============================================================
       ▼ 技術的SEO
  ============================================================ */
  const imgSizeResult = checkImageSizeAttributes(doc);
  const lazyResult = checkLazyLoad(doc);
  const resourceResult = checkResourceCount(doc);
  const htmlSizeResult = checkHTMLSize(doc);

  /* ============================================================
       ▼ 総合スコア
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
       ▼ 出力
  ============================================================ */
  result.innerHTML = `
    <h2>診断結果</h2>
    <h3>総合SEOスコア：${totalScore}点 / 100点</h3>
    <canvas id="scoreChart" width="200" height="200"></canvas>
  `;

  result.innerHTML += createCard("Title", title, titleAdvice, scoreTitle);
  result.innerHTML += createCard("Description", description, descAdvice, scoreDescription);
  result.innerHTML += createCard("H1", h1, h1Advice, scoreH1);
  result.innerHTML += createCard("画像 ALT", `未設定: ${altMissing}枚`, altAdvice, scoreAlt);
  result.innerHTML += createCard("構造化データ（JSON-LD）",
    ldTypes.length ? ldTypes.join(", ") : "なし", "", scoreLD);
  result.innerHTML += createCard("canonical", canonical, "", scoreCanonical);
  result.innerHTML += createCard("OGP（og:image）", ogImage, "", scoreOGP);

  result.innerHTML += `<h2 style="margin-top:40px;">高度SEOチェック</h2>`;
  result.innerHTML += createCard("Hタグ構造", headingResult.status, headingResult.message, headingResult.score);
  result.innerHTML += createCard("内部リンク数", linkResult.status, linkResult.message, linkResult.score);
  result.innerHTML += createCard("本文量", textResult.status, textResult.message, textResult.score);
  result.innerHTML += createCard("noindex / nofollow", indexResult.status, indexResult.message, indexResult.score);

  result.innerHTML += `<h2 style="margin-top:40px;">技術的SEOチェック</h2>`;
  result.innerHTML += createCard("画像サイズ属性", imgSizeResult.status, imgSizeResult.message, imgSizeResult.score);
  result.innerHTML += createCard("lazyload", lazyResult.status, lazyResult.message, lazyResult.score);
  result.innerHTML += createCard("CSS / JS リソース数", resourceResult.status, resourceResult.message, resourceResult.score);
  result.innerHTML += createCard("HTML容量", htmlSizeResult.status, htmlSizeResult.message, htmlSizeResult.score);

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

  const intent = analyzeSearchIntent(keyword);
  result.innerHTML += `
    <h2 style="margin-top:40px;">検索意図診断</h2>
    <div class="card">
      <p><strong>キーワード:</strong> ${keyword || "未入力"}</p>
      <p><strong>分類:</strong> ${intent.type}</p>
      <p>${intent.detail}</p>
    </div>
  `;

  drawScoreChart(totalScore);
}


/* ============================================================
   ▼ 以下 共通関数群
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

function priority(score) {
  if (score === 0) return "高";
  if (score <= 10) return "中";
  return "低";
}

/* ……（以降の補助関数はそのまま） */
