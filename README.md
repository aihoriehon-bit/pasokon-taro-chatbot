# パソコン太郎 お問い合わせチャットボット

IT Support パソコン太郎株式会社の問い合わせ対応AIチャットボット。
Gemini API + Flask + Cloud Run で稼働。

## ローカル起動

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env を編集して GEMINI_API_KEY を設定
python app.py
# http://localhost:5001
```

## デプロイ (Cloud Run)

```bash
bash ~/Desktop/templates/cloudrun_setup.sh
# プロンプトに従って入力
git push origin main  # GitHub Actions が自動デプロイ
```

## スタック

- Python 3.12 + Flask + Gunicorn
- Gemini API (`gemini-2.0-flash`)
- Google Artifact Registry + Cloud Run (asia-northeast1)
- GitHub Actions (CI/CD)
