# 车险经营分析周报应用 (客户端直连Firestore, AI已禁用)

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 构建的车险经营分析仪表盘应用。用户认证通过 **Firebase Authentication** 实现。数据由已认证的客户端**直接从 Firestore 数据库安全地获取**，访问由Firestore安全规则保护。**所有AI智能分析功能当前已禁用。**

## 目标

旨在为车险业务分析人员和管理层提供一个**安全、可靠**、直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇。

## 主要功能

- **Firebase Authentication**:
    - 应用启动时会重定向到登录页面。
    - 支持使用 Firebase 凭证 (例如，邮箱/密码) 进行登录。
- **安全数据后端 (客户端直连模式)**:
    - 业务数据存储在 **Firestore** 的 `v4_period_data` 集合中。
    - 前端应用在用户认证后，使用 **Firebase 客户端SDK** 直接查询 Firestore 来获取数据。
    - **Firestore 安全规则** (`allow read, write: if request.auth != null;`) 确保只有已认证的用户可以访问数据。
- **KPI看板**: 实时展示核心业务指标。
- **多维度图表分析**:
    - **趋势分析**: 智能切换图表类型，动态颜色提示。
    - **对比气泡图**: 多维度比较业务表现。
    - **水平条形图排名**: 对业务按指标排名。
    - **占比图 (饼图)** & **帕累托图**: 分析业务构成和关键贡献者。
- **数据表**: 展示详细的原始及聚合数据。
- **全局筛选与控制**:
    - 支持分析模式切换（累计/当周发生额）。
    - 支持当前及对比数据周期选择。
    - 强大的业务类型筛选功能。
- **AI智能分析 (已禁用)**:
    * 所有AI摘要和分析功能在前端均已禁用。
    * 后端AI代理功能代码保留但不再被调用。
- **数据导出**: 支持将数据表内容导出为CSV。

## 技术栈

- **前端**:
    - Next.js (App Router, 配置为静态导出 `output: "export"`)
    - React (Context API 用于 Firebase Authentication)
    - TypeScript
    - ShadCN UI, Tailwind CSS
    - Recharts (图表库)
    - Firebase SDK (用于认证和**直接访问Firestore**)
- **后端**:
    - **Firestore**: 作为主数据库存储业务数据，并由其安全规则保障访问安全。
    - **Firebase Functions (Node.js)**: 仅用于AI代理 (`generateAiSummaryProxy` - 当前未使用)，无自定义数据获取函数。
    - **Genkit (Google AI)**: 用于AI代理 (当前未使用)。
- **数据**:
    - **Firestore** 是唯一的数据源。

## 项目结构

- `src/app/`: Next.js 页面和布局。
    - `src/app/login/page.tsx`: Firebase Authentication 登录页面。
- `src/components/`: 应用的React组件。
- `src/contexts/`: React Context API 实现 (`auth-provider.tsx`)。
- `src/lib/`: 工具函数和核心逻辑 (`data-utils.ts`, `firebase.ts`)。
- `public/`: 静态资源 (**注意: `public/data/insurance_data_v4.json` 已不再使用**)。
- `functions/`: Firebase Functions的源代码。
    - `src/index.ts`: 导出AI代理等函数 (当前未使用)。
    - **`src/getInsuranceStats.ts`**: (已删除)
- `.env.local.example`: Firebase前端配置环境变量示例。
- `PRODUCT_REQUIREMENTS_DOCUMENT.md`: 产品需求文档 (v4.1.0)。
- `FIELD_DICTIONARY_V4.md`: 字段字典与计算逻辑。
- `ISSUES_LOG.md`: 问题与解决日志。

## 运行项目

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
    *   在项目根目录创建 `.env.local` 文件，并填入您的Firebase项目配置。
    *   安装依赖: `npm install`
    *   启动开发服务器: `npm run dev`
    *   构建静态文件: `npm run build`
3.  **本地模拟与测试**:
    *   在项目根目录运行 Firebase Emulators: `firebase emulators:start --only hosting,auth,firestore`。
    *   您需要将数据导入到本地的 Firestore 模拟器中。

## 文档

- **产品需求文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md` (版本 4.1.0)
- **字段字典与计算逻辑**: `FIELD_DICTIONARY_V4.md`
- **问题与解决日志**: `ISSUES_LOG.md`
