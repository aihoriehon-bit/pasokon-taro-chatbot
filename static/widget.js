/*!
 * パソコン太郎 チャットウィジェット (フローティング版)
 *
 * 使い方: 任意のサイトの <body> 内末尾に以下を貼り付けるだけ
 *   <script src="https://pasokon-taro-chatbot-67zipgnl4a-an.a.run.app/static/widget.js" async></script>
 *
 * 右下に赤い丸ボタンが出現し、クリックでチャットパネルが開閉します。
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
    .pasotaro-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #d72027;
      border: 3px solid #fff;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,0.22);
      z-index: 2147483600;
      padding: 0;
      transition: transform 0.15s, background 0.2s;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pasotaro-launcher:hover { transform: scale(1.06); background: #a8161c; }
    .pasotaro-launcher img {
      width: 100%; height: 100%;
      object-fit: cover;
      pointer-events: none;
      background: #fff;
    }
    .pasotaro-launcher .pasotaro-close-icon {
      display: none;
      color: #fff;
      font-size: 28px;
      font-weight: bold;
      line-height: 1;
    }
    .pasotaro-launcher.is-open img { display: none; }
    .pasotaro-launcher.is-open .pasotaro-close-icon { display: inline-block; }

    .pasotaro-badge {
      position: fixed;
      bottom: 84px;
      right: 24px;
      background: #1a1a1a;
      color: #fff;
      font-family: 'Hiragino Kaku Gothic ProN','Meiryo',sans-serif;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
      z-index: 2147483599;
      animation: pasotaroPulse 2.4s ease-in-out infinite;
      pointer-events: none;
      white-space: nowrap;
    }
    .pasotaro-badge::after {
      content: "";
      position: absolute;
      bottom: -5px; right: 16px;
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #1a1a1a;
    }
    @keyframes pasotaroPulse {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .pasotaro-badge.hidden { display: none; }

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

    @media (max-width: 480px) {
      .pasotaro-panel {
        width: calc(100vw - 24px);
        right: 12px;
        bottom: 92px;
        height: calc(100vh - 120px);
      }
      .pasotaro-launcher {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
      }
      .pasotaro-badge { bottom: 76px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ===== ランチャーボタン =====
  const btn = document.createElement("button");
  btn.className = "pasotaro-launcher";
  btn.type = "button";
  btn.setAttribute("aria-label", "パソコン太郎に質問する");
  btn.innerHTML = `
    <img src="${BASE_URL}/static/tarou.png" alt="パソコン太郎">
    <span class="pasotaro-close-icon">×</span>
  `;

  // ===== バッジ(初回表示の誘導) =====
  const badge = document.createElement("div");
  badge.className = "pasotaro-badge";
  badge.textContent = "AIに質問する 👓";

  // ===== チャットパネル =====
  const panel = document.createElement("div");
  panel.className = "pasotaro-panel";
  panel.setAttribute("aria-hidden", "true");
  // iframe は最初に作成 (チャット履歴が保持される)
  const iframe = document.createElement("iframe");
  iframe.src = BASE_URL + "/embed";
  iframe.title = "パソコン太郎 チャットサポート";
  iframe.setAttribute("allow", "clipboard-write");
  panel.appendChild(iframe);

  let opened = false;
  function toggle() {
    opened = !opened;
    btn.classList.toggle("is-open", opened);
    panel.classList.toggle("is-open", opened);
    panel.setAttribute("aria-hidden", opened ? "false" : "true");
    badge.classList.add("hidden");
  }
  btn.addEventListener("click", toggle);

  // 8秒後にバッジを自動非表示 (一度クリックされたら即非表示)
  setTimeout(() => {
    if (!opened) badge.classList.add("hidden");
  }, 8000);

  // ===== DOM 追加 =====
  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(btn);
    document.body.appendChild(badge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
