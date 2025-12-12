document.getElementById("checkBtn").addEventListener("click", async () => {

  const url = document.getElementById("urlInput").value;
  const result = document.getElementById("result");

  if (!url) {
    result.innerHTML = "<p>URLを入力してください。</p>";
    return;
  }

  result.innerHTML = "<p>診断中… 少しお待ちください。</p>";

  const proxy = "https://api.allorigins.win/raw?url=";

  try {
    const response = await fetch(proxy + encodeURIComponent(url));
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    checkSEO(doc);

  } catch (error) {
    console.error(error);
    result.innerHTML = "<p>ページを取得できませんでした。</p>";
  }
});



function checkSEO(doc) {
  const result = document.getElementById("result");

  /* Title */
  const title = doc.querySelector("title")?.innerText.trim() || "なし";
  let titleAdvice = "";
  let scoreTitle = 0;

  if (title === "なし") titleAdvice = "タイトルがありません。";
  else if (title.length < 30) { titleAdvice = "タイトルが短いです。30〜60文字が理想です。"; scoreTitle = 10; }
  else if (title.length > 60) { titleAdvice = "タイトルが長すぎます。検索で途中で切れます。"; scoreTitle = 10; }
  else { titleAdvice = "良好です。"; scoreTitle = 20; }

  /* Description */
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "なし";

  let descAdvice = "";
  let scoreDescription = 0;

  if (description === "なし") descAdvice = "description がありません。";
  else if (description.length < 80) { descAdvice = "短すぎます。"; scoreDescription = 10; }
  else if (description.length > 180) { descAdvice = "長すぎます。"; scoreDescription = 10; }
  else { descAdvice = "良好です。"; scoreDescription = 20; }

  /* H1（推定機能あり） */
  let h1Element = doc.querySelector("h1");
  let h1 = h1Element ? h1Element.innerText.trim() : "";
  let h1Count = doc.querySelectorAll("h1").length;

  if (!h1) {
    const fallback = doc.querySelector("h2, h3, .title, .page-title");
    if (fallback) h1 = fallback.innerText.trim() + "（推定）";
    else h1 = "（H1が検出されません）";
  }

  let h1Advice = "";
  let scoreH1 = 0;
  if (h1Count === 0) h1Advice = "H1タグがありません。";
  else if (h1Count > 1) { h1Advice = "H1が複数あります。"; scoreH1 = 10; }
  else { h1Advice = "良好です。"; scoreH1 = 15; }

  /* alt */
  const images = [...doc.querySelectorAll("img")];
  const altMissing = images.filter(i => !i.getAttribute("alt")).length;

  let altAdvice = altMissing === 0
    ? "全ての画像に alt が設定されています。"
    : `${altMissing}枚が alt 未設定です。`;

  let scoreAlt = altMissing === 0 ? 15 :
                 (altMissing <= images.length * 0.3 ? 7 : 0);

  /* JSON-LD */
  let ldTypes = [];
  const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');

  ldScripts.forEach(s => {
    try {
      const json = JSON.parse(s.innerText);
      if (json["@type"]) ldTypes.push(json["@type"]);
      if (Array.isArray(json))
        json.forEach(j => j["@type"] && ldTypes.push(j["@type"]));
    } catch {}
  });

  let scoreLD = ldTypes.length > 0 ? 15 : 0;
  let ldAdvice = scoreLD ? "良好です。" : "構造化データがありません。";

  /* canonical */
  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "なし";

  let scoreCanonical = canonical !== "なし" ? 10 : 0;
  let canonicalAdvice = scoreCanonical ? "良好です。" : "canonical がありません。";

  /* OGP */
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "なし";
  const ogDesc  = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "なし";
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "なし";

  let scoreOGP = ogImage !== "なし" ? 5 : 0;
  let ogAdvice = scoreOGP ? "良好です。" : "OGP画像がありません。";

  /* 合計スコア */
  const totalScore =
    scoreTitle +
    scoreDescription +
    scoreH1 +
    scoreAlt +
    scoreLD +
    scoreCanonical +
    scoreOGP;

  /* 総括コメント：内部処理用 */
  let reasons = [];
  if (scoreTitle < 20) reasons.push("タイトルが最適ではありません。");
  if (scoreDescription < 20) reasons.push("ディスクリプションが最適ではありません。");
  if (scoreH1 < 15) reasons.push("H1 に問題があります。");
  if (scoreAlt < 15) reasons.push("画像の alt が不足しています。");
  if (scoreLD < 15)  reasons.push("構造化データがありません。");
  if (scoreCanonical < 10) reasons.push("canonical がありません。");
  if (scoreOGP < 5) reasons.push("OGP画像がありません。");

  /* ★ カードUIで出力 ＋ 優先度表示 */
  result.innerHTML = `
    <h2>診断結果</h2>

    <h3>総合SEOスコア：${totalScore}点 / 100点</h3>
    <canvas id="scoreChart" width="200" height="200"></canvas>

    <div class="card">
      <span class="priority">優先度：${priority(scoreTitle)}</span>
      <h4>Title</h4>
      <p><strong>内容:</strong> ${title}</p>
      <p>${titleAdvice}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreDescription)}</span>
      <h4>Description</h4>
      <p><strong>内容:</strong> ${description}</p>
      <p>${descAdvice}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreH1)}</span>
      <h4>H1</h4>
      <p><strong>内容:</strong> ${h1}</p>
      <p>${h1Advice}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreAlt)}</span>
      <h4>画像 ALT</h4>
      <p><strong>未設定:</strong> ${altMissing}枚</p>
      <p>${altAdvice}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreLD)}</span>
      <h4>構造化データ（JSON-LD）</h4>
      <p><strong>検出タイプ:</strong> ${ldTypes.length ? ldTypes.join(", ") : "なし"}</p>
      <p>${ldAdvice}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreCanonical)}</span>
      <h4>canonical</h4>
      <p><strong>内容:</strong> ${canonical}</p>
      <p>${canonicalAdvice}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreOGP)}</span>
      <h4>OGP</h4>
      <p><strong>og:title:</strong> ${ogTitle}</p>
      <p><strong>og:description:</strong> ${ogDesc}</p>
      <p><strong>og:image:</strong> ${ogImage}</p>
      <p>${ogAdvice}</p>
    </div>
  `;



  /* ★ 円グラフ描画（色分け対応） */
  const canvas = document.getElementById("scoreChart");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const percentage = totalScore / 100;

    // スコアに応じて色を変える
    let graphColor = "#e74c3c"; // 赤
    if (totalScore >= 80) graphColor = "#2ecc71";     // 緑
    else if (totalScore >= 40) graphColor = "#f1c40f"; // 黄

    // 背景グレー円
    ctx.beginPath();
    ctx.arc(100, 100, 80, 0, Math.PI * 2);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 18;
    ctx.stroke();

    // スコア円
    ctx.beginPath();
    ctx.arc(100, 100, 80, -Math.PI / 2, Math.PI * 2 * percentage - Math.PI / 2);
    ctx.strokeStyle = graphColor;
    ctx.lineWidth = 18;
    ctx.stroke();

    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(`${totalScore}点`, 100, 110);
  }
}



/* ★ 優先度判定関数 */
function priority(score) {
  if (score === 0) return "高";
  if (score <= 10) return "中";
  return "低";
}
