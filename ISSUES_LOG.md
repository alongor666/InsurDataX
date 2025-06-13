
# 问题与解决日志

本文档用于记录在“车险经营分析周报”项目开发过程中遇到的主要问题及其解决方案。

## 日志格式
- **问题描述**: 清晰描述遇到的问题或错误。
- **发生时间**: 问题首次被注意到的时间。
- **影响范围**: 问题影响的功能模块或组件。
- **解决方案**: 简述解决该问题的步骤和方法。
- **状态**: (例如：已解决, 处理中, 待观察)
- **备注**: (可选) 其他相关信息。

---

## 记录

### 1. ReferenceError: ShieldAlert is not defined / selectedPeriodId is not defined
- ... (保持不变)
- **状态**: 已解决

---
... (所有之前的条目保持不变) ...
---
### 24. 气泡图保单件数显示合计值问题
- ... (保持不变)
- **状态**: 已解决

---
### 25. 应用静态化改造：移除Server Actions及API路由依赖 (阶段性)
- **问题描述**: 为实现纯静态部署 (如 Firebase Hosting)，需要移除所有服务器端依赖，包括 Server Actions (Genkit AI flows) 和 API 路由 (数据库连接)。
- **发生时间**: 2024-05-29
- **影响范围**: 整体应用架构，数据源功能，AI分析功能，`src/app/page.tsx`, `src/components/layout/header.tsx`, 及所有AI flow文件和DB相关文件。
- **解决方案**:
    1.  **移除数据库支持**:
        *   从 `src/components/layout/header.tsx` 中移除了数据源选择UI。
        *   修改 `src/app/page.tsx`，移除了 `dataSource` state，固定从 `/data/insurance_data.json` 加载数据。
        *   `src/app/api/insurance-data/route.ts` 和 `src/lib/db.ts` 变为未使用代码。
    2.  **禁用动态AI分析 (临时)**:
        *   修改 `src/app/page.tsx` 中所有 `handle...AiSummary` 函数，使其不再调用实际的AI flow，而是设置提示信息（如“AI 功能在此静态演示中不可用。”）并更新UI加载状态。
        *   这意味着 `src/ai/flows/*.ts` 文件中的 Server Actions 不再被调用。
    3.  **更新文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md` 和 `README.md` 已更新，反映应用已变为纯静态版本，移除了DB支持和动态AI功能。
- **状态**: 已解决 (作为过渡阶段)
- **备注**: 应用在V3.0.0时适合纯静态托管。AI和数据库功能被移除或禁用以符合静态部署模型。

---
### 26. 重新引入AI功能并通过Firebase Function代理
- **问题描述**: 需要一种安全的方式来重新启用AI分析功能，同时保持前端的静态可部署性。
- **发生时间**: 2024-05-30
- **影响范围**: 整体应用架构，AI分析功能，`src/app/page.tsx`, Firebase项目配置。
- **解决方案**:
    1.  **创建Firebase Function (`functions/src/index.ts`)**:
        *   实现了一个HTTP触发的Function (`generateAiSummaryProxy`)，用于接收前端请求。
        *   此Function配置了CORS，导入并调用了现有的Genkit AI flows (`src/ai/flows/*`)。
        *   根据请求中的 `flowName` 和 `inputData` 动态调用相应的flow。
        *   API密钥（如 `GOOGLE_API_KEY`）需配置为Function的环境变量，不在代码中硬编码。
    2.  **配置Function环境**:
        *   创建 `functions/package.json` 和 `functions/tsconfig.json`。
        *   更新项目根目录的 `firebase.json` 以包含functions的部署配置和hosting到function的rewrite规则。
    3.  **更新前端调用逻辑 (`src/app/page.tsx`)**:
        *   修改所有 `handle...AiSummary` 函数，使其通过 `fetch` 调用 `/generateAiSummaryProxy` Firebase Function。
        *   请求体包含 `flowName` 和 `inputData`。
        *   处理来自Function的响应或错误，并更新UI。
    4.  **更新文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md` (V3.1.0) 和 `README.md` 已更新，反映AI功能通过Firebase Function后端代理实现。
- **状态**: 已解决
- **备注**: 应用前端仍可静态部署。AI分析的计算和API调用现在由后端的Firebase Function安全处理。开发者需要在Firebase控制台为Function配置必要的环境变量（如 `GOOGLE_API_KEY`）。
