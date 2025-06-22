# 产品需求与系统设计文档 (PRD) - 车险经营分析周报

**版本**: 7.0.0 (As-Built: AI功能通过OpenRouter代理实现)
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
*   **AI赋能**: 内置AI分析引擎，通过外部代理服务（如Cloudflare Worker + OpenRouter）调用AI模型，为各可视化图表提供深度洞察和文字摘要。
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
| **AI服务网关** | AI Gateway | **Next.js API路由 (`/api/ai`)**。前端通过此路由调用后端的AI逻辑。 |
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
    *   **框架**: Next.js (App Router, **动态服务器渲染模式**)
    *   **语言**: TypeScript
    *   **UI组件**: ShadCN UI
    *   **样式**: Tailwind CSS
    *   **图表**: Recharts
    *   **状态管理**: React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`)
    *   **Firebase SDK**: `firebase/app`, `firebase/auth`, `firebase/firestore`
*   **后端/BaaS (Backend as a Service)**:
    *   **数据库**: Google Firestore
    *   **认证**: Firebase Authentication
    *   **AI服务网关**: **Next.js API路由** (`/api/ai`)
    *   **AI模型调用**: 通过**Cloudflare Worker代理**，调用**OpenRouter API**（使用免费模型）。
*   **文档**:
    *   所有核心文档（PRD, README, ISSUES_LOG, FIELD_DICTIONARY）作为“活文档”与代码一同维护在版本库中。

### 2.2. 数据流架构
本应用采用安全的无服务器 (Serverless) 架构，数据流如下：
1.  **用户访问与认证**: 用户通过 `/login` 页面使用 Firebase Authentication 进行认证。
2.  **主数据获取 (实时)**:
    *   认证成功后，主仪表盘页面 (`/`) 使用 Firestore 客户端SDK的 `onSnapshot` 方法，建立与 `v4_period_data` 集合的**实时监听连接**。
    *   任何在 Firestore 中的数据变更都会被实时推送到客户端，并自动更新UI，无需手动刷新。
    *   数据访问由 Firestore 安全规则保护，仅允许已认证用户读取。
3.  **AI分析请求**:
    *   用户在某个图表上点击“生成AI分析”按钮。
    *   前端组件收集当前图表所需的数据和上下文，构造一个JSON负载。
    *   前端使用 `fetch` API，向应用自身的 **Next.js API路由 (`/api/ai`)** 发送一个 `POST` 请求。
    *   该API路由在服务器端运行，接收请求后，根据请求中的 `flowName` 从 `src/ai/prompts.ts` 获取对应的提示模板，并构建最终的提示字符串。
    *   API路由 `fetch` 调用已部署的 **Cloudflare Worker 代理服务**。
    *   Cloudflare Worker 接收到请求，附加上安全的 **OpenRouter API密钥**，并将请求转发给 OpenRouter API，指定使用免费AI模型。
    *   OpenRouter 返回分析结果给Cloudflare Worker，后者再将其返回给Next.js API路由。
    *   API路由将AI生成的分析文本以JSON格式返回给前端。
    *   前端接收到响应，更新状态，并将AI分析摘要展示在界面上。

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
*(新增章节)*
为使AI分析功能正常工作，您必须部署位于 `openai-gemini-proxy` 目录下的Cloudflare Worker。
1.  **安装 Wrangler**: `npm install -g wrangler`
2.  **登录 Cloudflare**: `wrangler login`
3.  **获取OpenRouter API密钥**: 登录 OpenRouter.ai，复制您的API密钥。
4.  **设置Worker密钥**: 在 `openai-gemini-proxy` 目录下，运行以下命令将您的密钥安全地上传到Cloudflare：
    ```bash
    wrangler secret put OPENROUTER_API_KEY
    ```
    当提示时，粘贴您的密钥。
5.  **部署Worker**: 在 `openai-gemini-proxy` 目录下，运行 `wrangler deploy`。
6.  **获取Worker URL**: 部署成功后，Wrangler会输出您的Worker URL（例如 `https://gemini-proxy.your-account.workers.dev`）。**复制此URL**。

### 5.4. 本地应用配置与运行
1.  克隆仓库。
2.  在项目根目录创建 `.env.local` 文件，并填入您的Firebase项目配置信息。
3.  **关键步骤**: 打开 `src/app/api/ai/route.ts` 文件，找到 `OPENROUTER_PROXY_URL` 常量，并将其值替换为您在上一步中获得的 **Cloudflare Worker URL**。
4.  安装依赖: `npm install`
5.  启动开发服务器: `npm run dev`

### 5.5. 部署应用 (自动化CI/CD)
*(无变更)*

---

## 6. 修订历史

| 版本  | 日期       | 修订人     | 修订说明                                                                                                                                                             |
| :---- | :--------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ...   | ...        | ...      | ... (保留之前所有记录)                                                                                                                                               |
| 6.0.0 | (先前日期) | AI项目大师 | **重大架构重构**: 为规避Firebase Blaze套餐限制，彻底移除云函数依赖。创建了Next.js API路由`/api/ai`作为新的AI服务网关，并重新启用了所有图表的AI智能分析功能及UI。 |
| 7.0.0 | (当前日期) | AI项目大师 | **AI架构再重构**: 移除了Genkit依赖以解决`next build`失败问题。将AI模型调用重构为通过Cloudflare Worker代理，调用OpenRouter的免费模型，并更新了所有相关文档和部署指南。 |
