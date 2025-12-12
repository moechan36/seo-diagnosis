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

  /* ------------------------------------
     Title
  ------------------------------------ */
  const title = doc.querySelector("title")?.innerText.trim() || "なし";
  let titleAdvice = "";
  let scoreTitle = 0;

  if (title === "なし") titleAdvice = "タイトルがありません。";
  else if (title.length < 30) { titleAdvice = "タイトルが短いです。30〜60文字が理想です。"; scoreTitle = 10; }
  else if (title.length > 60) { titleAdvice = "タイトルが長すぎます。検索で途中で切れます。"; scoreTitle = 10; }
  else { titleAdvice = "良好です。"; scoreTitle = 20; }


  /* ------------------------------------
     Description
  ------------------------------------ */
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "なし";

  let descAdvice = "";
  let scoreDescription = 0;

  if (description === "なし") descAdvice = "description がありません。";
  else if (description.length < 80) { descAdvice = "短すぎます。"; scoreDescription = 10; }
  else if (description.length > 180) { descAdvice = "長すぎます。"; scoreDescription = 10; }
  else { descAdvice = "良好です。"; scoreDescription = 20; }


  /* ------------------------------------
     H1
  ------------------------------------ */
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


  /* ------------------------------------
     ALT
  ------------------------------------ */
  const images = [...doc.querySelectorAll("img")];
  const altMissing = images.filter(i => !i.getAttribute("alt")).length;

  let altAdvice = altMissing === 0
    ? "全ての画像に alt が設定されています。"
    : `${altMissing}枚が alt 未設定です。`;

  let scoreAlt = altMissing === 0 ? 15 :
                 (altMissing <= images.length * 0.3 ? 7 : 0);


  /* ------------------------------------
     JSON-LD（構造化データ）
  ------------------------------------ */
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


  /* ------------------------------------
     canonical
  ------------------------------------ */
  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "なし";

  let scoreCanonical = canonical !== "なし" ? 10 : 0;
  let canonicalAdvice = scoreCanonical ? "良好です。" : "canonical がありません。";


  /* ------------------------------------
     OGP
  ------------------------------------ */
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "なし";
  const ogDesc  = doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "なし";
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "なし";

  let scoreOGP = ogImage !== "なし" ? 5 : 0;
  let ogAdvice = scoreOGP ? "良好です。" : "OGP画像がありません。";


  /* ------------------------------------
     ▼ 高度SEOチェック（4項目）
  ------------------------------------ */
  const headingResult = checkHeadingStructure(doc);
  const linkResult = checkInternalLinks(doc);
  const textResult = checkTextLength(doc);
  const indexResult = checkIndexStatus(doc);


  /* ------------------------------------
     ▼ 合計スコア（基本部分のみ）
  ------------------------------------ */
  const totalScore =
    scoreTitle +
    scoreDescription +
    scoreH1 +
    scoreAlt +
    scoreLD +
    scoreCanonical +
    scoreOGP;



  /* ------------------------------------
     ▼ 結果HTMLの生成
  ------------------------------------ */
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


  /* ------------------------------------
     ▼ 高度SEOチェックセクション
  ------------------------------------ */
  result.innerHTML += `
    <h2 style="margin-top:40px;">高度SEOチェック</h2>

    <div class="card">
      <span class="priority">優先度：${priority(headingResult.score)}</span>
      <h4>Hタグ構造</h4>
      <p><strong>状態:</strong> ${headingResult.status}</p>
      <p>${headingResult.message}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(linkResult.score)}</span>
      <h4>内部リンク数</h4>
      <p><strong>状態:</strong> ${linkResult.status}</p>
      <p>${linkResult.message}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(textResult.score)}</span>
      <h4>本文文字数</h4>
      <p><strong>状態:</strong> ${textResult.status}</p>
      <p>${textResult.message}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(indexResult.score)}</span>
      <h4>noindex / nofollow</h4>
      <p><strong>状態:</strong> ${indexResult.status}</p>
      <p>${indexResult.message}</p>
    </div>
  `;


  /* ------------------------------------
     ▼ AIコメント生成
  ------------------------------------ */
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


  /* ------------------------------------
     ▼ 円グラフ
  ------------------------------------ */
  const canvas = document.getElementById("scoreChart");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const percentage = totalScore / 100;

    let graphColor = "#e74c3c";
    if (totalScore >= 80) graphColor = "#2ecc71";
    else if (totalScore >= 40) graphColor = "#f1c40f";

    ctx.beginPath();
    ctx.arc(100, 100, 80, 0, Math.PI * 2);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 18;
    ctx.stroke();

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



