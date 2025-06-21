# 产品需求与系统设计文档 (PRD) - 车险经营分析周报

**版本**: 5.3.0 (As-Built: 动态应用架构)
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
*   **标准化**: 确保所有核心业务指标的计算口径和展现逻辑全公司统一。

**注意：所有AI智能分析功能当前已全局禁用。**

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
    *   **云函数 (AI代理)**: Firebase Functions (Node.js) - **当前已禁用**

### 2.2. 数据流架构
本应用采用安全的无服务器 (Serverless) 架构，数据流如下：
1.  **用户访问**: 用户打开应用，被重定向到 `/login` 页面。
2.  **认证**: 用户输入凭证，应用通过 Firebase Auth SDK 将凭证发送至 Firebase Authentication 服务进行验证。
3.  **获取认证令牌**: 认证成功后，Firebase Auth SDK 在客户端维护用户的会话，并持有一个安全的ID令牌。
4.  **安全数据请求**: 用户被导航至主仪表盘 (`/`)。`page.tsx` 中的 `useEffect` 钩子被触发，它调用 `fetchData` 函数。
5.  `fetchData` 函数使用 **Firestore 客户端SDK** (`getDocs`) 发起对 `v4_period_data` 集合的查询请求。此时，SDK会自动将当前用户的认证ID令牌附加在请求头中。
6.  **Firestore规则验证**: Firestore 后端服务接收到请求，首先检查其安全规则。规则 (`allow read: if request.auth != null;`) 要求请求中必须包含一个有效的认证令牌 (`request.auth` 不为 `null`)。
7.  **数据返回**:
    *   如果验证通过，Firestore 执行查询，并将结果集返回给客户端。
    *   如果验证失败（例如，用户未登录或令牌无效），Firestore 将直接拒绝请求，返回权限错误。
8.  **前端渲染**: 客户端收到数据后，更新React状态，驱动UI重新渲染，展示KPI和图表。

---

## 3. 核心功能需求 (F-REQ)

### 3.1. 用户认证 (F-AUTH)
*   **F-AUTH-001: 登录页面**: 应用提供一个 `/login` 路径的登录页面，包含邮箱和密码输入框、登录按钮。
*   **F-AUTH-002: 认证逻辑**: 使用 `firebase/auth` 的 `signInWithEmailAndPassword` 方法进行认证。
*   **F-AUTH-003: 路由保护**: `src/contexts/auth-provider.tsx` 实现路由保护。未登录用户访问任何受保护页面时，将被自动重定向到 `/login`。
*   **F-AUTH-004: 会话管理**: Firebase SDK 自动处理用户会话的持久化和ID令牌的刷新。
*   **F-AUTH-005: 登出功能**: 应用头部提供“登出”按钮，调用 `signOut` 方法并重定向到登录页。
*   **F-AUTH-006: 加载状态**: 在验证用户身份期间，应用显示全局加载骨架屏，防止内容闪烁。

### 3.2. 数据架构与获取 (F-DATA)
*   **F-DATA-001: Firestore数据存储**:
    *   所有业务周期数据存储在 Firestore 的一个名为 `v4_period_data` 的集合中。
    *   集合中的每一个**文档(Document)**代表一个独立的业务周期。
    *   文档的 **ID** 应该设置为该周期的唯一标识符，例如 `"2025W24"`。
    *   每个文档的结构必须严格遵守 `V4PeriodData` 类型定义（见 `src/data/types.ts`），包含 `period_id`, `period_label`, `business_data` 数组等字段。
