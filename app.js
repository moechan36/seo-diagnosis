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



/* ============================================================
   SEO診断メイン処理
============================================================ */
function checkSEO(doc) {
  const result = document.getElementById("result");

  /* -------------------------
     Title
  ------------------------- */
  const title = doc.querySelector("title")?.innerText.trim() || "なし";
  let titleAdvice = "";
  let scoreTitle = 0;

  if (title === "なし") titleAdvice = "タイトルがありません。";
  else if (title.length < 30) { titleAdvice = "タイトルが短いです。30〜60文字が理想です。"; scoreTitle = 10; }
  else if (title.length > 60) { titleAdvice = "タイトルが長すぎます。検索で途中で切れます。"; scoreTitle = 10; }
  else { titleAdvice = "良好です。"; scoreTitle = 20; }

  /* -------------------------
     Description
  ------------------------- */
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content") || "なし";

  let descAdvice = "";
  let scoreDescription = 0;

  if (description === "なし") descAdvice = "description がありません。";
  else if (description.length < 80) { descAdvice = "短すぎます。"; scoreDescription = 10; }
  else if (description.length > 180) { descAdvice = "長すぎます。"; scoreDescription = 10; }
  else { descAdvice = "良好です。"; scoreDescription = 20; }

  /* -------------------------
     H1
  ------------------------- */
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

  /* -------------------------
     ALT
  ------------------------- */
  const images = [...doc.querySelectorAll("img")];
  const altMissing = images.filter(i => !i.getAttribute("alt")).length;

  const altAdvice =
    altMissing === 0 ? "全ての画像に alt が設定されています。" :
    `${altMissing}枚が alt 未設定です。`;

  let scoreAlt = altMissing === 0 ? 15 :
                 (altMissing <= images.length * 0.3 ? 7 : 0);

  /* -------------------------
     JSON-LD
  ------------------------- */
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

  /* -------------------------
     canonical
  ------------------------- */
  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "なし";

  let scoreCanonical = canonical !== "なし" ? 10 : 0;

  /* -------------------------
     OGP
  ------------------------- */
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.content || "なし";
  const ogDesc  = doc.querySelector('meta[property="og:description"]')?.content || "なし";
  const ogImage = doc.querySelector('meta[property="og:image"]')?.content || "なし";

  let scoreOGP = ogImage !== "なし" ? 5 : 0;

  /* -------------------------
     ▼ 高度SEOチェック（4項目）
  ------------------------- */
  const headingResult = checkHeadingStructure(doc);
  const linkResult = checkInternalLinks(doc);
  const textResult = checkTextLength(doc);
  const indexResult = checkIndexStatus(doc);

  /* -------------------------
     ▼ 技術的SEO（Core Web Vitalsライト版）
  ------------------------- */
  const imgSizeResult = checkImageSizeAttributes(doc);
  const lazyResult = checkLazyLoad(doc);
  const resourceResult = checkResourceCount(doc);
  const htmlSizeResult = checkHTMLSize(doc);

  /* -------------------------
     合計スコア（基本診断のみ）
  ------------------------- */
  const totalScore =
    scoreTitle +
    scoreDescription +
    scoreH1 +
    scoreAlt +
    scoreLD +
    scoreCanonical +
    scoreOGP;

  /* ============================================================
     結果HTML（基本診断）
  ============================================================ */
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
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreCanonical)}</span>
      <h4>canonical</h4>
      <p><strong>内容:</strong> ${canonical}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(scoreOGP)}</span>
      <h4>OGP</h4>
      <p><strong>og:title:</strong> ${ogTitle}</p>
      <p><strong>og:description:</strong> ${ogDesc}</p>
      <p><strong>og:image:</strong> ${ogImage}</p>
    </div>
  `;


  /* ============================================================
       高度SEOチェックセクション
  ============================================================ */
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


  /* ============================================================
      技術的SEO（Core Web Vitals ライト版）
  ============================================================ */
  result.innerHTML += `
    <h2 style="margin-top:40px;">技術的SEOチェック（Core Web Vitals）</h2>

    <div class="card">
      <span class="priority">優先度：${priority(imgSizeResult.score)}</span>
      <h4>画像サイズ属性（width/height）</h4>
      <p><strong>状態:</strong> ${imgSizeResult.status}</p>
      <p>${imgSizeResult.message}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(lazyResult.score)}</span>
      <h4>lazyload（画像遅延読み込み）</h4>
      <p><strong>状態:</strong> ${lazyResult.status}</p>
      <p>${lazyResult.message}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(resourceResult.score)}</span>
      <h4>CSS / JS リソース数</h4>
      <p><strong>状態:</strong> ${resourceResult.status}</p>
      <p>${resourceResult.message}</p>
    </div>

    <div class="card">
      <span class="priority">優先度：${priority(htmlSizeResult.score)}</span>
      <h4>ページ容量（HTML）</h4>
      <p><strong>状態:</strong> ${htmlSizeResult.status}</p>
      <p>${htmlSizeResult.message}</p>
    </div>
  `;


  /* ============================================================
       AIコメント生成
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
       円グラフ
  ============================================================ */
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



/* ============================================================
   優先度判定
============================================================ */
function priority(score) {
  if (score === 0) return "高";
  if (score <= 10) return "中";
  return "低";
}



/* ============================================================
   高度SEOチェック（4項目）
============================================================ */
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


function checkInternalLinks(doc) {
  const links = [...doc.querySelectorAll("a")];
  const count = links.length;

  if (count === 0) return { status: "改善", message: "内部リンクがありません。", score: 0 };
  if (count < 5) return { status: "注意", message: `内部リンク数が少なめです（${count}件）。`, score: 7 };

  return { status: "良好", message: `内部リンク数は十分です（${count}件）。`, score: 15 };
}


function checkTextLength(doc) {
  const bodyText = doc.body.innerText.replace(/\s+/g, "").length;

  if (bodyText < 300) return { status: "改善", message: `本文が少なすぎます（${bodyText}文字）。`, score: 0 };
  if (bodyText < 800) return { status: "注意", message: `本文量は少なめです（${bodyText}文字）。`, score: 7 };

  return { status: "良好", message: `本文量は適切です（${bodyText}文字）。`, score: 15 };
}


function checkIndexStatus(doc) {
  const robots = doc.querySelector('meta[name="robots"]')?.content || "";

  if (robots.includes("noindex"))
    return { status: "改善", message: "noindexが設定されています。", score: 0 };

  if (robots.includes("nofollow"))
    return { status: "注意", message: "nofollowが設定されています。", score: 7 };

  return { status: "良好", message: "インデックスは正常です。", score: 15 };
}



/* ============================================================
   技術的SEOチェック（Core Web Vitals ライト版）
============================================================ */
function checkImageSizeAttributes(doc) {
  const imgs = [...doc.querySelectorAll("img")];
  const missing = imgs.filter(img => !img.getAttribute("width") || !img.getAttribute("height")).length;

  if (missing === 0) {
    return { status: "良好", message: "全ての画像に width/height が設定されています。", score: 15 };
  } else if (missing <= imgs.length * 0.3) {
    return { status: "注意", message: `${missing}枚の画像に size 属性が不足しています。`, score: 7 };
  } else {
    return { status: "改善", message: `${missing}枚の画像に width/height が設定されていません。`, score: 0 };
  }
}


function checkLazyLoad(doc) {
  const imgs = [...doc.querySelectorAll("img")];
  const lazy = imgs.filter(img => img.getAttribute("loading") === "lazy").length;

  if (lazy === 0) {
    return { status: "改善", message: "lazyload が設定されていません。", score: 0 };
  } else if (lazy < imgs.length * 0.5) {
    return { status: "注意", message: `lazyload 設定が一部のみです（${lazy}枚）。`, score: 7 };
  } else {
    return { status: "良好", message: `lazyload が適切に設定されています（${lazy}枚）。`, score: 15 };
  }
}


function checkResourceCount(doc) {
  const cssCount = doc.querySelectorAll('link[rel="stylesheet"]').length;
  const jsCount = doc.querySelectorAll("script[src]").length;

  let score = 15;
  let status = "良好";
  let message = `CSS: ${cssCount}個 / JS: ${jsCount}個`;

  if (cssCount + jsCount > 20) {
    score = 0;
    status = "改善";
    message += " → リソース数が多すぎます。";
  } else if (cssCount + jsCount > 10) {
    score = 7;
    status = "注意";
    message += " → リソース数がやや多めです。";
  }

  return { status, message, score };
}


function checkHTMLSize(doc) {
  const htmlText = doc.documentElement.outerHTML;
  const sizeKB = Math.round(new Blob([htmlText]).size / 1024);

  if (sizeKB < 100) {
    return { status: "良好", message: `ページサイズ：${sizeKB}KB（軽量です）`, score: 15 };
  } else if (sizeKB < 300) {
    return { status: "注意", message: `ページサイズ：${sizeKB}KB（少し重めです）`, score: 7 };
  } else {
    return { status: "改善", message: `ページサイズ：${sizeKB}KB（重すぎます）`, score: 0 };
  }
}



/* ============================================================
   AIによる総合コメント
============================================================ */
function generateAIComment(r) {
  let c = "総合的に見ると、";

  c += r.scoreTitle < 15 ? "タイトルには改善の余地があります。" : "タイトルは適切です。";
  c += r.scoreDescription < 15 ? " メタディスクリプションも最適化すると良いでしょう。" : " 説明文は良好です。";
  c += r.scoreH1 < 15 ? " H1タグに改善ポイントがあります。" : " H1は適切に設定されています。";
  c += r.scoreAlt < 15 ? " 画像ALTが不足しています。" : "";
  c += r.linkScore < 15 ? " 内部リンク数は少なめです。" : " 内部リンクは十分です。";
  c += r.textScore < 15 ? " 本文量はやや少なめです。" : " 本文量は適切です。";
  c += r.indexScore < 15 ? " インデックス設定に注意が必要です。" : "";

  return c + " 全体としてSEOの基礎は整っています。";
}
