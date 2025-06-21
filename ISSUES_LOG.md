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
### 48. 架构最终定型：客户端直连Firestore
- **问题描述**: 由于无法升级到 Firebase 的 Blaze 计费计划，导致无法部署任何需要 Cloud Build API 的现代云函数（如 `getInsuranceStats`）。这使得之前设计的“通过云函数安全访问Firestore”的架构无法实现，并持续引发 `FirebaseError: internal` 或部署失败。
- **发生时间**: (当前日期)
- **影响范围**: 整个应用的数据获取架构、安全模型和部署流程。
- **解决方案**:
    1.  **进行最终的架构决策**，转向 Firebase 推荐的另一种安全模式：客户端直接访问 Firestore。
    2.  **移除云函数依赖**:
        *   彻底删除 `functions/src/getInsuranceStats.ts` 文件。
        *   从 `src/lib/firebase.ts` 中移除 `firebase/functions` 的导入和初始化。
    3.  **实现客户端直接查询 Firestore**:
        *   在 `src/lib/firebase.ts` 中，初始化并导出 **Firestore 客户端实例** (`db`)。
        *   在 `src/app/page.tsx` 的 `fetchData` 函数中，移除所有 `httpsCallable` 的逻辑。
        *   使用 Firebase 客户端SDK (`firebase/firestore`) 的 `getDocs` 和 `collection` 方法，在用户通过认证后，直接查询 Firestore 的 `v4_period_data` 集合。
    4.  **安全保障**:
        *   此架构的安全性由用户已在 Firebase 控制台配置的 **Firestore 安全规则** (`allow read, write: if request.auth != null;`) 提供保障。
        *   Firebase 后端会强制执行此规则，只有携带有效认证令牌的客户端请求才会被允许，从而防止了未授权的数据访问。
    5.  **更新项目核心文档**:
        *   **`PRODUCT_REQUIREMENTS_DOCUMENT.md`**: 更新至 v4.1.0，明确将数据源定义为 "Firestore via authenticated client-side SDK"。调整数据提供 (F-DATA) 和安全 (NF-SEC) 相关的需求描述。
        *   **`README.md`**: 更新技术栈、项目结构和运行说明（特别是 Firebase 设置部分），以反映新的数据架构。
        *   **`ISSUES_LOG.md`**: 添加此条目，记录本次重要的架构调整及其原因。
- **状态**: **已解决** (架构已升级为安全的、客户端直连Firestore的模式，不再需要依赖云函数获取数据)
- **备注**: 这是在有计费限制的情况下，实现数据安全性的最佳实践。它充分利用了 Firebase 的原生安全能力，同时简化了后端部署的复杂性。
