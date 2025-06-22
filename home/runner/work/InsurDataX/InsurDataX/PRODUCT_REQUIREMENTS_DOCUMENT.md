# 产品需求与系统设计文档 (PRD) - 车险经营分析周报

**版本**: 8.0.0 (As-Built: 前端直连AI代理的最终架构)
**最后更新日期**: (当前日期)
**负责人**: AI项目大师

## 1. 引言

### 1.1. 文档目的
本文档作为“车险经营分析周报”应用的**核心设计与实现蓝图 (As-Built Documentation)**。它旨在为开发人员、架构师、测试人员和系统维护者提供一个关于应用功能、技术架构、实现细节和部署方法的全面、精确、单一信息源。

本文档的目标是确保任何具备相应技术栈能力的开发者，都能够**基于此文档从零开始，完整地理解、构建并复刻出与当前线上版本功能完全一致的应用**。

### 1.2. 应用范围与核心价值
本应用是一个**安全、交互式、动态**的车险经营分析仪表盘。其核心价值在于：
*   **安全性**: 通过 **Firebase Authentication** 进行用户认证，并通过 **Firestore 安全规则** 保障后端数据的访问安全。
*   **数据驱动**: 为车险业务分析师和管理层提供一个直观、高效的数据可视化分析平台。
*   **AI赋能 (解耦架构)**: AI分析功能通过**前端直连外部代理服务**实现，主应用与AI模型调用完全解耦，规避了所有平台部署限制。
*   **标准化**: 确保所有核心业务指标的计算口径和展现逻辑全公司统一。

### 1.3. 目标受众
*   **开发人员**: 用于理解功能需求、技术实现和进行二次开发。
*   **系统维护者**: 用于了解系统架构、部署和排查问题。
*   **产品与业务分析师**: 用于明确已实现的功能和业务逻辑。

### 1.4. 关键术语与定义
| 术语 | 英文/ID | 定义 |
| :--- | :--- | :--- |
| **YTD** | Year To Date | 本年迄今累计值。 |
| **PoP** | Period over Period | 环比分析模式，分析“当周发生额”。 |
| **当周发生额** | Period Value | `当前周期YTD值 - 上一周期YTD值`。在PoP模式下，所有指标均基于此重新计算。 |
| **数据源** | Data Source | **Firestore 数据库**。前端在用户认证后，使用客户端SDK直接查询。 |
| **AI代理服务**| AI Proxy Service| 一个独立的Cloudflare Worker，负责安全地调用OpenRouter API，避免在主应用中暴露密钥。|
| **认证服务** | Authentication | **Firebase Authentication**，使用邮箱/密码登录。 |
| **安全模型** | Security Model | **客户端直连 + Firestore安全规则**。 |
| **变动成本率** | `variable_cost_ratio` | `费用率 + 满期赔付率`。是评估业务健康度的核心风险指标。 |
| **边际贡献率** | `marginal_contribution_ratio` | `100% - 变动成本率`。是评估业务盈利能力的核心指标。 |
| **pp** | percentage points | **百分点**。用于描述两个百分比指标之间的差异。 |
| **字段字典** | `FIELD_DICTIONARY.md` | **(重要)** 定义了所有业务指标的精确计算逻辑、数据来源和处理规则。**本文档中所有指标的计算均以此文件为准。** |

---

## 2. 系统架构

