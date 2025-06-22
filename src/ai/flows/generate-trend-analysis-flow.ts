
'use server';
/**
 * @fileOverview AI agent to analyze trend chart data for car insurance business.
 *
 * - generateTrendAnalysis - Generates analysis for trend data.
 * - GenerateTrendAnalysisInput - Input type.
 * - GenerateTrendAnalysisOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const GenerateTrendAnalysisInputSchema = z.object({
  system_instruction: z.string().describe('The master system prompt for the AI assistant.'),
  chartDataJson: z.string().describe('The trend chart data, in JSON format. Each item typically has a "name" (period label) and keys for different business lines or a total, with their values for the selected metric. Each data point for a line may also include a "color" field (SHOULD NOT BE USED by AI for description) based on variable_cost_ratio and its "vcr" value.'),
  selectedMetric: z.string().describe('The primary metric being trended (e.g., 跟单保费, 满期赔付率).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod). "periodOverPeriod" shows the change from the previous period.'),
  currentPeriodLabel: z.string().describe('The label for the most recent period in the trend (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes vcrColorRules which explains how variable_cost_ratio (变动成本率) maps to colors AND BUSINESS STATUS/IMPLICATIONS (e.g., green: "经营优秀/低风险", blue: "健康/中等风险", red: "警告/高风险"). AI MUST USE THESE BUSINESS STATUS DESCRIPTIONS, NOT COLORS.')
});
export type GenerateTrendAnalysisInput = z.infer<typeof GenerateTrendAnalysisInputSchema>;

const GenerateTrendAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the trend chart in Chinese. It should highlight key trends, inflection points, and potential insights relevant to the car insurance business, considering the selected metric, analysis mode, and the business status implications of variable_cost_ratio (derived from vcrColorRules).'),
});
export type GenerateTrendAnalysisOutput = z.infer<typeof GenerateTrendAnalysisOutputSchema>;

export async function generateTrendAnalysis(input: GenerateTrendAnalysisInput): Promise<GenerateTrendAnalysisOutput> {
  return trendAnalysisFlow(input);
}

const trendAnalysisPrompt = ai.definePrompt({
  name: 'trendAnalysisPrompt',
  input: {schema: GenerateTrendAnalysisInputSchema},
  output: {schema: GenerateTrendAnalysisOutputSchema},
  prompt: `{{{system_instruction}}}

您是麦肯锡的资深车险行业分析专家，请基于以下趋势图数据，对指标 **{{{selectedMetric}}}** 的走势进行深度解读。
您的分析需结合车险业务的运营规律，并关注“变动成本率”的动态变化及其对业务健康度的指示。

**当前分析背景：**
- 分析模式: {{{analysisMode}}} (其中 'periodOverPeriod' 表示环比变化值)
- 最新数据截至周期: {{{currentPeriodLabel}}}
- 筛选的业务类型 (若适用): {{filtersJson.selectedBusinessTypes}}
- 变动成本率的业务状态解读规则 (vcrColorRules): {{filtersJson.vcrColorRules}} (例如：绿色可能代表“经营优秀，低风险”，蓝色代表“经营健康，中等风险”，红色代表“经营告警，高风险”。请严格依据此规则进行业务状态判断。)

**趋势图数据 (JSON格式):**
(每个数据点包含 'vcr' (变动成本率) 数值，AI需根据上述规则解读其业务状态)
{{{chartDataJson}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、整体趋势解读 (Overall Trend Interpretation):**
   - 描述指标 **{{{selectedMetric}}}** 在所示周期内的**主要趋势形态**（例如，持续增长、震荡下行、平稳波动、先升后降等）。
   - 如果图表展示了多条线（例如，不同业务类型或“合计”），请对比它们之间的主要趋势差异和共性。

**二、关键节点与变化深度分析 (In-depth Analysis of Key Inflection Points & Changes):**
   - 识别趋势中的任何**显著转折点、加速增长/下滑期、或趋势方向的根本性改变**。明确指出这些变化发生的大致周期。
   - **探究变化原因**：结合 **{{{selectedMetric}}}** 的业务内涵，以及车险经营的常见影响因素（例如，市场竞争激烈程度的变化、主要营销活动节点（如特定车展、电商节促销）、渠道合作策略调整（如与大型车商合作的增减）、核保政策的阶段性松紧（如对特定高风险车型的承保调整）、重大理赔事件（如区域性自然灾害导致的赔案集中）、季节性新车销售波动及续保节奏等），对观察到的显著变化提出**具体的、有逻辑支撑的可能解释**。
   - 若趋势指标为 **{{{selectedMetric}}}** 且涉及到“跟单保费”，请结合车险经营逻辑，探讨其与（未直接显示的）“满期赔付率”可能的间接互动，例如：公司是否可能因历史高赔付率而主动收缩某些业务导致保费下降？或为追求规模而短期放宽核保导致保费上升但潜在赔付风险增加？

**三、变动成本率（业务状态）与趋势关联解读 (Correlation Analysis: Trend & Variable Cost Ratio Business Status):**
   - **核心分析指令 - 变动成本率解读:**
     - **严禁在您的分析中直接提及颜色** (例如，不要说“趋势线变为绿色”等)。
     - 您必须**始终**基于输入数据中 \`filtersJson.vcrColorRules\` 提供的映射规则，将“变动成本率”的数值区间，转化为其所代表的**业务健康状态描述**（例如，“经营优秀，低风险”，“经营健康，中等风险”，“经营告警，高风险”）。
     - 详细分析趋势线对应时点的“变动成本率”所指示的**业务健康状态如何随时间演变**（例如，从“经营健康”变为“经营告警，高风险状态”）。
     - **{{{selectedMetric}}}** 的趋势变化与“变动成本率”所指示的业务健康状态之间是否存在**明显的关联性**？请详细阐述。例如，**{{{selectedMetric}}}** 的改善是否伴随着“变动成本率”的优化（即业务健康状态向好）？反之亦然？
     - **重要核心指令：当解读‘变动成本率’及其业务状态时，您必须严格对照并运用输入数据中 \`filtersJson.vcrColorRules\` 提供的颜色与业务含义的映射规则（例如：绿色代表经营状况优秀/低风险，蓝色代表健康/中等风险，红色代表警告/高风险）。您的首要任务是根据此规则正确判断图表中各数据点‘变动成本率’的绝对水平所对应的业务健康状态，并清晰阐述。例如，若数据显示‘变动成本率’为80%，且规则定义此区间为“经营优秀，低风险”，您的分析必须明确指出‘变动成本率80%处于经营优秀，低风险状态’，而不是仅仅描述颜色为‘绿色系’，或更严重地，错误地将其判断为‘偏高’。这是本次分析的基石和最重要校验点，任何偏离此规则的解读都是不可接受的。**
   - 即使 **{{{selectedMetric}}}** 趋势与“变动成本率”所指示的业务状态短期内未呈现强相关性，也请探讨可能存在的间接影响。例如，保费规模的急剧变化是否可能通过影响固定成本占比而间接作用于“费用率”，进而影响“变动成本率”的业务状态？提示需要进一步分析哪些方面（如费用结构、赔付结构）？

**四、战略洞察与前瞻建议 (Strategic Insights & Forward-looking Recommendations):**
   - 基于对 **{{{selectedMetric}}}** 趋势及其与“变动成本率”所指示的业务状态的综合分析，提炼1-2项最具**车险行业特性和战略价值的洞察**。
   - 针对观察到的趋势和潜在风险（如“变动成本率”恶化至“经营告警”状态或特定业务趋势不佳），提出具体的、可供管理层参考的**初步行动建议或关注方向**，例如是否需要调整特定业务线的产品定价与组合、优化高成本渠道的效率、加强对某些高风险细分市场的风险筛选与核保、或通过科技手段改进理赔管理流程以控制赔付支出等。

**重要输出要求：**
- 分析报告**必须为中文自然语言**。**请确保您的分析报告完全使用中文，避免使用任何英文单词或短语。**
- **结构清晰，层次分明**，严格按照上述四部分组织内容。
- 语言**精炼专业，富有洞察力**。
- 关键的指标名称、趋势描述、转折点、业务类型名称等，请使用**Markdown加粗**。
- 深刻理解并运用“变动成本率”及其业务状态指示（根据\`vcrColorRules\`）作为核心分析工具，准确评估业务健康度。

请开始您的分析。`,
});

const trendAnalysisFlow = ai.defineFlow(
  {
    name: 'trendAnalysisFlow',
    inputSchema: GenerateTrendAnalysisInputSchema,
    outputSchema: GenerateTrendAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await trendAnalysisPrompt(input);
    return output!;
  }
);
