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
    /* === ピル型ランチャー (閉じてる時) === */
    .pasotaro-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #d72027;
      color: #fff;
      border: 3px solid #fff;
      border-radius: 999px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      z-index: 2147483600;
      padding: 4px 18px 4px 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      height: 64px;
      font-family: 'Hiragino Kaku Gothic ProN','Meiryo','Hiragino Sans',sans-serif;
      transition: transform 0.15s, background 0.2s, box-shadow 0.2s;
    }
    .pasotaro-launcher:hover {
      background: #a8161c;
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.28);
    }
    .pasotaro-launcher img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      background: #fff;
      flex-shrink: 0;
      pointer-events: none;
    }
    .pasotaro-launcher .pasotaro-label {
      font-size: 14px;
      font-weight: bold;
      white-space: nowrap;
      line-height: 1.25;
      pointer-events: none;
    }
    .pasotaro-launcher .pasotaro-label small {
      display: block;
      font-size: 10px;
      font-weight: 500;
      opacity: 0.9;
      margin-top: 1px;
    }
    .pasotaro-launcher .pasotaro-close-icon {
      display: none;
      color: #fff;
      font-size: 30px;
      font-weight: bold;
      line-height: 1;
      pointer-events: none;
    }

    /* === 開いてる時 → 円形のXボタンへ === */
    .pasotaro-launcher.is-open {
      width: 56px;
      height: 56px;
      padding: 0;
      justify-content: center;
      gap: 0;
      border-radius: 50%;
    }
    .pasotaro-launcher.is-open img,
    .pasotaro-launcher.is-open .pasotaro-label {
      display: none;
    }
    .pasotaro-launcher.is-open .pasotaro-close-icon {
      display: inline-block;
    }

    /* === チャットパネル === */
    .pasotaro-panel {
      position: fixed;
      bottom: 104px;
      right: 24px;
      width: 380px;
      height: 600px;
      max-height: calc(100vh - 140px);
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
        height: 56px;
        padding: 4px 14px 4px 4px;
        gap: 8px;
      }
      .pasotaro-launcher img { width: 44px; height: 44px; }
      .pasotaro-launcher .pasotaro-label { font-size: 12px; }
      .pasotaro-launcher .pasotaro-label small { font-size: 9px; }
      .pasotaro-launcher.is-open { width: 50px; height: 50px; }

      .pasotaro-panel {
        width: calc(100vw - 24px);
        right: 12px;
        bottom: 88px;
        height: calc(100vh - 116px);
      }
    }

    /* スマホで横幅厳しい場合はラベルを短く */
    @media (max-width: 360px) {
      .pasotaro-launcher .pasotaro-label small { display: none; }
    }
  `;
  document.head.appendChild(style);

  // ===== ランチャーボタン =====
  const btn = document.createElement("button");
  btn.className = "pasotaro-launcher";
  btn.type = "button";
  btn.setAttribute("aria-label", "パソコン太郎くんに質問する");
  btn.innerHTML = `
    <img src="${BASE_URL}/static/tarou.png" alt="">
    <span class="pasotaro-label">パソコン太郎くんに質問する<small>🤖 AI応答</small></span>
    <span class="pasotaro-close-icon">×</span>
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
    panel.classList.toggle("is-open", opened);
    panel.setAttribute("aria-hidden", opened ? "false" : "true");
  }
  btn.addEventListener("click", toggle);

  // ===== DOM 追加 =====
  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
