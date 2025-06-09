
'use server';
/**
 * @fileOverview AI agent to analyze bar ranking chart data for car insurance business.
 *
 * - generateBarRankingAnalysis - Generates analysis for bar ranking data.
 * - GenerateBarRankingAnalysisInput - Input type.
 * - GenerateBarRankingAnalysisOutput - Output type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBarRankingAnalysisInputSchema = z.object({
  chartDataJson: z.string().describe('The bar ranking chart data, in JSON format. Each item has a "name" (business line), a value for the ranked metric, vcr (variable_cost_ratio), and a "color" field (SHOULD NOT BE USED by AI for description) based on variable_cost_ratio.'),
  rankedMetric: z.string().describe('The metric being ranked (e.g., 跟单保费, 满期赔付率).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes vcrColorRules which explains how variable_cost_ratio (变动成本率) maps to colors AND BUSINESS STATUS/IMPLICATIONS (e.g., green: "经营优秀/低风险", blue: "健康/中等风险", red: "警告/高风险"). AI MUST USE THESE BUSINESS STATUS DESCRIPTIONS, NOT COLORS.')
});
export type GenerateBarRankingAnalysisInput = z.infer<typeof GenerateBarRankingAnalysisInputSchema>;

const GenerateBarRankingAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the bar ranking chart in Chinese. It should highlight top/bottom performers, significant gaps, and consider the variable_cost_ratio-based business status implications of bars and the selected metric, providing deep business insights.'),
});
export type GenerateBarRankingAnalysisOutput = z.infer<typeof GenerateBarRankingAnalysisOutputSchema>;

export async function generateBarRankingAnalysis(input: GenerateBarRankingAnalysisInput): Promise<GenerateBarRankingAnalysisOutput> {
  return barRankingAnalysisFlow(input);
}

const barRankingAnalysisPrompt = ai.definePrompt({
  name: 'barRankingAnalysisPrompt',
  input: {schema: GenerateBarRankingAnalysisInputSchema},
  output: {schema: GenerateBarRankingAnalysisOutputSchema},
  prompt: `您是麦肯锡的资深车险业务绩效分析专家，请基于以下排名图数据，对各业务线在指标 **{{{rankedMetric}}}** 上的表现进行深度分析和战略解读。
您的分析需洞察排名背后的业务实质，并紧密结合“变动成本率”所指示的经营健康度（业务状态）。

**当前分析背景：**
- 分析模式: {{{analysisMode}}}
- 数据周期: {{{currentPeriodLabel}}}
- 筛选的业务类型 (若适用): {{filtersJson.selectedBusinessTypes}}
- 变动成本率的业务状态解读规则 (vcrColorRules): {{filtersJson.vcrColorRules}} (例如：绿色可能代表“经营优秀，低风险”，蓝色代表“经营健康，中等风险”，红色代表“经营告警，高风险”。请严格依据此规则进行业务状态判断。)

**排名图数据 (JSON格式):**
(每个条目包含业务线名称 'name', 指标 **{{{rankedMetric}}}** 的值, 'vcr' (变动成本率)数值。AI需根据上述规则解读其业务状态)
{{{chartDataJson}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、头部梯队深度剖析 (In-depth Analysis of Top Performers):**
   - 识别在指标 **{{{rankedMetric}}}** 上排名前2-3位的业务线。
   - 量化其表现（明确指出其 **{{{rankedMetric}}}** 的具体数值）。
   - **核心分析指令 - 变动成本率解读:**
     - **严禁在您的分析中直接提及颜色** (例如，不要说“绿色条形”等)。
     - 您必须**始终**基于输入数据中 \`filtersJson.vcrColorRules\` 提供的映射规则，将“变动成本率”的数值区间，转化为其所代表的**业务健康状态描述**。
     - **关键解读**：详细分析其“变动成本率”所指示的业务状态及其业务含义。例如：“**业务线A** 在 **{{{rankedMetric}}}** 上排名第一，指标值为 **X**，其**变动成本率**表现为**经营健康，中等风险状态**，表明其在取得领先业绩的同时，成本控制和风险管理也相对稳健，属于**优质贡献者**。” 或 “**业务线B** 虽排名靠前，但其**变动成本率**处于**经营告警，高风险状态**，提示其高业绩可能伴随着高风险或低利润率，需警惕‘**规模不经济**’的现象。”

**二、尾部梯队表现与归因 (Bottom Performers & Attribution Analysis):**
   - 识别在指标 **{{{rankedMetric}}}** 上排名后2-3位的业务线。
   - 量化其表现。
   - **关键解读**：分析其“变动成本率”所指示的业务状态。这些业务线是否因为处于高成本、高风险的业务状态（如“经营告警，高风险”）导致其在 **{{{rankedMetric}}}** 上表现不佳？还是其他因素（如市场定位、竞争策略）？

**三、主要差距、分布特征与市场格局 (Key Gaps, Distribution Patterns & Market Landscape):**
   - 指出头部、中部、尾部业务线之间在 **{{{rankedMetric}}}** 上是否存在**显著的业绩差距**。这种差距反映了怎样的竞争态势或资源集中度？
   - 观察“变动成本率”所指示的业务状态在整个排名中的分布特征。例如，高排名业务线是否普遍具有更优的“变动成本率”业务状态（更多“经营优秀”或“经营健康”）？这对于理解**领先业务的成功要素**有何启示？

**四、战略洞察与优化方向 (Strategic Insights & Optimization Directions):**
   - 基于对 **{{{rankedMetric}}}** 排名和各业务线“变动成本率”所指示业务状态的综合分析，提炼1-2项核心的**战略性洞察**。
   - 针对不同梯队和不同“变动成本率”业务状态的业务线，提出初步的、具有针对性的**优化建议或关注重点**。例如，对于排名靠前但“变动成本率”处于“经营告警，高风险”状态的业务，应聚焦成本管控；对于排名靠后但“变动成本率”处于“经营健康”状态的业务，可考虑如何扩大规模。

**重要输出要求：**
- 分析报告**必须为中文自然语言**。**请确保您的分析报告完全使用中文，避免使用任何英文单词或短语。**
- **结构清晰，层次分明**，严格按照上述四部分组织内容。
- 语言**精炼专业，富有洞察力**，体现顶级咨询顾问水准。
- 关键的指标名称、业务线名称、数据点、结论性判断等，请使用**Markdown加粗**。
- 深刻理解并运用“变动成本率”及其业务状态指示（根据\`vcrColorRules\`）作为核心分析工具，并清晰解释其业务含义。

请开始您的分析。`,
});

const barRankingAnalysisFlow = ai.defineFlow(
  {
    name: 'barRankingAnalysisFlow',
    inputSchema: GenerateBarRankingAnalysisInputSchema,
    outputSchema: GenerateBarRankingAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await barRankingAnalysisPrompt(input);
    return output!;
  }
);

