<div align="center">  
  <h1>哆啦A梦论文漫画机</h1>
  <p><strong>把晦涩的学术 PDF 变成由 Gemini 3 Pro 驱动的儿童友好型哆啦A梦漫画。</strong></p>
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

## 目录
- [概览](#概览)
- [演示](#演示)
- [功能](#功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
  - [先决条件](#先决条件)
  - [安装](#安装)
  - [环境变量](#环境变量)
  - [本地运行](#本地运行)
- [项目结构](#项目结构)
- [工作原理](#工作原理)
- [可用脚本](#可用脚本)
- [故障排除](#故障排除)
- [Star 历史](#star-历史)

## 概览
**Paper Comicizer** 会读取任意学术 PDF，委托 Gemini 3 Pro 总结核心观点、规划一堂哆啦A梦主题课程，并把课程的每一页渲染成漫画分镜。界面聚焦于清晰度：上传文件，观察三阶段工作流（分析 → 规划 → 生成），再通过缩略图和分页浏览生成的漫画。

## 截图
<img width="897" height="472" alt="chrome_2025-11-28_14-20-29" src="https://github.com/user-attachments/assets/94c72fff-ba18-43b1-8d5a-cf83eec20acd" />

## 功能
- 📄 **PDF 导入** —— 拖拽上传会在发送给 Gemini 前把任何 PDF 转成 base64。
- 🤖 **多步推理** —— Gemini 负责分析论文、规划叙事并渲染每个画格。
- 🎨 **实时漫画渲染** —— 每生成一页就立刻出现在 Comic Viewer 中，可查看大图与缩略图。
- 🔐 **AI Studio 密钥管理** —— 提示用户选择 API Key，并优雅处理已过期的会话。
- ⚙️ **服务层** —— `services/geminiService.ts` 统一提示模板、错误处理以及类型安全的返回值。
- 🧠 **类型化工作流状态** —— `AppStatus`、`ProcessingState` 与 `ComicPage` 让 UI 更可预期、更稳健。

## 技术栈
| 层级 | 详情 |
| --- | --- |
| 前端 | React 19 + TypeScript，Vite 6 |
| 样式 | 基于 utility classes（类似 Tailwind），搭配活泼字体与渐变 |
| AI | 通过 `@google/genai` SDK 调用 Gemini 3 Pro（文本 + 图像） |
| 构建 | Vite 开发服务器，可直接导出静态资源 |

## 快速开始

### 先决条件
- **Node.js 18.18+**（Vite 6 需要现代 Node 运行时）
- npm 9+（随新版 Node 一起提供）
- 启用了计费的 **Gemini API Key**（https://ai.google.dev/gemini-api/docs/api-key），**目前 gemini3 与 nano banana 2 仍可免费使用**

### 安装
```bash
# clone your fork, then:
cd Paper-Comicizer
npm install
```

### 环境变量
在项目根目录创建 `.env.local` 并写入 Gemini API Key：
```bash
GEMINI_API_KEY="your-key-here"
```
如果你在 AI Studio 托管体验中启动项目，密钥会自动注入；本地开发则需要此文件。

### 本地运行
```bash
npm run dev
```
打开终端输出的本地地址，上传 PDF，观察进度指示器依次经历三个阶段。

要创建优化过的生产构建：
```bash
npm run build
npm run preview      # 可选：本地预览 dist 目录
```

## 项目结构
```
.
├── App.tsx                 # 应用工作流协调器（上传 → 进度 → 查看）
├── components/
│   ├── FileUpload.tsx      # 拖拽区域与 API Key CTA
│   ├── ProgressBar.tsx     # 感知阶段的进度条与错误提示
│   └── ComicViewer.tsx     # 缩略图导航与页面查看
├── services/
│   └── geminiService.ts    # 调用 Gemini 3 Pro 的分析、规划与渲染辅助函数
├── constants.ts            # 提示词与通用模型配置
├── types.ts                # App 状态与漫画页面的强类型定义
├── metadata.json           # 供 AI Studio 部署用的元数据
└── vite.config.ts          # Vite + React 插件设置
```

## 工作原理
1. **认证** —— 应用检测 AI Studio 是否已有选定密钥；若无则提示用户选择。
2. **分析** —— `analyzePaper` 将 PDF（base64）发送给 Gemini 3 Pro 做摘要。
3. **规划** —— `planStory` 请求 JSON 计划，把主题拆成适合儿童的场景。
4. **生成** —— `generateComicPage` 针对每个计划步骤调用图像端点，并把进度流式回传 UI。
5. **查看** —— `ComicViewer` 以全分辨率图片及说明文字呈现，方便你向更年轻的读者复述论文内容。

## 可用脚本
| 脚本 | 说明 |
| --- | --- |
| `npm run dev` | 以开发模式启动 Vite 并启用 HMR |
| `npm run build` | 为生产环境打包应用 |
| `npm run preview` | 本地预览生产构建 |

## 故障排除
- **“需要身份验证”** —— 点击 *Connect API Key* 重新授权 AI Studio。
- **卡在分析阶段** —— 确认 PDF 未超过 Gemini 负载限制，且 API Key 仍有配额。
- **生成空白图像** —— 重新生成；若提示预算耗尽，Gemini 偶尔会返回空画面。

## Star 历史
[![Star History Chart](https://api.star-history.com/svg?repos=redreamality/Paper-Comicizer&type=Date)](https://star-history.com/#redreamality/Paper-Comicizer&Date)

祝漫画化愉快！🎨📚