### 2.1. 技术栈
*   **前端**:
    *   **框架**: Next.js (App Router, **纯客户端渲染模式**)
    *   **语言**: TypeScript
    *   **UI组件**: ShadCN UI
    *   **样式**: Tailwind CSS
    *   **图表**: Recharts
    *   **状态管理**: React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`)
    *   **Firebase SDK**: `firebase/app`, `firebase/auth`, `firebase/firestore`
*   **后端/BaaS (Backend as a Service)**:
    *   **数据库**: Google Firestore
    *   **认证**: Firebase Authentication
    *   **AI模型调用**: 通过部署在**Cloudflare Worker**上的代理服务，调用**OpenRouter API**（使用免费模型）。
*   **文档**:
    *   所有核心文档（PRD, README, ISSUES_LOG, FIELD_DICTIONARY）作为“活文档”与代码一同维护在版本库中。

### 2.2. 数据流架构 (最终版)
本应用采用安全的无服务器 (Serverless) 架构，数据流如下：
1.  **用户访问与认证**: 用户通过 `/login` 页面使用 Firebase Authentication 进行认证。
2.  **主数据获取 (实时)**:
    *   认证成功后，主仪表盘页面 (`/`) 使用 Firestore 客户端SDK的 `onSnapshot` 方法，建立与 `v4_period_data` 集合的**实时监听连接**。
    *   任何在 Firestore 中的数据变更都会被实时推送到客户端，并自动更新UI，无需手动刷新。
    *   数据访问由 Firestore 安全规则保护，仅允许已认证用户读取。
3.  **AI分析请求 (前端直连代理)**:
    *   用户在某个图表上点击“生成AI分析”按钮。
    *   **前端组件**收集当前图表所需的数据和上下文，并使用`src/lib/ai-prompt-builder.ts`中的函数，在客户端**直接构建最终的分析提示**。
    *   **前端组件**使用 `fetch` API，直接向部署好的 **Cloudflare Worker 代理服务URL** 发送一个 `POST` 请求。该URL通过`NEXT_PUBLIC_OPENROUTER_PROXY_URL`环境变量提供。
    *   Cloudflare Worker 接收到请求，附加上安全的 **OpenRouter API密钥**，并将请求转发给 OpenRouter API。
    *   OpenRouter 返回分析结果给Cloudflare Worker，后者再将其返回给前端组件。
    *   前端组件接收到响应，更新状态，并将AI分析摘要展示在界面上。
    *   **注意**: 此流程完全绕过了Next.js的后端/API路由，从根本上避免了与Firebase Hosting部署限制的冲突。

---

## 3. 核心功能需求 (F-REQ)
*(无重大变更)*

---

## 4. 非功能性需求 (NF-REQ)
*(无变更)*

---

## 5. 项目从0到1复刻指南

### 5.1. 环境准备
*   安装 [Node.js](https://nodejs.org/) (v20 或更高版本)
*   安装 [pnpm](https://pnpm.io/installation) (推荐的包管理器)
*   一个 [Firebase](https://firebase.google.com/) 项目
*   一个 [Cloudflare](https://www.cloudflare.com/) 账户 (用于部署AI代理)
*   一个 [OpenRouter.ai](https://openrouter.ai/) 账户 (获取免费API密钥)

### 5.2. Firebase项目设置
*(无变更)*

### 5.3. AI代理服务部署 (Cloudflare Worker)
*(无变更)*

### 5.4. 本地应用配置与运行
1.  克隆仓库。
2.  在项目根目录创建 `.env.local` 文件，并填入您的Firebase项目配置信息，以及您在上一步中获得的**Cloudflare Worker URL**。示例如下：
    ```
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    # ...其他Firebase变量...
    
    # !! 关键步骤 !!
    NEXT_PUBLIC_OPENROUTER_PROXY_URL=https://your-proxy-worker.your-account.workers.dev
    ```
3.  安装依赖: `npm install`
4.  启动开发服务器: `npm run dev`

### 5.5. 部署应用 (自动化CI/CD)
1.  **获取服务账户密钥**: 在Firebase控制台为您的项目生成一个新的服务账户私钥JSON文件。
2.  **配置GitHub仓库Secrets**:
    *   在您的GitHub仓库中，导航到 `Settings` > `Secrets and variables` > `Actions`。
    *   创建名为 `FIREBASE_SERVICE_ACCOUNT` 的新密钥，并将下载的JSON文件的**全部内容**粘贴到值中。
    *   **关键**: 创建一个名为 `NEXT_PUBLIC_OPENROUTER_PROXY_URL` 的新密钥，并将您部署的Cloudflare Worker的**完整URL**粘贴到值中。
3.  **触发部署**: 将您的代码提交并推送到 `main` 分支。GitHub Actions将自动构建并部署应用到Firebase Hosting。

---

## 6. 修订历史

| 版本  | 日期       | 修订人     | 修订说明                                                                                                                                                             |
| :---- | :--------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ...   | ...        | ...      | ... (保留之前所有记录)                                                                                                                                               |
| 7.0.0 | (先前日期) | AI项目大师 | **AI架构再重构**: 移除了Genkit依赖以解决`next build`失败问题。将AI模型调用重构为通过Cloudflare Worker代理，调用OpenRouter的免费模型，并更新了所有相关文档和部署指南。 |
| 8.0.0 | (当前日期) | AI项目大师 | **最终架构修复**: 为彻底解决`firebase deploy`因平台限制失败的问题，完全移除了Next.js API路由。重构前端组件以直接调用AI代理，实现了最简化的架构并保证了部署成功。 |
