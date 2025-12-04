<div align="center">  
  <h1>ドラえもん・ペーパー・コミカイザー</h1>
  <p><strong>密度の高い学術 PDF を Gemini 3 Pro の力で子ども向けのドラえもん漫画に変換します。</strong></p>
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
- [ニュース](#ニュース)
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
- [お問い合わせ](#お問い合わせ)
- [Star ヒストリー](#star-ヒストリー)

## ニュース
🎉 **サイトがリリースされました！** ライブアプリケーションにアクセスしてください：**[visualize.top/zh/ai-comic-generator](https://visualize.top/zh/ai-comic-generator)** – 今すぐあなたの PDF をドラえもん漫画に変換できます！

## 概要
**Paper Comicizer** はあらゆる学術 PDF を取り込み、Gemini 3 Pro に核心アイデアの要約を依頼し、ドラえもんをテーマにしたレッスンを設計し、各ページを漫画のコマとして描画します。UI はわかりやすさを重視しており、ファイルをアップロードして 3 つのワークフロー段階（分析 → 計画 → 生成）を追跡し、サムネイルとページナビゲーションで生成済みの漫画を閲覧できます。

## スクリーンショット
<img width="897" height="472" alt="chrome_2025-11-28_14-20-29" src="https://github.com/user-attachments/assets/94c72fff-ba18-43b1-8d5a-cf83eec20acd" />

## 機能
- 📄 **PDF 取り込み** — ドラッグ＆ドロップした PDF を Gemini に送信する前に base64 へ変換します。
- 🤖 **段階的推論** — Gemini が論文を分析し、物語を設計し、各パネルをレンダリングします。
- 🎨 **ライブ漫画レンダリング** — 生成されたページは即座に Comic Viewer に表示され、サムネイルとフルサイズプレビューを切り替えられます。
- 🔐 **AI Studio キー管理** — ユーザーに API キー選択を促し、期限切れセッションも丁寧に処理します。
- ⚙️ **サービス層** — `services/geminiService.ts` がプロンプト、エラーハンドリング、型付きレスポンスを一元管理します。
- 🧠 **型付きワークフロー状態** — `AppStatus`、`ProcessingState`、`ComicPage` によって UI の予測可能性と堅牢性を担保します。

## 技術スタック
| レイヤー | 内容 |
| --- | --- |
| フロントエンド | React 19 + TypeScript、Vite 6 |
| スタイリング | ユーティリティクラス（Tailwind 風）と遊び心のあるフォント・グラデーション |
| AI | `@google/genai` SDK で Gemini 3 Pro（テキスト + 画像）を呼び出し |
| ビルド | Vite 開発サーバー。静的エクスポートにも対応 |

## はじめに

### 前提条件
- **Node.js 18.18+**（Vite 6 が要求するモダンなランタイム）
- npm 9+（最新の Node に同梱）
- 課金が有効な **Gemini API キー**（https://ai.google.dev/gemini-api/docs/api-key）。**現在は gemini3 と nano banana 2 が無料で利用可能です。**

### インストール
```bash
# clone your fork, then:
cd Paper-Comicizer
npm install
```

### 環境変数
プロジェクトルートに `.env.local` を作成し、Gemini API キーを追加します。
```bash
GEMINI_API_KEY="your-key-here"
```
AI Studio のホスト体験から起動した場合は自動で注入されますが、ローカル開発ではこのファイルが必要です。

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
│   ├── FileUpload.tsx      # ドラッグ＆ドロップ領域と API キー CTA
│   ├── ProgressBar.tsx     # 段階に応じた進捗表示とエラー提示
│   └── ComicViewer.tsx     # サムネイルナビとページビューア
├── services/
│   └── geminiService.ts    # Gemini 3 Pro の分析・計画・レンダリング補助
├── constants.ts            # プロンプト文字列と共有モデル設定
├── types.ts                # アプリ状態と漫画ページの型定義
├── metadata.json           # AI Studio デプロイ用メタデータ
└── vite.config.ts          # Vite + React プラグイン設定
```

## 仕組み
1. **認証** — AI Studio でキーが選択済みか確認し、未設定なら選択を促します。
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
- **「Authentication Required」** — *Connect API Key* をクリックして AI Studio を再認可します。
- **分析で停止する** — PDF が Gemini のペイロード制限内か、API キーに十分なクォータがあるか確認してください。
- **空白の画像が出る** — 再生成してください。プロンプト予算を使い切ると稀に空のフレームが返ります。

## お問い合わせ

WeChatグループ
![b5b01fffde3fcad1d4d0b8bc556f716](https://github.com/user-attachments/assets/f6562daa-f74b-47bf-bb3c-ba02f7a80a63)

メール: support@visualize.top

## Star ヒストリー
[![Star History Chart](https://api.star-history.com/svg?repos=redreamality/Paper-Comicizer&type=Date)](https://star-history.com/#redreamality/Paper-Comicizer&Date)

楽しいコミカイズを！🎨📚
