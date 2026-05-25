"""パソコン太郎 お問い合わせチャットボット - Flask アプリ"""
import os
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from gemini_client import chat

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "pasokon-taro-chatbot-secret")
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True

MAX_HISTORY_TURNS = 10  # 直近10往復(20メッセージ)を保持


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def api_chat():
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


@app.route("/api/reset", methods=["POST"])
def api_reset():
    session.pop("history", None)
    return jsonify({"ok": True})


@app.route("/healthz")
def healthz():
    return "ok", 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(debug=True, host="0.0.0.0", port=port)
