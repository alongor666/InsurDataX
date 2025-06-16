
# 车险经营分析周报应用 (Firebase Auth & 安全后端)

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 构建的车险经营分析仪表盘应用。用户认证通过 **Firebase Authentication** 实现。数据提供和AI分析功能均通过受保护的后端 **Firebase Functions** 代理实现，确保数据和API密钥的安全。KPI看板和每个独立图表均提供AI智能业务摘要功能。

## 目标

旨在为车险业务分析人员和管理层提供一个安全、直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇。

## 主要功能

- **Firebase Authentication**:
    - 应用启动时会重定向到登录页面。
    - 支持使用 Firebase 凭证 (例如，邮箱/密码) 进行登录。
    - 用户会话由 Firebase 安全管理。
    - 应用头部提供“登出”按钮和当前用户信息。
- **受保护的数据源**:
    - 原始保险数据 (`insurance_data.json`) 不再公开暴露，而是存放于 Firebase Function 的部署包内。
    - 前端通过一个专门的、受 Firebase Authentication 保护的 Firebase Function (`getInsuranceData`) 来获取数据。
- **KPI看板**: 实时展示核心业务指标。默认显示最新一周的累计数据。
    - **对比逻辑**: KPI卡片显示与“对比周期”的变化。看板下方统一显示当前数据周期与所选对比周期的信息。
    - 布局为4x4网格。卡片最小高度优化，整体看板尺寸有所压缩。
    - 数值显示遵循全局格式化规则。
    - **AI智能总体业务摘要**: 当KPI看板视图激活时，其下方会显示AI生成的总体业务摘要（通过点击应用头部的AI摘要按钮触发，调用受保护的AI代理Function）。
- **趋势分析**:
    - 根据所选指标类型智能切换图表：率值类指标使用折线图，数值类指标使用柱状图。
    - **环比数据模式**：图表上每个点的值代表 `当前期对应指标的YTD值 - 上一期对应指标的YTD值`。
    - **X轴标签优化**: X轴的周期标签将显示当周的最后一天（周六）的日期，格式为 "YY-MM-DD"（例如 "25-06-14"），增强时间可读性。在“累计”分析模式下，X轴标签将始终水平显示。 Tooltip中的周期显示会同步优化，显示完整的周起止范围。
    - **布局优化**: 通过调整图表边距，确保图表内容在容器内正确显示，避免溢出。
    - 线条/柱子颜色根据变动成本率动态变化。
    - **独立的AI图表分析**: 图表下方提供独立的AI分析模块和按钮，调用受保护的AI代理Function。
- **对比气泡图**: 多维度比较不同业务类型的表现。气泡颜色根据变动成本率动态变化。**独立的AI图表分析**: 图表下方提供独立的AI分析模块和按钮，调用受保护的AI代理Function。
- **水平条形图排名**: 对业务类型按选定指标进行排名。条形颜色根据变动成本率动态变化。**独立的AI图表分析**: 图表下方提供独立的AI分析模块和按钮，调用受保护的AI代理Function。
- **占比图**: 使用饼图展示各业务类型在所选绝对值指标上的贡献占比。扇区颜色根据变动成本率动态变化。**独立的AI图表分析**: 图表下方提供独立的AI分析模块和按钮，调用受保护的AI代理Function。
- **帕累托图**: 使用组合图分析关键少数贡献。柱子颜色根据变动成本率动态变化。**独立的AI图表分析**: 图表下方提供独立的AI分析模块和按钮，调用受保护的AI代理Function。
- **数据表**: 展示详细的原始及聚合数据。
- **全局筛选与控制**:
    - 支持分析模式切换（累计/当周发生额）。
    * 支持当前数据周期选择。
    * 支持自定义对比周期选择。
    * **业务类型筛选 (增强版)**: 支持全选、反选、清除、仅选此项、复选框勾选，部分操作需确认。
- **受保护的AI智能分析 (通过Firebase Function)**:
    * **总体业务摘要**: 位于应用头部的AI摘要按钮触发生成，结果显示在KPI看板视图下方。
    * **图表独立AI分析**: 每个图表（趋势、气泡、排名、占比、帕累托）下方均有独立的AI分析模块和按钮，基于当前图表数据生成。
    * 所有AI功能通过后端的 Firebase Function (`generateAiSummaryProxy`) 调用Genkit flow实现，此Function受Firebase Authentication保护。
    * **重要**: 需要在Firebase Function中配置 `GOOGLE_API_KEY` (或其他AI服务商的API密钥) 环境变量。
- **动态颜色提示**: 图表根据变动成本率动态调整颜色。
- **数据导出**: 支持将数据表内容导出为CSV。
- **全局数值格式化**: 应用内数值显示遵循统一规则。

## 技术栈

