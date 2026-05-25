"""パソコン太郎 お問い合わせチャットボット - Flask アプリ"""
import os
from flask import Flask, render_template, request, jsonify, session, make_response
from dotenv import load_dotenv
from gemini_client import chat

load_dotenv()

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

    history = session.get("history", [])

    reply = chat(user_text, history=history)

    history.append({"role": "user", "content": user_text})
    history.append({"role": "model", "content": reply})
    # 履歴を制限
    if len(history) > MAX_HISTORY_TURNS * 2:
        history = history[-MAX_HISTORY_TURNS * 2:]
    session["history"] = history
    session.modified = True

    return jsonify({"reply": reply})


@app.route("/api/reset", methods=["POST", "OPTIONS"])
def api_reset():
    if request.method == "OPTIONS":
        return make_response("", 204)
    session.pop("history", None)
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
