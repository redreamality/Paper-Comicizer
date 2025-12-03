<div align="center">  
  <h1>ドラえもん・ペーパー・コミカイザー</h1>
  <p><strong>密度の高い学術 PDF を OpenRouter 経由の Gemini 3 Pro で子ども向けのドラえもん漫画に変換します。</strong></p>
  <p>    
    <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white">
    <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white">
  </p>
  <p>
    <a href="./README.md">English</a> |
    <a href="./README.zh.md">中文</a> |
    <a href="./README.ja.md">日本語</a>
  </p>
</div>

## 目次
- [概要](#概要)
- [デモ](#デモ)
- [機能](#機能)
- [技術スタック](#技術スタック)
- [はじめに](#はじめに)
  - [前提条件](#前提条件)
  - [インストール](#インストール)
  - [環境変数](#環境変数)
  - [ローカルでの実行](#ローカルでの実行)
- [プロジェクト構成](#プロジェクト構成)
- [仕組み](#仕組み)
- [利用可能なスクリプト](#利用可能なスクリプト)
- [トラブルシューティング](#トラブルシューティング)
- [Star ヒストリー](#star-ヒストリー)

## 概要
**Paper Comicizer** はあらゆる学術 PDF を取り込み、Gemini 3 Pro に核心アイデアの要約を依頼し、ドラえもんをテーマにしたレッスンを設計し、各ページを漫画のコマとして描画します。UI はわかりやすさを重視しており、ファイルをアップロードして 3 つのワークフロー段階（分析 → 計画 → 生成）を追跡し、サムネイルとページナビゲーションで生成済みの漫画を閲覧できます。

## スクリーンショット
<img width="897" height="472" alt="chrome_2025-11-28_14-20-29" src="https://github.com/user-attachments/assets/94c72fff-ba18-43b1-8d5a-cf83eec20acd" />

## 機能
- 📄 **PDF 取り込み** — ドラッグ＆ドロップした PDF を OpenRouter の Gemini モデルへ送信する前に base64 へ変換します。
- 🤖 **段階的推論** — OpenRouter 経由の Gemini が論文を分析し、物語を設計し、各パネルをレンダリングします。
- 🎨 **ライブ漫画レンダリング** — 生成されたページは即座に Comic Viewer に表示され、サムネイルとフルサイズプレビューを切り替えられます。
- 🔐 **環境変数ベースのキー管理** — OpenRouter キーが欠落・無効な場合にわかりやすい案内を表示します。
- ⚙️ **サービス層** — `services/geminiService.ts` がプロンプト、OpenRouter ペイロード、型付きレスポンスを一元管理します。
- 🧠 **型付きワークフロー状態** — `AppStatus`、`ProcessingState`、`ComicPage` によって UI の予測可能性と堅牢性を担保します。

## 技術スタック
| レイヤー | 内容 |
| --- | --- |
| フロントエンド | React 19 + TypeScript、Vite 6 |
| スタイリング | ユーティリティクラス（Tailwind 風）と遊び心のあるフォント・グラデーション |
| AI | OpenRouter Responses API（Gemini 3 Pro のテキスト/画像モデル） |
| ビルド | Vite 開発サーバー。静的エクスポートにも対応 |

## はじめに

### 前提条件
- **Node.js 18.18+**（Vite 6 が要求するモダンなランタイム）
- npm 9+（最新の Node に同梱）
- `google/gemini-3-pro-preview` と `google/gemini-3-pro-image-preview` へアクセス可能な **OpenRouter API キー**（https://openrouter.ai/）

### インストール
```bash
# clone your fork, then:
cd Paper-Comicizer
npm install
```

### 環境変数
プロジェクトルートに `.env.local` を作成し、OpenRouter の設定（API キーは必須）を追加します。
```bash
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
MODEL_LOGIC="google/gemini-3-pro-preview"
MODEL_IMAGE="google/gemini-3-pro-image-preview"
APP_URL="http://localhost:3000"        # HTTP-Referer ヘッダーに使用
APP_TITLE="Doraemon Paper Comicizer"   # OpenRouter ダッシュボードに表示
```

### ローカルでの実行
```bash
npm run dev
```
表示されたローカル URL を開き、PDF をアップロードして 3 段階の進捗インジケーターを確認します。

最適化された本番ビルドを作るには：
```bash
npm run build
npm run preview      # 任意：dist フォルダをローカル配信
```

## プロジェクト構成
```
.
├── App.tsx                 # アプリのワークフロー調整（アップロード → 進捗 → ビューア）
├── components/
│   ├── FileUpload.tsx      # ドラッグ＆ドロップ領域と PDF バリデーション
│   ├── ProgressBar.tsx     # 段階に応じた進捗表示とエラー提示
│   └── ComicViewer.tsx     # サムネイルナビとページビューア
├── services/
│   └── geminiService.ts    # OpenRouter 経由で Gemini を叩く分析・計画・レンダリング補助
├── constants.ts            # プロンプト文字列と共有モデル設定
├── types.ts                # アプリ状態と漫画ページの型定義
├── metadata.json           # AI Studio デプロイ用メタデータ
└── vite.config.ts          # Vite + React プラグイン設定
```

## 仕組み
1. **キーの検証** — `OPENROUTER_API_KEY` が設定済みかチェックし、認証エラーが起きたら環境変数の更新を案内します。
2. **分析** — `analyzePaper` が PDF（base64）を Gemini 3 Pro に送り、要約を受け取ります。
3. **計画** — `planStory` が JSON プランを取得し、子ども向けのシーンへ分解します。
4. **生成** — 各シーンに対して `generateComicPage` が画像エンドポイントを呼び、進捗を UI へストリーミングします。
5. **閲覧** — `ComicViewer` が高解像度画像とキャプションを提示し、若い読者へ論文を語り直せます。

## 利用可能なスクリプト
| スクリプト | 説明 |
| --- | --- |
| `npm run dev` | HMR 付きで Vite を開発モード起動 |
| `npm run build` | 本番向けにアプリをバンドル |
| `npm run preview` | 本番ビルドをローカルでプレビュー |

## トラブルシューティング
- **「OpenRouter API Key Required」画面が出る** — `.env.local` に `OPENROUTER_API_KEY` を追加し、`npm run dev` を再起動したうえでブラウザをリロードしてください。
- **401 / UNAUTHENTICATED エラー** — キー値、`APP_URL`（Referer）、および対象モデルが OpenRouter で有効かを確認します。
- **分析で停止する** — PDF が長すぎるとトークン上限に達します。重要部分だけを抽出して渡すと安定します。
- **空白の画像が出る** — もう一度実行するか、`MODEL_IMAGE` が画像モデルを指しているかを確認します。

## Star ヒストリー
[![Star History Chart](https://api.star-history.com/svg?repos=redreamality/Paper-Comicizer&type=Date)](https://star-history.com/#redreamality/Paper-Comicizer&Date)

楽しいコミカイズを！🎨📚
