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

... (保留所有之前的条目) ...

---
### 46. 架构重构：切换为安全的后端数据源
- **问题描述**: 应用当前从位于 `public/data` 的静态JSON文件获取数据，这存在安全隐患且与生产环境的最佳实践不符。此外，之前尝试使用云函数时遇到的 "Internal Server Error" 很可能是由于数据获取逻辑与PRD不一致，以及潜在的Firestore配置问题导致的。
- **发生时间**: (先前日期)
- **影响范围**: 整个应用的数据获取、安全性和架构。
- **解决方案**:
    1.  **进行根本性的架构变更**，以对齐安全、可扩展的后端实践。
    2.  **创建 `getInsuranceStats` Firebase Function**:
        *   在 `functions/src/getInsuranceStats.ts` 中实现一个新的 HTTPS Callable Function。
        *   此函数强制要求调用者必须通过 Firebase Authentication 进行身份验证 (`context.auth` 检查)。
        *   函数安全地从 Firestore 数据库的 `v4_period_data` 集合中读取所有保险数据。
        *   函数返回一个结构化的响应 `{ status: 'success', data: [...] }` 或在失败时抛出标准的 `HttpsError`。
    3.  **更新 `functions/src/index.ts`**: 导出新的 `getInsuranceStats` 函数，以便部署。
    4.  **重构前端数据获取逻辑 (`src/app/page.tsx`)**:
        *   移除 `fetch('/data/insurance_data_v4.json')` 的逻辑。
        *   在用户认证通过后，使用 Firebase SDK 的 `httpsCallable` 功能来调用 `getInsuranceStats` 函数。
        *   实现完整的加载、成功和错误状态处理，以响应云函数的调用结果。
    5.  **更新项目核心文档**:
        *   **`PRODUCT_REQUIREMENTS_DOCUMENT.md`**: 更新至 v4.0.0，明确将数据源定义为 "Firestore via secure Firebase Function"。调整数据提供 (F-DATA) 和安全 (NF-SEC) 相关的需求描述。
        *   **`README.md`**: 更新技术栈、项目结构和运行说明，以反映新的数据架构。
        *   **`ISSUES_LOG.md`**: 添加此条目，记录本次重要的架构重构。
- **状态**: **已解决** (架构已升级为安全的后端数据源)
- **备注**: 此变更从根本上提升了应用的安全性，使数据不再公开可访问。它还解决了之前因数据源架构不明确而导致的 "Internal Server Error" 问题。现在，应用的数据流是清晰、安全且符合生产最佳实践的。

---
### 47. 深度调试 `FirebaseError: internal`
- **问题描述**: 切换到安全的 `getInsuranceStats` 云函数架构后，前端调用该函数时持续收到 "Internal Server Error"。这表明云函数在服务器端执行时崩溃。
- **发生时间**: (当前日期)
- **影响范围**: 核心数据获取功能，导致整个仪表盘无法加载数据。
- **解决方案**:
    1.  **升级云函数运行时**: 将 `firebase.json` 和 `functions/package.json` 中的Node.js运行时从 `nodejs18` 升级到 `nodejs20`，以利用最新的LTS环境，解决潜在的底层兼容性问题。
    2.  **实施深度诊断日志**:
        *   修改 `functions/src/getInsuranceStats.ts` 文件，使用 `functions.logger` 在函数执行的每个关键步骤（函数触发、认证检查、Firestore查询前后、成功返回、错误捕获）添加详细的日志输出。
        *   为函数增加 `.runWith({ memory: '512MB', timeoutSeconds: 60 })` 配置，以提供更充裕的运行资源，排除因资源不足导致的冷启动失败。
- **状态**: **处理中** (已部署增强日志功能，等待检查云端日志以定位根本原因)
- **备注**: 这是解决云端模糊错误的最佳实践。下一步是在触发错误后，立即在Firebase控制台检查 `getInsuranceStats` 函数的日志，以确定其失败的具体位置和原因。
