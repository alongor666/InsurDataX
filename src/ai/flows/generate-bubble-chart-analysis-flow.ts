
'use server';
/**
 * @fileOverview AI agent to analyze bubble chart data for car insurance business.
 *
 * - generateBubbleChartAnalysis - Generates analysis for bubble chart data.
 * - GenerateBubbleChartAnalysisInput - Input type.
 * - GenerateBubbleChartAnalysisOutput - Output type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBubbleChartAnalysisInputSchema = z.object({
  chartDataJson: z.string().describe('The bubble chart data, in JSON format. Each item has id, name (business line name), x, y, z values for the selected metrics, vcr (variable_cost_ratio), and a color (SHOULD NOT BE USED by AI for description) based on variable_cost_ratio.'),
  xAxisMetric: z.string().describe('The metric represented on the X-axis (e.g., "跟单保费").'),
  yAxisMetric: z.string().describe('The metric represented on the Y-axis (e.g., "满期赔付率").'),
  bubbleSizeMetric: z.string().describe('The metric represented by the bubble size (e.g., "保单数量").'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes vcrColorRules which explains how variable_cost_ratio (变动成本率) maps to colors AND BUSINESS STATUS/IMPLICATIONS (e.g., green: "经营优秀/低风险", blue: "健康/中等风险", red: "警告/高风险"). AI MUST USE THESE BUSINESS STATUS DESCRIPTIONS, NOT COLORS.')
});
export type GenerateBubbleChartAnalysisInput = z.infer<typeof GenerateBubbleChartAnalysisInputSchema>;

const GenerateBubbleChartAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the bubble chart in Chinese, using Markdown for emphasis. It should classify business lines (e.g., star, cash cow, problem child, dog based on the three metrics and VCR business status), highlight outliers, clusters, and relationships, considering the variable_cost_ratio-based business status implications and selected metrics.'),
});
export type GenerateBubbleChartAnalysisOutput = z.infer<typeof GenerateBubbleChartAnalysisOutputSchema>;

export async function generateBubbleChartAnalysis(input: GenerateBubbleChartAnalysisInput): Promise<GenerateBubbleChartAnalysisOutput> {
  return bubbleChartAnalysisFlow(input);
}

const bubbleChartAnalysisPrompt = ai.definePrompt({
  name: 'bubbleChartAnalysisPrompt',
  input: {schema: GenerateBubbleChartAnalysisInputSchema},
  output: {schema: GenerateBubbleChartAnalysisOutputSchema},
  prompt: `您是麦肯锡的资深车险业务组合分析专家，请基于以下气泡图数据，对各业务线的表现进行深度定位和战略解读。
您的分析需结合经典的业务组合矩阵思想（如BCG矩阵），并深刻理解“变动成本率”的业务状态对业务盈利能力和风险的决定性作用。

**图表配置：**
- X轴: **{{{xAxisMetric}}}**
- Y轴: **{{{yAxisMetric}}}**
- 气泡大小: **{{{bubbleSizeMetric}}}**

**当前分析背景：**
- 分析模式: {{{analysisMode}}}
- 数据周期: {{{currentPeriodLabel}}}
- 筛选的业务类型 (若适用): {{filtersJson.selectedBusinessTypes}}
- 变动成本率的业务状态解读规则 (vcrColorRules): {{filtersJson.vcrColorRules}} (例如：绿色可能代表“经营优秀，低风险”，蓝色代表“经营健康，中等风险”，红色代表“经营告警，高风险”。请严格依据此规则进行业务状态判断。)

**气泡图数据 (JSON格式):**
(每个条目包含业务线名称 'name', x/y/z轴指标值, 'vcr' (变动成本率)数值。AI需根据上述规则解读其业务状态)
{{{chartDataJson}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、关键业务线定位与解读 (Key Business Line Positioning & Interpretation):**
   - 识别出2-3个在图表上表现突出的业务线（例如，**最大的气泡**、**位置最偏离的离群点**、或因其“变动成本率”所指示的**业务状态**而**特别值得关注**的业务线）。
   - 对每个选定的业务线：
     - 精确描述其在 **{{{xAxisMetric}}}** 和 **{{{yAxisMetric}}}** 维度上的位置，及其由 **{{{bubbleSizeMetric}}}** 代表的规模。
     - **核心分析指令 - 变动成本率解读:**
       - **严禁在您的分析中直接提及颜色** (例如，不要说“绿色气泡”等)。
       - 您必须**始终**基于输入数据中 \`filtersJson.vcrColorRules\` 提供的映射规则，将“变动成本率”的数值区间，转化为其所代表的**业务健康状态描述**。
       - **深刻解读其“变动成本率”所指示的业务健康状态和盈利能力**。例如：“**非营业客车新车** 表现为高**{{{xAxisMetric}}}**(如高保费)、低**{{{yAxisMetric}}}**(如低赔付率)、大规模(**{{{bubbleSizeMetric}}}**)，且其**变动成本率处于经营优秀，低风险状态**，属于典型的‘**明星业务**’或‘**现金牛业务**’，贡献了主要的优质利润。” 或 “**某某货车业务** 的**{{{xAxisMetric}}}** 和 **{{{bubbleSizeMetric}}}** 均不高，但 **{{{yAxisMetric}}}** 偏高，且其**变动成本率处于经营告警，高风险状态**，可能属于‘**瘦狗业务**’或高风险业务，需审慎评估其发展策略。”
     - 量化其关键指标值（例如：“跟单保费 **12460万元**”，“满期赔付率 **55.2%**”，“保单数量 **8500件**”，“变动成本率 **85.0% (经营优秀，低风险状态)**”）。

**二、业务组合特征与集群分析 (Portfolio Characteristics & Cluster Analysis):**
   - 描述图表中是否出现明显的业务线集群。这些集群在三个维度指标和“变动成本率”所指示的业务风险等级上有何共同特征？
   - 图表的特定象限（例如，高X高Y，低X高Y等）是否更为密集？这对于整体业务组合的健康度、风险集中度或发展阶段有何指示意义？
   - **尝试从业务组合角度进行归类**：基于选定指标和“变动成本率”所指示的业务状态，哪些业务线更接近“明星”、“现金牛”、“问题（高增长但处于高风险/低利润状态）”或“瘦狗（低增长低利润/高风险状态）”的特征？

**三、指标间深层关系与运营启示 (Deep Metric Relationships & Operational Implications):**
   - 在 **{{{xAxisMetric}}}**, **{{{yAxisMetric}}}**, 和 **{{{bubbleSizeMetric}}}** 之间可以观察到哪些值得注意的**内在关联或制约关系**？
   - “变动成本率”所指示的业务状态如何与这些指标相互作用？例如，规模较大 (高 **{{{bubbleSizeMetric}}}**) 的业务线，其“变动成本率”所指示的业务状态是否普遍更优/更差？或者，特定 **{{{xAxisMetric}}}** / **{{{yAxisMetric}}}** 区间的业务线是否更容易出现“经营告警，高风险”的“变动成本率”状态？这对风险定价或资源分配有何启示？

**四、战略洞察与行动建议 (Strategic Insights & Actionable Recommendations):**
   - 基于以上分析，提炼1-2项最具价值的**战略性洞察**。
   - 针对不同定位的业务线（特别是那些“问题业务”或处于“经营告警，高风险”状态的业务），提出**具体的、可操作的初步建议**，例如优化理赔流程以降低赔付、调整定价策略、加强费用管控、或考虑战略性放弃某些持续亏损业务。

**重要输出要求：**
- 分析报告**必须为中文自然语言**。**请确保您的分析报告完全使用中文，避免使用任何英文单词或短语。**
- **结构清晰，层次分明**，严格按照上述四部分组织内容。
- 使用**Markdown对关键术语、业务线名称、重要数据和结论进行加粗**。
- 确保分析的深度，不仅仅是描述数据点，而是**揭示其背后的业务逻辑和战略意义**。
- **准确运用“变动成本率”及其业务状态指示**作为核心分析工具，并清晰解释其业务含义。

请开始您的分析。`,
});

const bubbleChartAnalysisFlow = ai.defineFlow(
  {
    name: 'bubbleChartAnalysisFlow',
    inputSchema: GenerateBubbleChartAnalysisInputSchema,
    outputSchema: GenerateBubbleChartAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await bubbleChartAnalysisPrompt(input);
    return output!;
  }
);

