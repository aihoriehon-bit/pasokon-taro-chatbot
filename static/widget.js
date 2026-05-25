/*!
 * パソコン太郎 チャットウィジェット (フローティング版)
 *
 * 使い方: 任意のサイトの <body> 内末尾に以下を貼り付けるだけ
 *   <script src="https://pasokon-taro-chatbot-67zipgnl4a-an.a.run.app/static/widget.js" async></script>
 *
 * 右下にラベル付き赤いボタンが出現し、クリックでチャットパネルが開閉します。
 */
(function() {
  // 重複読み込みガード
  if (window.__pasotaroWidgetLoaded) return;
  window.__pasotaroWidgetLoaded = true;

  // 自身のスクリプトタグから origin を取得
  const scriptEl = document.currentScript || (function() {
    const list = document.querySelectorAll('script[src*="widget.js"]');
    return list[list.length - 1];
  })();
  const BASE_URL = new URL(scriptEl.src).origin;

  // ===== スタイル =====
  const style = document.createElement("style");
  style.textContent = `
    /* === 丸型ランチャー (閉じてる時) === */
    .pasotaro-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 72px;
      height: 72px;
      background: #d72027;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      z-index: 2147483600;
      padding: 0;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Hiragino Kaku Gothic ProN','Meiryo','Hiragino Sans',sans-serif;
      transition: transform 0.15s, background 0.2s, box-shadow 0.2s;
    }
    .pasotaro-launcher:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28);
    }
    .pasotaro-launcher img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      background: #fff;
      pointer-events: none;
    }
    .pasotaro-launcher .pasotaro-close-icon {
      display: none;
      color: #fff;
      font-size: 30px;
      font-weight: bold;
      line-height: 1;
      pointer-events: none;
    }
    .pasotaro-launcher.is-open img { display: none; }
    .pasotaro-launcher.is-open .pasotaro-close-icon { display: inline-block; }
    .pasotaro-launcher.is-open { width: 56px; height: 56px; }

    /* === 吹き出し (ランチャーの左側) === */
    .pasotaro-callout {
      position: fixed;
      bottom: 32px;
      right: 110px;
      background: #fff;
      color: #1a1a1a;
      border: 2px solid #d72027;
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.18);
      z-index: 2147483599;
      font-family: 'Hiragino Kaku Gothic ProN','Meiryo','Hiragino Sans',sans-serif;
      font-size: 13px;
      font-weight: bold;
      line-height: 1.4;
      max-width: 200px;
      cursor: pointer;
      animation: pasotaroPulse 2.6s ease-in-out infinite;
      transition: opacity 0.2s;
    }
    .pasotaro-callout small {
      display: block;
      font-size: 10px;
      font-weight: 500;
      color: #6b6b6b;
      margin-top: 2px;
    }
    .pasotaro-callout::after,
    .pasotaro-callout::before {
      content: "";
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 0; height: 0;
      border-top: 9px solid transparent;
      border-bottom: 9px solid transparent;
    }
    .pasotaro-callout::after {
      right: -8px;
      border-left: 9px solid #fff;
    }
    .pasotaro-callout::before {
      right: -11px;
      border-left: 11px solid #d72027;
    }
    .pasotaro-callout.is-open { display: none; }

    @keyframes pasotaroPulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    /* === チャットパネル === */
    .pasotaro-panel {
      position: fixed;
      bottom: 110px;
      right: 24px;
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 150px);
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
      z-index: 2147483600;
      overflow: hidden;
      display: none;
      flex-direction: column;
      transform-origin: bottom right;
      animation: pasotaroOpen 0.2s ease-out;
    }
    .pasotaro-panel.is-open { display: flex; }
    @keyframes pasotaroOpen {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .pasotaro-panel iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
    }

    /* === スマホ === */
    @media (max-width: 480px) {
      .pasotaro-launcher {
        bottom: 16px;
        right: 16px;
        width: 62px;
        height: 62px;
      }
      .pasotaro-launcher.is-open { width: 50px; height: 50px; }

      .pasotaro-callout {
        bottom: 22px;
        right: 88px;
        font-size: 12px;
        padding: 8px 11px;
        max-width: 150px;
      }
      .pasotaro-callout small { font-size: 9px; }

      .pasotaro-panel {
        width: calc(100vw - 24px);
        right: 12px;
        bottom: 88px;
        height: calc(100vh - 116px);
      }
    }

    /* 極小画面では吹き出しを非表示 */
    @media (max-width: 340px) {
      .pasotaro-callout { display: none; }
    }
  `;
  document.head.appendChild(style);

  // ===== ランチャーボタン (丸型) =====
  const btn = document.createElement("button");
  btn.className = "pasotaro-launcher";
  btn.type = "button";
  btn.setAttribute("aria-label", "パソコン太郎くんに質問する");
  btn.innerHTML = `
    <img src="${BASE_URL}/static/tarou.png" alt="">
    <span class="pasotaro-close-icon">×</span>
  `;

  // ===== 吹き出し (左横) =====
  const callout = document.createElement("div");
  callout.className = "pasotaro-callout";
  callout.setAttribute("role", "button");
  callout.setAttribute("tabindex", "0");
  callout.setAttribute("aria-label", "パソコン太郎くんに質問する");
  callout.innerHTML = `
    僕が質問に答えるよ!<small>パソコン太郎くん(AIチャット)</small>
  `;

  // ===== チャットパネル =====
  const panel = document.createElement("div");
  panel.className = "pasotaro-panel";
  panel.setAttribute("aria-hidden", "true");
  const iframe = document.createElement("iframe");
  iframe.src = BASE_URL + "/embed";
  iframe.title = "パソコン太郎 AIチャット";
  iframe.setAttribute("allow", "clipboard-write");
  panel.appendChild(iframe);

  let opened = false;
  function toggle() {
    opened = !opened;
    btn.classList.toggle("is-open", opened);
    callout.classList.toggle("is-open", opened);
    panel.classList.toggle("is-open", opened);
    panel.setAttribute("aria-hidden", opened ? "false" : "true");
  }
  btn.addEventListener("click", toggle);
  callout.addEventListener("click", toggle);
  callout.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  // ===== DOM 追加 =====
  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(callout);
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