*   **F-DATA-002: Firestore安全规则**: 必须在 Firebase 控制台为 Firestore 设置以下规则，以确保数据安全：
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          // 只允许已通过Firebase Authentication认证的用户进行读写
          allow read, write: if request.auth != null;
        }
      }
    }
    ```
*   **F-DATA-003: 前端数据获取**:
    *   在 `src/app/page.tsx` 的 `fetchData` 函数中实现。
    *   当用户认证通过后，使用 `firebase/firestore` 的 `getDocs` 和 `collection` 方法查询 `v4_period_data` 集合中的所有文档。
    *   获取的数据存储在 `allV4Data` React状态中。
    *   应用具备完整的加载中 (`isGlobalLoading`) 和错误 (`error`) 状态处理。

### 3.3. 全局筛选与控制 (F-CTRL)
应用头部提供一套全局控制器，用于动态分析数据。所有控制器的状态均由 `src/app/page.tsx` 管理。

| 控件 | 组件位置 | 功能描述 |
| :--- | :--- | :--- |
| **分析模式切换** | `src/components/shared/analysis-mode-toggle.tsx` | 一个开关 (Switch)，允许用户在 **“累计数据” (`cumulative`)** 和 **“环比数据” (`periodOverPeriod`)** 之间切换。此选择会影响所有KPI和图表的数据计算方式。 |
| **当前周期选择** | `src/components/layout/header.tsx` (Select) | 一个下拉选择框，列出所有可用的数据周期。用户选择后，整个仪表盘将刷新以显示该周期的数据。 |
| **对比周期选择** | `src/components/layout/header.tsx` (Select) | 一个下拉选择框，允许用户选择任一其他周期作为对比基准。默认选项为 **“智能环比”**，即自动与当前周期的上一期进行对比。选择后，所有KPI卡的对比值将基于此计算。 |
| **业务类型筛选** | `src/components/layout/header.tsx` (DropdownMenu) | 一个功能强大的多选下拉菜单：<br/>- 支持复选框多选。<br/>- 提供“全选”、“反选”、“清除”快捷操作。<br/>- 鼠标悬停在单个选项上时，会出现“仅此项”按钮，方便快速单选。<br/>- 更改需点击“确认”按钮生效，提供“取消”选项。 |
| **视图导航器** | `src/components/layout/header.tsx` | 一组按钮，允许用户在不同的分析视图之间切换：`KPI看板`, `趋势图`, `气泡图`, `排名图`, `占比图`, `帕累托图`, `数据表`。 |
| **数据导出** | `src/components/layout/header.tsx` (Button) | 点击后，将 `数据表` 视图中的当前聚合数据导出为 `.csv` 文件。 |

### 3.4. KPI看板 (F-KPI)
*   **组件**: `src/components/sections/kpi-dashboard-section.tsx`
*   **布局**: 4x4 网格布局，共展示16个核心KPI。
*   **数据来源**: `calculateKpis` 函数 (`/src/lib/data-utils.ts`) 基于处理后的数据计算得出。
*   **对比逻辑**: 每个KPI卡片 (`KpiCard`) 都会显示与“对比周期”的差异，包括绝对值变化和百分比/百分点变化。
*   **风险高亮**:
    *   **高风险 (红色边框)**: 当 `变动成本率` >= 90% 时，卡片显示红色粗边框。
    *   **中等风险 (橙色数值)**: 当 `费用率` > 14.5% 时，数值显示为橙色。
    *   **高赔付风险 (红色数值)**: 当 `满期赔付率` > 70% 时，数值显示为红色。

### 3.5. 图表与数据视图 (F-VIEWS)
所有图表视图均支持动态数据更新，以响应全局筛选器的变化。

*   **趋势分析 (F-TREND)**
    *   **组件**: `src/components/sections/trend-analysis-section.tsx`
    *   **智能图表切换**: 根据所选指标类型，自动在 **折线图 (率值)** 和 **柱状图 (绝对值)** 之间切换。
    *   **动态着色**: 折线图的点和柱状图的柱子颜色根据其对应周期的**变动成本率 (VCR)** 动态变化，直观反映各时间点的业务健康度。
    *   **坐标轴优化**: X轴显示周期的最后一天 (格式 `yy-MM-dd`)，Y轴根据指标单位动态显示标签 (如 `(万元)`, `(pp)`)。
    *   **自定义工具提示 (Tooltip)**: 显示完整的周期范围、指标值和VCR值。

*   **对比气泡图 (F-BUBBLE)**
    *   **组件**: `src/components/sections/bubble-chart-section.tsx`
    *   **三维数据分析**: 提供三个独立的指标选择器，分别控制 **X轴、Y轴** 和 **气泡大小**。
    *   **动态着色**: 每个气泡的颜色根据其对应业务线的**变动成本率 (VCR)** 动态变化。
    *   **自定义工具提示**: 显示业务线名称、三个轴的指标值和VCR值。

*   **水平条形图排名 (F-RANK)**
    *   **组件**: `src/components/sections/bar-chart-ranking-section.tsx`
    *   **动态排名**: 根据所选指标对所有独立的业务线进行降序排名。
    *   **动态着色**: 每个条形的颜色根据其对应业务线的**变动成本率 (VCR)** 动态变化。
    *   **数据标签**: 在每个条形图的末端显示其精确数值。

*   **占比图 (F-SHARE)**
    *   **组件**: `src/components/sections/share-chart-section.tsx`
    *   **构成分析**: 使用环形图（Pie Chart）展示各业务线在所选**绝对值指标**上的贡献占比。
    *   **动态着色**: 每个扇区的颜色根据其对应业务线的**变动成本率 (VCR)** 动态变化。
    *   **自定义图例 (Legend)**: 为适应多业务线场景，图例被设计为多列布局，显示业务线名称和精确占比。

*   **帕累托图 (F-PARETO)**
    *   **组件**: `src/components/sections/pareto-chart-section.tsx`
    *   **80/20分析**: 使用组合图（柱状图+折线图）分析关键少数贡献。柱状图代表各业务线的指标值，折线图代表累计贡献百分比。
    *   **动态着色**: 柱状图的颜色根据其对应业务线的**变动成本率 (VCR)** 动态变化。
    *   **双Y轴**: 左Y轴显示指标值，右Y轴显示累计百分比。

*   **数据表 (F-TABLE)**
    *   **组件**: `src/components/sections/data-table-section.tsx`
    *   **明细展示**: 以表格形式展示每个独立业务线的主要指标。
    *   **动态列**: 在“环比数据”模式下，会自动增加显示**环比变化**的列。

---

## 4. 非功能性需求 (NF-REQ)
*   **NF-PERF-001: 性能**: 应用在进行数据获取或处理时，必须显示清晰的加载状态（例如，全局骨架屏、图表加载动画），避免UI卡顿。
*   **NF-SEC-001: 安全性**: 用户认证必须通过 Firebase Authentication。所有核心业务数据必须存储在 Firestore 中，并通过安全规则进行保护，严禁任何形式的未授权访问。
*   **NF-UI-001: 用户体验**: 界面必须简洁、专业。所有数值显示遵循统一的格式化规则。应用在主流现代浏览器（Chrome, Firefox, Edge）上应表现一致。

---

## 5. 项目从0到1复刻指南

本指南将指导一名新开发者如何完整地搭建和运行本项目。

### 5.1. 环境与工具准备
1.  安装 [Node.js](https://nodejs.org/) (推荐 v20.x 或更高版本)。
2.  安装 [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`。
3.  安装 Git。

