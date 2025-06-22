# 车险经营分析周报应用 (纯数据可视化架构)

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 构建的**高性能、纯前端渲染**的车险经营分析仪表盘应用。用户认证通过 **Firebase Authentication** 实现。数据由已认证的客户端**直接从 Firestore 数据库安全、实时地获取**。**此版本已移除所有AI功能，专注于提供稳定、可靠、深度的数据可视化分析体验。**

## 目标

旨在为车险业务分析人员和管理层提供一个**安全、可靠、专业**、直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇。

## 主要功能

- **Firebase Authentication**:
    - 应用启动时会重定向到登录页面，确保访问安全。
    - 支持使用 Firebase 凭证 (例如，邮箱/密码) 进行登录。
- **安全实时数据后端 (客户端直连模式)**:
    - 业务数据存储在 **Firestore** 的 `v4_period_data` 集合中。
    - 前端应用在用户认证后，使用 **Firebase 客户端SDK** 的 `onSnapshot` 方法建立实时连接，自动同步任何数据变更。
    - **Firestore 安全规则** 确保只有已认证的用户可以访问数据。
- **KPI看板**: 实时展示全部16个核心业务指标及其对比变化。
- **深度多维度图表分析**:
    * **全面指标覆盖**: 趋势图、气泡图、排名图等核心图表视图，均支持从**全部16个核心KPI指标**中选择分析维度。
    * **智能图表切换**: 趋势图根据所选指标类型，自动在 **折线图 (率值)** 和 **柱状图 (绝对值)** 之间切换。
    * **动态风险着色**: 所有图表根据**变动成本率 (VCR)** 动态显示颜色，直观提示业务风险。
    * **帕累托分析**: 快速识别贡献度最高的“关键少数”业务。
- **完整数据表**: 以表格形式完整展示**全部16个核心KPI指标**的详细数据及其对比变化。
- **强大的全局筛选与控制**:
    - 支持“累计数据 / 当周发生额”分析模式切换。
    - 支持自定义当前及对比数据周期。
    - 灵活的业务类型多选筛选器。
- **数据导出**: 支持将当前数据表视图导出为CSV文件。

## 技术栈

- **前端**:
    - Next.js (App Router, **纯前端渲染模式**)
    - React (Context API 用于 Firebase Authentication)
    - TypeScript
    - ShadCN UI, Tailwind CSS
    - Recharts (图表库)
    - Firebase SDK (用于认证和**直接访问Firestore**)
- **数据存储与认证**:
    - **Firestore**: 作为主数据库存储业务数据。
    - **Firebase Authentication**: 提供用户认证服务。

## 项目结构 (最终版)

- `src/app/`: Next.js 页面和布局 (`page.tsx`, `login/page.tsx`)。
- `src/components/`: 应用的React组件。
    - `src/components/sections/`: 各个仪表盘板块（KPI、图表、数据表）。
- `src/contexts/`: React Context API 实现 (`auth-provider.tsx`)。
- `src/lib/`: 核心工具函数 (`data-utils.ts`, `firebase.ts`)。
- `src/data/`: TypeScript类型定义 (`types.ts`)。
- `.github/workflows/`: GitHub Actions CI/CD 自动化部署工作流。
- `PRODUCT_REQUIREMENTS_DOCUMENT.md`: 产品需求文档 (v9.0.0)。
- `FIELD_DICTIONARY.md`: 字段字典与计算逻辑。
- `ISSUES_LOG.md`: 问题与解决日志。

## 运行项目 (本地开发)

### 1. 账户与工具准备
-   安装 [Node.js](https://nodejs.org/) (v20 或更高版本)
-   注册一个 [Firebase](https://firebase.google.com/) 账户。

### 2. Firebase项目设置
-   在Firebase控制台中创建一个新项目。
-   启用 **Authentication** (邮箱/密码方式) 并创建至少一个测试用户。
-   启用 **Firestore Database**，创建 `v4_period_data` 集合并上传您的数据。
-   **关键**: 设置Firestore安全规则为 `allow read, write: if request.auth != null;`。
-   记录您的Firebase项目配置信息。

### 3. 配置并运行主应用
1.  克隆仓库。
2.  在项目根目录创建 `.env.local` 文件，并填入您的Firebase配置。参考 `.env.local.example`。
3.  安装依赖: `npm install`
4.  启动开发服务器: `npm run dev`

## 部署应用 (自动化)
本项目的部署通过 **GitHub Actions CI/CD** 流程完全自动化。

1.  **首次设置**:
    *   在您的Firebase项目中生成一个新的**服务账户私钥JSON文件**。
    *   在您的GitHub仓库中，导航到 `Settings` > `Secrets and variables` > `Actions`。
    *   创建一个名为 `FIREBASE_SERVICE_ACCOUNT` 的新密钥，并将下载的JSON文件的**全部内容**粘贴到值中。

2.  **触发部署**:
    *   将您的代码提交 (`git commit`) 并推送 (`git push`) 到 `main` 分支。
    *   此 `push` 操作将自动触发 `.github/workflows/firebase-hosting-deploy.yml` 中定义的工作流，并完成部署。

