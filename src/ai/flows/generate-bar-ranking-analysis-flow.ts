
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
  chartDataJson: z.string().describe('The bar ranking chart data, in JSON format. Each item has a "name" (business line), a value for the ranked metric, vcr (variable_cost_ratio), and a "color" field based on variable_cost_ratio.'),
  rankedMetric: z.string().describe('The metric being ranked (e.g., 跟单保费, 满期赔付率).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes vcrColorRules which explains how variable_cost_ratio (变动成本率) maps to colors and business implications (green: good, blue: healthy, red: warning).')
});
export type GenerateBarRankingAnalysisInput = z.infer<typeof GenerateBarRankingAnalysisInputSchema>;

const GenerateBarRankingAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the bar ranking chart in Chinese. It should highlight top/bottom performers, significant gaps, and consider the variable_cost_ratio-based coloring of bars and the selected metric, providing deep business insights.'),
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
您的分析需洞察排名背后的业务实质，并紧密结合“变动成本率”所指示的经营健康度。

**当前分析背景：**
- 分析模式: {{{analysisMode}}}
- 数据周期: {{{currentPeriodLabel}}}
- 筛选的业务类型 (若适用): {{filtersJson.selectedBusinessTypes}}
- 变动成本率颜色规则解读: {{filtersJson.vcrColorRules}} (条形图颜色由“变动成本率”决定：绿色代表经营状况优秀/低风险，蓝色代表健康/中等风险，红色代表警告/高风险)

**排名图数据 (JSON格式):**
(每个条目包含业务线名称 'name', 指标 **{{{rankedMetric}}}** 的值, 'vcr' (变动成本率)及其对应的 'color')
{{{chartDataJson}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、头部梯队深度剖析 (In-depth Analysis of Top Performers):**
   - 识别在指标 **{{{rankedMetric}}}** 上排名前2-3位的业务线。
   - 量化其表现（明确指出其 **{{{rankedMetric}}}** 的具体数值）。
   - **关键解读**：详细分析其“变动成本率”的颜色指示及其业务含义。例如：“**业务线A** 在 **{{{rankedMetric}}}** 上排名第一，指标值为 **X**，其变动成本率表现为**健康的蓝色**，表明其在取得领先业绩的同时，成本控制和风险管理也相对稳健，属于**优质贡献者**。” 或 “**业务线B** 虽排名靠前，但其变动成本率呈**红色警戒**，提示其高业绩可能伴随着高风险或低利润率，需警惕‘**规模不经济**’的现象。”

**二、尾部梯队表现与归因 (Bottom Performers & Attribution Analysis):**
   - 识别在指标 **{{{rankedMetric}}}** 上排名后2-3位的业务线。
   - 量化其表现。
   - **关键解读**：分析其“变动成本率”的颜色指示。这些业务线是否因为高成本、高风险（红色/橙色变动成本率）导致其在 **{{{rankedMetric}}}** 上表现不佳？还是其他因素（如市场定位、竞争策略）？

**三、主要差距、分布特征与市场格局 (Key Gaps, Distribution Patterns & Market Landscape):**
   - 指出头部、中部、尾部业务线之间在 **{{{rankedMetric}}}** 上是否存在**显著的业绩差距**。这种差距反映了怎样的竞争态势或资源集中度？
   - 观察“变动成本率”颜色在整个排名中的分布特征。例如，高排名业务线是否普遍具有更优的“变动成本率”（更多绿色/蓝色）？这对于理解**领先业务的成功要素**有何启示？

**四、战略洞察与优化方向 (Strategic Insights & Optimization Directions):**
   - 基于对 **{{{rankedMetric}}}** 排名和各业务线“变动成本率”表现的综合分析，提炼1-2项核心的**战略性洞察**。
   - 针对不同梯队和不同“变动成本率”表现的业务线，提出初步的、具有针对性的**优化建议或关注重点**。例如，对于排名靠前但变动成本率高的业务，应聚焦成本管控；对于排名靠后但变动成本率健康的业务，可考虑如何扩大规模。

**重要输出要求：**
- 分析报告**必须为中文自然语言**。
- **结构清晰，层次分明**，严格按照上述四部分组织内容。
- 语言**精炼专业，富有洞察力**，体现顶级咨询顾问水准。
- 关键的指标名称、业务线名称、数据点、结论性判断等，请使用**Markdown加粗**。
- 深刻理解并运用“变动成本率”及其颜色指示作为核心分析工具，并清晰解释其业务含义。

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

