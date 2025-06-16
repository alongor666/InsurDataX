
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
... (所有之前的条目保持不变，除了下面这条) ...
---
### 33. 新增原型级用户名/密码登录功能 (已废弃并替换为Firebase Auth)
- **问题描述**: 为应用增加基础登录机制。
- **发生时间**: (先前日期)
- **影响范围**: 全局应用访问。
- **解决方案 (原型)**: 实现基于硬编码凭证和localStorage的认证上下文。
- **状态**: **已废弃** - 被Firebase Authentication取代。
- **备注**: 原型登录功能不安全，已被更强大的Firebase Authentication替代。

---
### 34. 趋势图X轴标签格式优化 (迭代4 - 显示当周最后一天YY-MM-DD)
- **问题描述**: 用户反馈希望趋势图X轴标签更简洁，仅显示当周的最后一天（周六），格式为 "YY-MM-DD"。
- **发生时间**: (先前日期)
- **影响范围**: `src/lib/date-formatters.ts`, 相关文档。
- **解决方案 (迭代4)**:
    1.  **更新 `src/lib/date-formatters.ts`**:
        *   修改 `formatPeriodLabelForAxis` 函数，使其利用 `getWeekDateObjects` 获取周的结束日期（周六），并将其格式化为 "yy-MM-dd"。
    2.  **文档更新**: 更新PRD和README，说明新的X轴标签格式。
- **状态**: 已解决
- **备注**: Tooltip将继续显示完整的周起止日期范围。此更改旨在提高X轴的可读性和简洁性。

---
### 35. 趋势图布局优化 (迭代3)
- **问题描述**: 趋势图X轴最右侧标签被截断，可能导致图表溢出容器，引发构建错误。
- **发生时间**: (先前日期)
- **影响范围**: `src/components/sections/trend-analysis-section.tsx`
- **解决方案**:
    1.  调整了趋势图组件 (`RechartsLineChart`, `RechartsBarChart`) 的 `margin` 属性，特别是增加了 `right` 边距 (例如，从30增加到60)，为X轴标签提供更多空间。
- **状态**: 已解决
- **备注**: 旨在防止标签截断，改善布局，并可能解决相关的服务器端渲染/构建问题。

---
### 36. AI代理Function 404错误
- **问题描述**: 前端调用 `/generateAiSummaryProxy` Firebase Function 时返回404错误。
- **发生时间**: (先前日期)
- **影响范围**: 所有AI摘要功能。
- **解决方案**:
    1.  **修正 `firebase.json`**:
        *   在 `hosting.rewrites` 数组中，为 `/generateAiSummaryProxy` 添加了特定的 `function` 重写规则。
        *   确保此规则位于 `{"source": "**", "destination": "/index.html"}` 这一SPA回退规则之前。
    2.  **确保Function代码自包含**:
        *   将所有AI flow文件和共享的`genkit.ts`从项目根目录的`src/ai/`复制到`functions/src/ai/`目录下。
        *   更新`functions/src/index.ts`和复制过来的flow文件中的导入路径为相对路径。
        *   从`functions/tsconfig.json`中移除非必要的`paths`别名。
        *   在`functions/package.json`中添加了`build`脚本。
        *   在`firebase.json`的`functions`配置中添加了`predeploy`钩子，以在部署前自动执行`npm run lint`和`npm run build`。
- **状态**: 已解决
- **备注**: 确保了Firebase Function在部署时能够正确解析其依赖，并且Firebase Hosting能正确路由请求。

---
### 37. 移除数据库选项，固定使用JSON；禁用动态AI（已回滚部分）
- **问题描述**: 为实现纯静态部署，移除数据库作为数据源的选项，并禁用动态AI Server Actions。
- **发生时间**: (先前日期)
- **影响范围**: 数据加载逻辑，AI摘要功能，相关UI。
- **解决方案**:
    *   修改 `src/app/page.tsx`，固定从JSON文件加载数据，移除数据源选择。
    *   修改所有AI摘要处理函数，不再调用AI flow，而是显示提示信息。
    *   更新相关组件和文档。
- **状态**: **部分回滚** - AI功能已通过Firebase Function恢复，但数据源仍固定为JSON（通过Function提供）。
- **备注**: 此更改的AI禁用部分已被后续通过Firebase Function代理AI请求的实现所取代。

---
### 38. 集成Firebase Authentication并保护数据/AI Functions
- **问题描述**: 原型登录不安全，数据文件可公开访问。需要更安全的认证机制和数据保护。
- **发生时间**: (当前日期)
- **影响范围**: 用户认证、数据获取、AI功能调用、整体应用安全。
- **解决方案**:
    1.  **集成Firebase Authentication**:
        *   在Firebase项目中启用Authentication（例如，邮箱/密码）。
        *   创建 `src/lib/firebase.ts` 用于前端Firebase SDK初始化。
        *   重构 `src/contexts/auth-provider.tsx` 以使用Firebase Auth SDK进行用户状态管理、登录、登出。
        *   更新 `src/app/login/page.tsx` 以使用Firebase Auth。
        *   更新头部组件以显示当前用户和登出按钮。
    2.  **创建并保护数据获取Function**: (后续步骤，本次仅更新AuthProvider)
        *   将 `insurance_data.json` 从 `public/data` 移至 `functions/src/data`。
        *   创建一个新的Firebase Function `getInsuranceData`，它将：
            *   验证请求中的Firebase ID Token。
            *   读取内部的 `insurance_data.json`。
            *   将数据返回给已认证的前端。
    3.  **保护AI代理Function**: (后续步骤)
        *   修改现有的 `generateAiSummaryProxy` Function，增加Firebase ID Token验证。
    4.  **更新前端调用**: (后续步骤)
        *   前端在认证后获取ID Token。
        *   在调用 `getInsuranceData` 和 `generateAiSummaryProxy` 时，在请求头中发送ID Token。
    5.  **文档更新**: 更新PRD、README等，反映新的认证和数据保护机制。
- **状态**: **进行中** (AuthProvider已集成Firebase Auth，后续步骤待完成)
- **备注**: 这是提升应用安全性的关键步骤。需要确保正确配置Firebase项目和环境变量。

