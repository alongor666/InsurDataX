
# 车险经营分析周报应用

本项目是一个基于 Next.js, React, ShadCN UI, Tailwind CSS 和 Genkit (用于AI功能) 构建的车险经营分析仪表盘应用。

## 目标

旨在为车险业务分析人员和管理层提供一个直观、高效的数据可视化分析平台，帮助他们快速洞察业务表现、识别风险与机遇，并支持数据驱动的决策。

## 主要功能

- **KPI看板**: 实时展示核心业务指标及其同比环比变化，布局为4x4网格。卡片高度基本一致。
- **趋势分析**: 可视化关键指标在时间维度上的变化趋势。线条颜色根据VCR动态变化。
- **对比气泡图**: 多维度比较不同业务类型的表现。用户可自定义X轴、Y轴和气泡大小的指标。气泡颜色根据VCR动态变化，无图例。
- **水平条形图排名**: 对业务类型按选定指标（包含KPI看板核心指标）进行排名。条形颜色根据VCR动态变化（红/蓝/绿，深浅可调）。数据标签格式统一（金额为万元整数，单均/案均保费为元整数，百分比为1位小数带%，件数为整数件）。图表高度已优化，Y轴显示业务类型名称，X轴有动态单位标签。
- **数据表**: 展示详细的原始及聚合数据。
- **全局筛选与控制**: 
    - 支持分析模式切换（累计/当周发生额）。
    - 支持数据周期选择。
    - 支持业务类型多选筛选（含全选、反选）。
- **AI智能分析**: 
    - 生成结构化的总体业务摘要，根据筛选条件动态调整。
    - 为各个图表生成独立的、结构化的AI解读，考虑VCR颜色规则和用户选择。
- **动态颜色提示**: 图表根据变动成本率动态调整颜色（红、蓝、绿，深浅变化），突出风险和机会。
- **数据导出**: 支持将数据表内容导出为CSV。

## 技术栈

- **前端**:
    - Next.js (App Router)
    - React
    - TypeScript
    - ShadCN UI (组件库)
    - Tailwind CSS (样式)
    - Recharts (图表库)
    - Lucide React (图标)
- **AI 功能**:
    - Genkit (Google AI)
- **数据**:
    - 本地 JSON 文件 (`public/data/insurance_data_v4.json`) 作为数据源。

## 项目结构

- `src/app/`: Next.js 页面和布局。
- `src/components/`: 应用的React组件。
    - `layout/`: 页面布局组件。
    - `sections/`: 主要功能区块组件 (KPI看板、图表等)。
    - `shared/`: 可复用的通用组件。
    - `ui/`: ShadCN UI 基础组件。
- `src/ai/`: Genkit相关的AI Flow和配置。
    - `flows/`: 具体的AI分析流程。
- `src/lib/`: 工具函数和核心逻辑。
    - `data-utils.ts`: 数据处理、聚合和KPI计算的核心逻辑。
- `src/data/`: 数据类型定义。
- `public/data/`: 存放应用的原始数据文件 (`insurance_data_v4.json`)。
- `PRODUCT_REQUIREMENTS_DOCUMENT.md`: 产品需求文档。
- `FIELD_DICTIONARY_V4.md`: 字段字典与计算逻辑。
- `ISSUES_LOG.md`: 问题与解决日志。

## 运行项目

1.  确保已安装 Node.js 和 npm/yarn。
2.  安装依赖:
    ```bash
    npm install
    # 或
    yarn install
    ```
3.  启动开发服务器:
    ```bash
    npm run dev
    # 或
    yarn dev
    ```
    应用通常会在 `http://localhost:9002` (根据`package.json`配置) 启动。

4.  (可选) 如果需要运行或测试Genkit Flows:
    ```bash
    npm run genkit:dev
    # 或查看 package.json 中其他 genkit 相关脚本
    ```
    确保 `.env` 文件中配置了必要的API密钥（如Google AI Studio的API Key）。

## 文档

- **产品需求文档**: `PRODUCT_REQUIREMENTS_DOCUMENT.md`
- **字段字典与计算逻辑**: `FIELD_DICTIONARY_V4.md`
- **问题与解决日志**: `ISSUES_LOG.md`

## 贡献

(待补充，如果项目需要多人协作)

## 许可证

(待定)