- **前端**:
    - Next.js (App Router, **配置为静态导出 `output: "export"`**)
    - React (Context API 用于 Firebase Authentication)
    - TypeScript
    - ShadCN UI (组件库)
    - Tailwind CSS (样式)
    - Recharts (图表库)
    - Lucide React (图标)
    - react-markdown (Markdown渲染)
    - date-fns (日期处理)
    - Firebase SDK (用于认证)
- **后端 (数据与AI代理)**:
    - Firebase Functions (Node.js)
    - Firebase Admin SDK (用于Function中验证Token)
    - Genkit (Google AI)
    - CORS
- **数据**:
    - JSON 文件 (`insurance_data.json`) 作为**唯一**数据源，存放于 `functions/src/data/` 目录，通过受保护的Firebase Function提供。

## 项目结构

- `src/app/`: Next.js 页面和布局。
    - `src/app/login/page.tsx`: Firebase Authentication 登录页面。
- `src/components/`: 应用的React组件。
- `src/contexts/`: React Context API 实现（例如 `auth-provider.tsx`，已集成Firebase Auth）。
- `src/ai/`: Genkit相关的AI Flow和配置 (包括 `generate-business-summary.ts` 和各图表分析flow)。 **注意：Firebase Function部署时会使用其内部 `functions/src/ai` 目录下的副本。**
- `src/lib/`: 工具函数和核心逻辑。
    - `data-utils.ts`: 数据处理、聚合、KPI计算等。
    - `date-formatters.ts`: 日期格式化和周期计算工具。
    - `firebase.ts`: Firebase SDK 前端初始化与配置。
- `src/data/`: 数据类型定义。
- `functions/`: Firebase Functions的源代码。
    - `src/index.ts`: 包含 `getInsuranceData` 和 `generateAiSummaryProxy` Function的实现。
    - `src/data/insurance_data.json`: 内部化的数据文件。
    - `src/ai/`: Genkit AI Flow和配置（用于Function部署）。
    - `package.json`: Functions的依赖。
- `.env.local.example`: Firebase前端配置环境变量示例（**重要：实际配置应在 `.env.local` 文件中，并确保该文件在 `.gitignore` 中**）。
- `PRODUCT_REQUIREMENTS_DOCUMENT.md`: 产品需求文档。
- `FIELD_DICTIONARY_V4.md`: 字段字典与计算逻辑。
- `ISSUES_LOG.md`: 问题与解决日志。

## 运行项目

1.  **Firebase项目设置**:
    *   确保您有一个Firebase项目。
    *   在Firebase控制台中启用 **Firebase Authentication**，并配置至少一种登录方式（例如，邮箱/密码）。
    *   记录您的Firebase项目配置信息（API Key, Auth Domain等）。
2.  确保已安装 Node.js 和 npm/yarn，以及 Firebase CLI。
3.  **前端应用与Firebase配置**:
    *   进入项目根目录。
    *   **创建 `.env.local` 文件**: 复制 `.env.local.example` (如果提供了) 或手动创建 `.env.local` 文件，并填入您的Firebase项目配置信息。例如：
        ```
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        # ... 其他Firebase配置变量
        ```
    *   安装依赖: `npm install` 或 `yarn install`
    *   启动开发服务器: `npm run dev` 或 `yarn dev` (通常在 `http://localhost:9002`)
    *   构建静态文件: `npm run build` (会生成到 `out` 目录)
4.  **后端 Firebase Function (数据与AI代理)**:
    *   进入 `functions` 目录。
    *   安装依赖: `npm install`
    *   编译TypeScript: `npm run build` (此步骤在部署时由`predeploy`钩子自动执行)
    *   **环境变量**: 确保为Function配置了AI API密钥。对于本地模拟器，可以在项目根目录的 `.firebaserc` 中配置模拟器环境变量，或在 `functions` 目录下创建一个 `.env` 文件（确保在.gitignore中）并在`functions/src/index.ts`顶部使用`dotenv`加载（仅限本地模拟）。对于云端部署，使用 Firebase CLI 配置环境变量：`firebase functions:config:set google.api_key="YOUR_AI_API_KEY"`。
5.  **本地模拟与测试**:
    *   在项目根目录运行 Firebase Emulators: `firebase emulators:start` (确保已配置 `firebase.json` 来模拟hosting, functions, 和 auth)。
    *   前端应用会调用模拟器中的Function。首先访问登录页面（通常是 `/login`）。
6.  **部署到 Firebase**:
    *   在项目根目录运行: `firebase deploy`
    *   这将同时部署 Next.js 静态站点到 Firebase Hosting 和 Firebase Functions。

## 文档

- **产品需求文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md`
- **字段字典与计算逻辑**: `FIELD_DICTIONARY_V4.md`
- **问题与解决日志**: `ISSUES_LOG.md`

