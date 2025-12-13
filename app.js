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
     総合スコア
  ------------------------- */
  const totalScore =
    scoreTitle +
    scoreDescription +
    scoreH1 +
    scoreAlt;

  result.innerHTML = `
    <h2>診断結果</h2>
    <h3>総合SEOスコア：${totalScore}点 / 100点</h3>
    <canvas id="scoreChart" width="200" height="200"></canvas>
  `;

  result.innerHTML += createCard("Title", title, titleAdvice, scoreTitle);
  result.innerHTML += createCard("Description", description, descAdvice, scoreDescription);
  result.innerHTML += createCard("H1", h1, h1Advice, scoreH1);
  result.innerHTML += createCard("画像 ALT", `未設定: ${altMissing}枚`, altAdvice, scoreAlt);

  drawScoreChart(totalScore);

  /* ▼ 関連キーワード（サジェスト） */
  renderSuggestSection(keyword);
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

function priority(score) {
  if (score === 0) return "高";
  if (score <= 10) return "中";
  return "低";
}


/* ============================================================
   ▼ 円グラフ
============================================================ */
function drawScoreChart(totalScore) {
  const canvas = document.getElementById("scoreChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const percentage = totalScore / 100;

  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2);
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(100, 100, 80, -Math.PI / 2, Math.PI * 2 * percentage - Math.PI / 2);
  ctx.strokeStyle = "#4F7BFA";
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText(`${totalScore}点`, 100, 110);
}


/* ============================================================
   ▼ 関連キーワード（DuckDuckGo Suggest）
============================================================ */
async function renderSuggestSection(keyword) {
  if (!keyword) return;

  try {
    const res = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(keyword)}&type=list`
    );
    const data = await res.json();

    if (!data.length) return;

    const list = data.slice(0, 20).map(d => d.phrase);

    const result = document.getElementById("result");
    result.innerHTML += `
      <h2 style="margin-top:40px;">関連キーワード（サジェスト）</h2>
      <div class="card">
        ${list.map(w => `<p>${w}</p>`).join("")}
      </div>
    `;
  } catch (e) {
    console.error("サジェスト取得失敗", e);
  }
}
