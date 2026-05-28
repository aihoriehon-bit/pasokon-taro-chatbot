"""パソコン太郎 お問い合わせチャットボット - Flask アプリ"""
import json as json_lib
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from urllib import request as urllib_request

from flask import Flask, render_template, request, jsonify, session, make_response
from dotenv import load_dotenv
from gemini_client import chat

load_dotenv()

# ====== ロガー設定(Cloud Run の stdout → Cloud Logging) ======
logging.basicConfig(level=logging.INFO, format="%(message)s")
chat_logger = logging.getLogger("chat")
chat_logger.setLevel(logging.INFO)

# JST タイムゾーン
JST = timezone(timedelta(hours=9))

# Google Chat 通知用 Webhook URL (環境変数で設定)
GOOGLE_CHAT_WEBHOOK = os.environ.get("GOOGLE_CHAT_WEBHOOK", "").strip()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "pasokon-taro-chatbot-secret")
# 外部サイトに iframe 埋め込みするので SameSite=None + Secure が必要
# (ローカル開発時は Lax にフォールバック)
IS_PROD = os.environ.get("K_SERVICE") is not None  # Cloud Run なら True
app.config["SESSION_COOKIE_SAMESITE"] = "None" if IS_PROD else "Lax"
app.config["SESSION_COOKIE_SECURE"] = IS_PROD
app.config["SESSION_COOKIE_HTTPONLY"] = True

MAX_HISTORY_TURNS = 10  # 直近10往復(20メッセージ)を保持


@app.after_request
def add_embed_headers(resp):
    """埋め込み(iframe + widget.js) を許可するためのヘッダ。"""
    # iframe 埋め込みを許可
    resp.headers.pop("X-Frame-Options", None)
    # widget.js のクロスオリジン取得を許可
    if request.path.startswith("/static/") or request.path in ("/embed", "/api/chat", "/api/reset"):
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp


def _get_session_id() -> str:
    """セッションごとに匿名IDを発行(ユーザーを横断特定はしない)。"""
    sid = session.get("sid")
    if not sid:
        sid = uuid.uuid4().hex[:12]
        session["sid"] = sid
    return sid


def _log_chat_event(user_text: str, reply: str, sid: str, turn_no: int) -> None:
    """Cloud Logging 用に構造化ログを1行出力。"""
    payload = {
        "event": "chat_message",
        "session_id": sid,
        "turn": turn_no,
        "user_message": user_text,
        "bot_reply": reply,
        "user_message_len": len(user_text),
        "bot_reply_len": len(reply),
        "user_agent": request.headers.get("User-Agent", "")[:200],
        "referer": request.headers.get("Referer", "")[:200],
        "timestamp_jst": datetime.now(JST).isoformat(),
    }
    # Cloud Logging はJSON形式の構造化ログを認識
    chat_logger.info(json_lib.dumps(payload, ensure_ascii=False))


def _notify_google_chat(user_text: str, reply: str, sid: str, turn_no: int) -> None:
    """Google Chat スペースに新規問い合わせを通知。"""
    if not GOOGLE_CHAT_WEBHOOK:
        return
    try:
        now_jst = datetime.now(JST).strftime("%Y-%m-%d %H:%M:%S")
        # 表示用に長文は切り詰め
        user_short = user_text[:500] + ("…" if len(user_text) > 500 else "")
        bot_short = reply[:800] + ("…" if len(reply) > 800 else "")

        text = (
            f"💬 *チャットボット新着*  ({now_jst})\n"
            f"*セッション*: `{sid}` (ターン {turn_no})\n"
            f"\n"
            f"*👤 質問*\n{user_short}\n"
            f"\n"
            f"*🤖 パソコン太郎の返答*\n{bot_short}"
        )
        body = json_lib.dumps({"text": text}, ensure_ascii=False).encode("utf-8")
        req = urllib_request.Request(
            GOOGLE_CHAT_WEBHOOK,
            data=body,
            headers={"Content-Type": "application/json; charset=UTF-8"},
        )
        urllib_request.urlopen(req, timeout=5)
    except Exception as e:
        # 通知失敗はチャット応答を止めない
        chat_logger.warning(json_lib.dumps({
            "event": "google_chat_notify_failed",
            "error": str(e)[:300],
        }, ensure_ascii=False))


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def api_chat():
    if request.method == "OPTIONS":
        return make_response("", 204)
    data = request.get_json(silent=True) or {}
    user_text = (data.get("message") or "").strip()
    if not user_text:
        return jsonify({"error": "メッセージを入力してください"}), 400
    if len(user_text) > 1000:
        return jsonify({"error": "メッセージが長すぎます(1000文字以内)"}), 400

    sid = _get_session_id()
    history = session.get("history", [])

    reply = chat(user_text, history=history)

    history.append({"role": "user", "content": user_text})
    history.append({"role": "model", "content": reply})
    # 履歴を制限
    if len(history) > MAX_HISTORY_TURNS * 2:
        history = history[-MAX_HISTORY_TURNS * 2:]
    session["history"] = history
    session.modified = True

    # 質疑応答をログ + Google Chat 通知
    turn_no = len(history) // 2
    _log_chat_event(user_text, reply, sid, turn_no)
    _notify_google_chat(user_text, reply, sid, turn_no)

    return jsonify({"reply": reply})


@app.route("/api/reset", methods=["POST", "OPTIONS"])
def api_reset():
    if request.method == "OPTIONS":
        return make_response("", 204)
    session.pop("history", None)
    # セッションIDも振り直す
    session.pop("sid", None)
    return jsonify({"ok": True})


@app.route("/")
def index():
    """フルページ版のチャット (直接アクセス用)"""
    return render_template("index.html")


@app.route("/embed")
def embed():
    """iframe 埋め込み専用の最小レイアウト版"""
    return render_template("embed.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(debug=True, host="0.0.0.0", port=port)
