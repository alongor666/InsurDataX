
# 车险经营分析周报应用 (带后端AI代理)

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 构建的车险经营分析仪表盘应用。**AI分析功能通过后端的 Firebase Function 代理实现，数据源固定为本地JSON文件。AI智能业务摘要功能被整合到KPI看板视图的下方。**

## 目标

旨在为车险业务分析人员和管理层提供一个直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇。

## 主要功能

- **KPI看板**: 实时展示核心业务指标。默认显示最新一周的累计数据。
    - **对比逻辑**: KPI卡片显示与“对比周期”的变化。看板下方统一显示当前数据周期与所选对比周期的信息。
    - 布局为4x4网格。卡片最小高度优化，整体看板尺寸有所压缩。
    - 数值显示遵循全局格式化规则。
    - **AI智能业务摘要**: 当KPI看板视图激活时，其下方会显示AI生成的总体业务摘要（通过点击应用头部的AI摘要按钮触发）。
- **趋势分析**:
    - 根据所选指标类型智能切换图表：率值类指标使用折线图，数值类指标使用柱状图。
    - **环比数据模式**：图表上每个点的值代表 `当前期对应指标的YTD值 - 上一期对应指标的YTD值`。
    - 线条/柱子颜色根据变动成本率动态变化。
    - (不再包含独立的AI图表分析)
- **对比气泡图**: 多维度比较不同业务类型的表现。气泡颜色根据变动成本率动态变化。 (不再包含独立的AI图表分析)
- **水平条形图排名**: 对业务类型按选定指标进行排名。条形颜色根据变动成本率动态变化。 (不再包含独立的AI图表分析)
- **占比图**: 使用饼图展示各业务类型在所选绝对值指标上的贡献占比。扇区颜色根据变动成本率动态变化。 (不再包含独立的AI图表分析)
- **帕累托图**: 使用组合图分析关键少数贡献。柱子颜色根据变动成本率动态变化。 (不再包含独立的AI图表分析)
- **数据表**: 展示详细的原始及聚合数据。
- **全局筛选与控制**:
    - 支持分析模式切换（累计/当周发生额）。
    * 支持当前数据周期选择。
    * 支持自定义对比周期选择。
    * **业务类型筛选 (增强版)**: 支持全选、反选、清除、仅选此项、复选框勾选，部分操作需确认。
    * **数据源**: 固定为本地JSON文件 (`public/data/insurance_data.json`)。
- **AI智能分析 (通过Firebase Function, 整合至KPI视图)**:
    * **总体业务摘要**: 位于应用头部的AI摘要按钮触发生成，结果显示在KPI看板视图下方。此功能通过后端的Firebase Function调用Genkit flow实现。
    * **图表独立AI分析已移除**: 各图表不再提供独立的AI解读功能。
    * **重要**: 需要在Firebase Function中配置 `GOOGLE_API_KEY` (或其他AI服务商的API密钥) 环境变量。
- **动态颜色提示**: 图表根据变动成本率动态调整颜色。
- **数据导出**: 支持将数据表内容导出为CSV。
- **全局数值格式化**: 应用内数值显示遵循统一规则。

## 技术栈

- **前端**:
    - Next.js (App Router, **配置为静态导出 `output: "export"`**)
    - React
    - TypeScript
    - ShadCN UI (组件库)
    - Tailwind CSS (样式)
    - Recharts (图表库)
    - Lucide React (图标)
    - react-markdown (Markdown渲染)
- **后端 (AI代理)**:
    - Firebase Functions (Node.js)
    - Genkit (Google AI)
    - CORS
- **数据**:
    - 本地 JSON 文件 (`public/data/insurance_data.json`) 作为**唯一**数据源。

## 项目结构

- `src/app/`: Next.js 页面和布局。
- `src/components/`: 应用的React组件。
- `src/ai/`: Genkit相关的AI Flow和配置 (现在主要指 `generate-business-summary.ts`)。
- `src/lib/`: 工具函数和核心逻辑。
    - `data-utils.ts`: 数据处理、聚合、KPI计算等。
- `src/data/`: 数据类型定义。
- `public/data/`: 存放应用的原始数据文件 (`insurance_data.json`)。
- `functions/`: Firebase Functions的源代码。
    - `src/index.ts`: AI代理Function的实现。
    - `package.json`: Functions的依赖。
- `PRODUCT_REQUIREMENTS_DOCUMENT.md`: 产品需求文档。
- `FIELD_DICTIONARY_V4.md`: 字段字典与计算逻辑。
- `ISSUES_LOG.md`: 问题与解决日志。

## 运行项目

1.  确保已安装 Node.js 和 npm/yarn，以及 Firebase CLI。
2.  **前端应用**:
    *   进入项目根目录。
    *   安装依赖: `npm install` 或 `yarn install`
    *   启动开发服务器: `npm run dev` 或 `yarn dev` (通常在 `http://localhost:9002`)
    *   构建静态文件: `npm run build` (会生成到 `out` 目录)
3.  **后端 Firebase Function (AI代理)**:
    *   进入 `functions` 目录。
    *   安装依赖: `npm install`
    *   (可选) 编译TypeScript: `npm run build` (如果 `functions/package.json` 中有此脚本)
    *   **环境变量**: 确保为Function配置了API密钥。对于本地模拟器，可以在项目根目录创建 `.env.local` 文件并添加 `GOOGLE_API_KEY=your_actual_api_key`，然后在 `functions/.env` 或 `functions/.env.local` (如果支持) 中引用，或者直接在模拟器启动命令中设置。更推荐的做法是使用 Firebase CLI 配置环境变量：`firebase functions:config:set google.api_key="YOUR_API_KEY"` (查阅 Firebase 文档获取最新命令)。
4.  **本地模拟与测试**:
    *   在项目根目录运行 Firebase Emulators: `firebase emulators:start` (确保已配置 `firebase.json` 来模拟hosting和functions)。
    *   前端应用会调用模拟器中的Function。
5.  **部署到 Firebase**:
    *   在项目根目录运行: `firebase deploy`
    *   这将同时部署 Next.js 静态站点到 Firebase Hosting 和 Firebase Function。

## 文档

- **产品需求文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md`
- **字段字典与计算逻辑**: `FIELD_DICTIONARY_V4.md`
- **问题与解决日志**: `ISSUES_LOG.md`

