
# 车险经营分析周报应用 (Firebase Auth & 静态数据)

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 构建的车险经营分析仪表盘应用。用户认证通过 **Firebase Authentication** 实现。数据通过静态JSON文件提供。**所有AI智能分析功能当前已禁用。**

## 目标

旨在为车险业务分析人员和管理层提供一个安全、直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇。

## 主要功能

- **Firebase Authentication**:
    - 应用启动时会重定向到登录页面。
    - 支持使用 Firebase 凭证 (例如，邮箱/密码) 进行登录。
    - 用户会话由 Firebase 安全管理。
    - 应用头部提供“登出”按钮和当前用户信息。
- **静态数据源**:
    - 原始保险数据 (`insurance_data.json`) 位于 `public/data` 目录，前端直接获取。
    - **注意**: 此数据文件可通过公共URL直接访问，不受登录保护。
- **KPI看板**: 实时展示核心业务指标。默认显示最新一周的累计数据。
    - **对比逻辑**: KPI卡片显示与“对比周期”的变化。看板下方统一显示当前数据周期与所选对比周期的信息。
    - 布局为4x4网格。卡片最小高度优化，整体看板尺寸有所压缩。
    - 数值显示遵循全局格式化规则。
    - **AI功能提示**: KPI看板下方的AI摘要功能已禁用，相关区域会提示用户。
- **趋势分析**:
    - 根据所选指标类型智能切换图表：率值类指标使用折线图，数值类指标使用柱状图。
    - **环比数据模式**：图表上每个点的值代表 `当前期对应指标的YTD值 - 上一期对应指标的YTD值`。
    - **X轴标签优化**: X轴的周期标签将显示当周的最后一天（周六）的日期，格式为 "YY-MM-DD"（例如 "25-06-14"），增强时间可读性。在“累计”分析模式下，X轴标签将始终水平显示。 Tooltip中的周期显示会同步优化，显示完整的周起止范围。
    - **布局优化**: 通过调整图表边距，确保图表内容在容器内正确显示，避免溢出。
    - 线条/柱子颜色根据变动成本率动态变化。
    - **AI功能禁用**: 图表下方的独立AI分析功能已禁用。
- **对比气泡图**: 多维度比较不同业务类型的表现。气泡颜色根据变动成本率动态变化。**AI功能禁用**: 图表下方的独立AI分析功能已禁用。
- **水平条形图排名**: 对业务类型按选定指标进行排名。条形颜色根据变动成本率动态变化。**AI功能禁用**: 图表下方的独立AI分析功能已禁用。
- **占比图**: 使用饼图展示各业务类型在所选绝对值指标上的贡献占比。扇区颜色根据变动成本率动态变化。**AI功能禁用**: 图表下方的独立AI分析功能已禁用。
- **帕累托图**: 使用组合图分析关键少数贡献。柱子颜色根据变动成本率动态变化。**AI功能禁用**: 图表下方的独立AI分析功能已禁用。
- **数据表**: 展示详细的原始及聚合数据。
- **全局筛选与控制**:
    - 支持分析模式切换（累计/当周发生额）。
    * 支持当前数据周期选择。
    * 支持自定义对比周期选择。
    * **业务类型筛选 (增强版)**: 支持全选、反选、清除、仅选此项、复选框勾选，部分操作需确认。
- **AI智能分析 (已禁用)**:
    * **全局禁用**: 应用头部不再有AI摘要按钮。所有图表下方的AI分析模块均已移除。
    * **后端保留**: 后端Firebase Function (`generateAiSummaryProxy`) 和 Genkit flows 代码保留但不再被调用。
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
- **后端 (AI代理 - 当前未使用)**:
    - Firebase Functions (Node.js)
    - Genkit (Google AI)
- **数据**:
    - JSON 文件 (`insurance_data.json`) 作为**唯一**数据源，存放于 `public/data/` 目录。

## 项目结构

- `src/app/`: Next.js 页面和布局。
    - `src/app/login/page.tsx`: Firebase Authentication 登录页面。
- `src/components/`: 应用的React组件。
- `src/contexts/`: React Context API 实现（例如 `auth-provider.tsx`，已集成Firebase Auth）。
- `src/ai/`: Genkit相关的AI Flow和配置。 **注意：Firebase Function部署时会使用其内部 `functions/src/ai` 目录下的副本。AI功能当前已禁用。**
- `src/lib/`: 工具函数和核心逻辑。
    - `data-utils.ts`: 数据处理、聚合、KPI计算等。
    - `date-formatters.ts`: 日期格式化和周期计算工具。
    - `firebase.ts`: Firebase SDK 前端初始化与配置。
- `src/data/`: 数据类型定义。
- `public/data/insurance_data.json`: 核心数据文件。
- `functions/`: Firebase Functions的源代码。**AI代理功能当前未使用。**
    - `src/index.ts`: 包含 `generateAiSummaryProxy` Function的实现。
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
4.  **后端 Firebase Function (AI代理 - 当前未使用)**:
    *   如果需要部署（即使未使用），请进入 `functions` 目录。
    *   安装依赖: `npm install`
    *   编译TypeScript: `npm run build` (此步骤在部署时由`predeploy`钩子自动执行)
    *   **环境变量**: 如果未来重新启用AI功能，确保为Function配置了AI API密钥。
5.  **本地模拟与测试 (不含AI)**:
    *   在项目根目录运行 Firebase Emulators: `firebase emulators:start --only hosting,auth` (仅模拟hosting和auth，因为AI function未被调用)。
    *   前端应用会调用模拟器中的Auth。首先访问登录页面（通常是 `/login`）。
6.  **部署到 Firebase**:
    *   在项目根目录运行: `firebase deploy`
    *   这将部署 Next.js 静态站点到 Firebase Hosting。如果functions也包括在部署中，它们也会被部署（但不会被调用）。

## 文档

- **产品需求文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md`
- **字段字典与计算逻辑**: `FIELD_DICTIONARY_V4.md`
- **问题与解决日志**: `ISSUES_LOG.md`

    