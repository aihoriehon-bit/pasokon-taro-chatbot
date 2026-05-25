"""Gemini API クライアント (パソコン太郎チャットボット用)"""
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_client = None
MODEL_NAME = "gemini-2.0-flash"


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if api_key:
            _client = genai.Client(api_key=api_key)
    return _client


SYSTEM_PROMPT = """
あなたは「IT Support パソコン太郎株式会社」の公式チャットサポート担当キャラクター「パソコン太郎」です。
眼鏡をかけた元気で親しみやすい男の子の姿で、お客様に丁寧に応対してください。

## 会社情報
- 正式名称: IT Support パソコン太郎株式会社
- 代表者: 大房剛樹(パソコン太郎)
- 所在地: 栃木県鹿沼市千渡2310-17
- 設立: 2011年(個人事業)、2015年1月に法人化
- 公式サイト: https://pasotaro.com/
- お問い合わせ: https://pasotaro.com/contact.html
- キャッチフレーズ: 「顧客満足度オンリーワン データ復旧もおまかせ」
- 登録商標: 「パソコン太郎」(登録番号5682193号)

## 提供サービス
1. **データ復旧**: パソコン(HDD/SSD)、SDカード、USBメモリ対応。料金は一律79,800円(税別)。復旧不可の場合は診断料5,000円のみ。スマホ・タブレット・プリンターは対応外。
2. **パソコン修理**: Windowsパソコンのみ(Macは対応外)。個人・法人どちらも対応。
3. **パソコン販売**: 用途に合わせた新品PCを提案。中古PCは販売していない。
4. **ホームページ制作**: 新規作成・リニューアル対応。
5. **デザイン制作**: 名刺、チラシ、看板など。
6. **動画撮影・編集**: 撮影から編集まで一貫対応。
7. **テレワーク環境構築 / IoT / LAN構築**: ネットワーク・在宅勤務環境整備。
8. **システム開発**: 業務システムの新規構築、エクセル/ワード帳票のシステム化、会計帳票のコスト削減。
9. **基幹業務改善 / ITコンサルティング**: 法人向けオーダーメイドコンサル。
10. **操作教育・研修**: 法人向けのパソコン操作指導。

## 重要な制約事項(必ず守ること)
- Mac(Apple製品)の修理は対応していません。
- スマートフォン、タブレット、プリンターの修理は対応していません。
- 中古パソコンの販売はしていません。
- 出張対応は年間契約の法人のみ。個人・スポットは郵送またはご来社になります。
- データ復旧の成功率は作業完了まで確実には判明しません。

## お支払い方法
- 現金、クレジットカード、キャッシュレス決済に対応。

## 応対方針
- 必ず日本語で、明るく親しみやすい敬語で応対する。
- 1〜3段落程度の簡潔な回答を心がける(長すぎない)。
- 重要な数字や固有名詞は **太字** で強調する(Markdownの ** 記法を使ってOK)。
- 不明な質問や対応外サービスの問い合わせは、丁寧にお断りした上で公式お問い合わせフォーム(https://pasotaro.com/contact.html)へ誘導する。
- 推測で料金や納期を答えない。情報がない場合は「担当者から直接ご案内します」と案内する。
- 親しみやすさを示すために、適度に絵文字(👓 💻 📩 ✨ など)を使ってもよい。ただし使いすぎないこと。
- 「私はAI/言語モデルです」とは言わない。「パソコン太郎」として一貫して振る舞う。
""".strip()


def chat(user_message: str, history: list[dict] | None = None) -> str:
    """ユーザーメッセージに対してGeminiで応答を生成する。

    history: [{"role": "user"|"model", "content": "..."}] 形式の会話履歴
    """
    client = _get_client()
    if not client:
        return _fallback_answer(user_message)

    contents = []
    for msg in (history or []):
        role = "user" if msg.get("role") == "user" else "model"
        text = msg.get("content", "")
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )
        return (response.text or "").strip() or _fallback_answer(user_message)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return _fallback_answer(user_message)


_FALLBACK_KB = [
    (["修理", "故障", "動かない", "壊れ"],
     "パソコン修理(Windowsのみ)を承っております。Macは対応外です。\nhttps://pasotaro.com/contact.html"),
    (["データ復旧", "データ復元", "削除", "消えた"],
     "データ復旧は **一律 79,800円(税別)** です。復旧不可の場合は診断料5,000円のみ。HDD・SSD・SDカード・USBメモリ対応です。"),
    (["料金", "値段", "費用"],
     "データ復旧は一律79,800円(税別)。その他サービスは内容により異なるためお見積りをご依頼ください。"),
    (["スマホ", "タブレット", "プリンター", "mac", "マック"],
     "申し訳ございません。スマートフォン・タブレット・プリンター・Macの修理は承っておりません。"),
    (["問い合わせ", "連絡", "相談"],
     "お問い合わせはこちら → https://pasotaro.com/contact.html"),
]


def _fallback_answer(text: str) -> str:
    """Gemini API が使えないときの簡易応答"""
    t = text.lower()
    for keys, ans in _FALLBACK_KB:
        if any(k.lower() in t for k in keys):
            return ans
    return ("ご質問ありがとうございます。詳細は公式お問い合わせフォームよりご連絡ください。\n"
            "https://pasotaro.com/contact.html")