/* ------------------------------------
   優先度判定
------------------------------------ */
function priority(score) {
  if (score === 0) return "高";
  if (score <= 10) return "中";
  return "低";
}



/* ------------------------------------
   高度SEOチェック①：Hタグ構造
------------------------------------ */
function checkHeadingStructure(doc) {
  const headings = [...doc.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(h => h.tagName);

  if (headings.length <= 1) {
    return { status: "改善", message: "見出し構造がほとんどありません。", score: 0 };
  }

  let ok = true;
  for (let i = 0; i < headings.length - 1; i++) {
    const current = Number(headings[i].substring(1));
    const next = Number(headings[i+1].substring(1));
    if (next - current > 1) ok = false;
  }

  if (ok) return { status: "良好", message: "見出し階層は適切です。", score: 15 };
  else return { status: "注意", message: "見出し階層に問題があります。", score: 7 };
}



/* ------------------------------------
   高度SEOチェック②：内部リンク数
------------------------------------ */
function checkInternalLinks(doc) {
  const links = [...doc.querySelectorAll("a")];
  const count = links.length;

  if (count === 0) return { status: "改善", message: "内部リンクがありません。", score: 0 };
  if (count < 5) return { status: "注意", message: `内部リンク数が少なめです（${count}件）。`, score: 7 };

  return { status: "良好", message: `内部リンク数は十分です（${count}件）。`, score: 15 };
}



/* ------------------------------------
   高度SEOチェック③：本文文字数
------------------------------------ */
function checkTextLength(doc) {
  const bodyText = doc.body.innerText.replace(/\s+/g, "").length;

  if (bodyText < 300) return { status: "改善", message: `本文が少なすぎます（${bodyText}文字）。`, score: 0 };
  if (bodyText < 800) return { status: "注意", message: `本文量は少なめです（${bodyText}文字）。`, score: 7 };

  return { status: "良好", message: `本文量は適切です（${bodyText}文字）。`, score: 15 };
}



/* ------------------------------------
   高度SEOチェック④：noindex / nofollow
------------------------------------ */
function checkIndexStatus(doc) {
  const robots = doc.querySelector('meta[name="robots"]')?.content || "";

  if (robots.includes("noindex"))
    return { status: "改善", message: "noindexが設定されています。", score: 0 };

  if (robots.includes("nofollow"))
    return { status: "注意", message: "nofollowが設定されています。", score: 7 };

  return { status: "良好", message: "インデックスは正常です。", score: 15 };
}



/* ------------------------------------
   AIコメント生成
------------------------------------ */
function generateAIComment(results) {
  let comment = "総合的に見ると、";

  if (results.scoreTitle < 15) comment += "タイトルには改善の余地があります。";
  else comment += "タイトルは適切です。";

  if (results.scoreDescription < 15) comment += " メタディスクリプションも最適化すると良いでしょう。";
  else comment += " 説明文は良好です。";

  if (results.scoreH1 < 15) comment += " H1タグに改善ポイントがあります。";
  else comment += " H1は適切に設定されています。";

  if (results.scoreAlt < 15) comment += " 画像ALTが不足しているため、アクセシビリティ面の強化が必要です。";

  if (results.linkScore < 15) comment += " 内部リンク数は少なめです。";
  else comment += " 内部リンクは十分です。";

  if (results.textScore < 15) comment += " 本文量はやや少なめです。";
  else comment += " 本文量は適切です。";

  if (results.indexScore < 15) comment += " インデックス設定に注意が必要です。";

  comment += " 全体としてSEOの基礎は整っており、数点の改善でさらに評価が向上します。";

  return comment;
}
