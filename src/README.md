# 车险经营分析周报应用 (客户端直连Firestore, Next.js API路由驱动AI)

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 构建的**动态**车险经营分析仪表盘应用。用户认证通过 **Firebase Authentication** 实现。数据由已认证的客户端**直接从 Firestore 数据库安全地获取**，访问由Firestore安全规则保护。**AI智能分析功能已通过内置的Next.js API路由重新启用**。

## 目标

旨在为车险业务分析人员和管理层提供一个**安全、可靠、智能**、直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇。

## 主要功能

- **Firebase Authentication**:
    - 应用启动时会重定向到登录页面。
    - 支持使用 Firebase 凭证 (例如，邮箱/密码) 进行登录。
- **安全数据后端 (客户端直连模式)**:
    - 业务数据存储在 **Firestore** 的 `v4_period_data` 集合中。
    - 前端应用在用户认证后，使用 **Firebase 客户端SDK** 的 `onSnapshot` 方法建立实时连接，自动同步数据变更。
    - **Firestore 安全规则** (`allow read, write: if request.auth != null;`) 确保只有已认证的用户可以访问数据。
- **AI智能分析 (已启用)**:
    * 每个图表下方都有独立的按钮，用于生成针对当前视图的AI深度分析摘要。
    * AI服务通过应用内置的 **Next.js API路由 (`/api/ai`)** 提供，无需依赖外部云函数。
- **KPI看板**: 实时展示核心业务指标。
- **多维度图表分析**:
    - **趋势分析**: 智能切换图表类型，动态颜色提示，优化的两行式X轴标签。
    - **对比气泡图**: 多维度比较业务表现。
    - **水平条形图排名**: 对业务按指标排名。
    - **占比图 (饼图)** & **帕累托图**: 分析业务构成和关键贡献者。
- **数据表**: 展示详细的原始及聚合数据。
- **全局筛选与控制**:
    - 支持分析模式切换（累计/当周发生额）。
    - 支持当前及对比数据周期选择。
    - 强大的业务类型筛选功能。
- **数据导出**: 支持将数据表内容导出为CSV。

## 技术栈

- **前端**:
    - Next.js (App Router, **动态服务器渲染模式**)
    - React (Context API 用于 Firebase Authentication)
    - TypeScript
    - ShadCN UI, Tailwind CSS
    - Recharts (图表库)
    - Firebase SDK (用于认证和**直接访问Firestore**)
- **后端 (集成在Next.js中)**:
    - **API层**: **Next.js API路由 (`/api/ai`)** 作为AI服务网关。
    - **AI框架**: Genkit (Google AI)，由API路由直接调用。
- **数据存储**:
    - **Firestore**: 作为主数据库存储业务数据，并由其安全规则保障访问安全。

## 项目结构

- `src/app/`: Next.js 页面和布局。
    - `src/app/login/page.tsx`: Firebase Authentication 登录页面。
    - `src/app/api/ai/route.ts`: **新的AI服务网关**。
- `src/components/`: 应用的React组件。
- `src/contexts/`: React Context API 实现 (`auth-provider.tsx`)。
- `src/lib/`: 工具函数和核心逻辑 (`data-utils.ts`, `firebase.ts`)。
- `src/ai/`: Genkit AI分析流的源代码。
- `public/`: 静态资源 (**注意: `public/data/insurance_data_v4.json` 已不再使用**)。
- `functions/`: **(已废弃)** Firebase Functions的源代码，不再用于AI代理。
- `.github/workflows/`: GitHub Actions CI/CD 自动化部署工作流。
- `.env.local.example`: Firebase前端配置环境变量示例。
- `PRODUCT_REQUIREMENTS_DOCUMENT.md`: 产品需求文档 (v6.0.0)。
- `FIELD_DICTIONARY.md`: 字段字典与计算逻辑。
- `ISSUES_LOG.md`: 问题与解决日志。

## 运行项目 (本地开发)

1.  **Firebase项目设置**:
    *   确保您有一个Firebase项目。
    *   在Firebase控制台中启用 **Firebase Authentication** (例如，邮箱/密码)。
    *   在Firebase控制台中启用 **Firestore Database** 并创建名为 `v4_period_data` 的集合，将您的保险数据文档上传至此。
    *   **关键**: 在 Firestore 的 **Rules (规则)** 标签页中，设置并发布以下规则:
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if request.auth != null;
            }
          }
        }
        ```
    *   记录您的Firebase项目配置信息。
2.  **前端应用与Firebase配置**:
    *   在项目根目录创建 `.env.local` 文件，并填入您的Firebase项目配置信息。
    *   安装依赖: `npm install`
    *   启动开发服务器: `npm run dev`

## 部署应用 (自动化)

本项目的部署通过 **GitHub Actions CI/CD** 流程完全自动化。**请勿在本地运行 `firebase deploy`。**

部署流程如下：

1.  **首次设置**:
    *   **获取服务账户密钥**: 在 [Firebase服务账户设置](https://console.firebase.google.com/project/datalens-insights-2fh8a/settings/serviceaccounts/adminsdk) 页面，为您项目生成一个新的私钥JSON文件。
    *   **配置GitHub仓库密钥**:
        *   在您的GitHub仓库中，导航到 `Settings` > `Secrets and variables` > `Actions`。
        *   创建一个名为 `FIREBASE_SERVICE_ACCOUNT` 的新密钥。
        *   将下载的JSON文件的**全部内容**粘贴到密钥值中。

2.  **触发部署**:
    *   将您的代码提交 (`git commit`) 并推送 (`git push`) 到 `main` 分支。
        ```bash
        git add .
        git commit -m "描述您的更改"
        git push origin main
        ```
    *   此 `push` 操作将自动触发 `.github/workflows/firebase-hosting-deploy.yml` 中定义的工作流。

3.  **监控部署**:
    *   在您的GitHub仓库的 **"Actions"** 标签页中，您可以实时查看部署的进度。
    *   当工作流成功完成（显示绿色对勾），您的应用就已成功部署到 Firebase Hosting。

## 文档

- **产品需求文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md` (版本 6.0.0)
- **字段字典与计算逻辑**: `FIELD_DICTIONARY.md`
- **问题与解决日志**: `ISSUES_LOG.md`