### 5.2. Firebase项目设置
1.  **创建Firebase项目**:
    *   访问 [Firebase 控制台](https://console.firebase.google.com/) 并创建一个新项目。
2.  **启用认证服务**:
    *   在左侧导航栏 "Build" -> "Authentication"。
    *   点击 "Get started"。
    *   在 "Sign-in method" 标签页中，启用 **“邮箱/密码”** 提供商。
    *   在 "Users" 标签页中，手动添加一个测试用户，记下其邮箱和密码。
3.  **启用并配置Firestore**:
    *   在左侧导航栏 "Build" -> "Firestore Database"。
    *   点击 "Create database"。
    *   选择在**生产模式 (Production mode)**下启动。
    *   选择一个离您用户最近的服务器位置。
    *   数据库创建后，点击 **"Start collection"**。
    *   输入集合ID: `v4_period_data`。
    *   **添加数据文档**:
        *   点击 "Add document"。
        *   在 "Document ID" 处输入一个周期ID，例如 `2025W24`。
        *   在文档字段中，严格按照 `V4PeriodData` 的结构添加字段和数据。您可以将一个周期的数据从 `public/data/insurance_data_v4.json` 文件中复制出来作为参考。
        *   重复此步骤，添加几个不同的周期文档以供测试。
    *   **设置安全规则**:
        *   导航到 "Rules" 标签页。
        *   将编辑器中的内容替换为以下规则，然后点击 **"Publish"**。
          ```javascript
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /{document=**} {
                allow read, write: if request.auth != null;
              }
            }
          }
          ```
4.  **获取Firebase配置**:
    *   在项目主页，点击 "Project settings" (齿轮图标)。
    *   在 "General" 标签页的应用列表中，点击 `</>` (Web) 图标注册一个新的Web应用。
    *   注册应用后，Firebase 会提供一个 `firebaseConfig` 对象。复制其中的所有键值对。

### 5.3. 本地应用配置与运行
1.  **克隆代码库**: `git clone <repository_url>`
2.  **安装依赖**: `cd <project_directory>` 然后运行 `npm install`。
3.  **创建环境变量文件**:
    *   在项目根目录创建一个名为 `.env.local` 的文件。
    *   将您从 Firebase 控制台复制的 `firebaseConfig` 键值对填入此文件，并确保每个变量名前都加上 `NEXT_PUBLIC_` 前缀。文件内容应如下所示：
      ```env
      NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
      NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
      NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-ABCDEFGHIJ"
      ```
4.  **启动开发服务器**: 运行 `npm run dev`。
5.  **访问应用**: 打开浏览器并访问 `http://localhost:9002` (或您终端中显示的地址)。您应该会被重定向到登录页面。使用您在Firebase中创建的测试用户凭证登录，即可看到仪表盘。

### 5.4. 部署应用 (自动化CI/CD)
本应用的部署通过 **GitHub Actions CI/CD** 流程完全自动化。此流程采用 Firebase Hosting 的**框架感知部署模式**，能正确构建和伺服动态Next.js应用。

**请勿在本地手动运行 `firebase deploy` 命令。**

#### 5.4.1. 首次设置

在您将代码推送到GitHub仓库以进行首次部署前，必须完成一次性的安全配置：

1.  **获取服务账户密钥**: 访问您项目的 [Firebase服务账户设置页面](https://console.firebase.google.com/project/datalens-insights-2fh8a/settings/serviceaccounts/adminsdk)，点击 **"生成新的私钥"** 按钮，下载一个JSON文件。
2.  **在GitHub中配置密钥**:
    *   打开您的GitHub仓库，导航到 `Settings` > `Secrets and variables` > `Actions`。
    *   点击 **"New repository secret"**。
    *   **Name**: `FIREBASE_SERVICE_ACCOUNT`
    *   **Secret**: 将您下载的JSON文件的**全部内容**复制并粘贴进去。
    *   点击 **"Add secret"**。

#### 5.4.2. 触发与监控部署

1.  **触发部署**: 将您的代码提交 (`git commit`) 并推送到 (`git push`) GitHub 仓库的 `main` 分支。
    ```bash
    git add .
    git commit -m "描述您的更改"
    git push origin main
    ```
2.  **监控部署**:
    *   推送后，访问您GitHub仓库的 **"Actions"** 标签页。
    *   您会看到一个名为 "Deploy Next.js to Firebase Hosting" 的工作流正在运行。
    *   部署成功后，工作流将显示一个绿色的对勾。

---

## 6. 修订历史

| 版本  | 日期       | 修订人     | 修订说明                                                                                                                               |
| :---- | :--------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| ...   | ...        | ...      | ... (保留之前所有记录)                                                                                                                   |
| 5.1.0 | (先前日期) | AI项目大师 | **架构修正**: 从 `next.config.ts` 中移除 `output: "export"`，将应用从静态导出模式纠正为动态服务器渲染模式，以支持认证功能并解决内部服务器错误。更新了部署指南。 |
| 5.2.0 | (先前日期) | AI项目大师 | **部署流程最终化**: 明确并记录了基于GitHub Actions的自动化CI/CD部署流程，此为项目的唯一标准部署方式。移除了所有关于手动部署的过时指令。 |
| 5.3.0 | (当前日期) | AI项目大师 | **构建稳定性修复**: 解决了因 `null` 值类型不匹配导致的生产构建 (`npm run build`) 失败问题。通过在 `page.tsx` 中对图表数据进行加固，确保了类型安全。 |

