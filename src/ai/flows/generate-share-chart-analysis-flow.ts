
'use server';
/**
 * @fileOverview AI agent to analyze share chart (pie chart) data for car insurance business.
 *
 * - generateShareChartAnalysis - Generates analysis for share chart data.
 * - GenerateShareChartAnalysisInput - Input type.
 * - GenerateShareChartAnalysisOutput - Output type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateShareChartAnalysisInputSchema = z.object({
  chartDataJson: z.string().describe('The share chart (pie chart) data, in JSON format. Each item has "name" (business line), "value" for the selected metric, "percentage" of total, "vcr" (variable_cost_ratio), and a "color" field based on variable_cost_ratio.'),
  analyzedMetric: z.string().describe('The metric being analyzed for its share (e.g., 跟单保费, 总赔款).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第23周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes vcrColorRules which explains how variable_cost_ratio (变动成本率) maps to colors and their business implications (green: good, blue: healthy, red: warning).')
});
export type GenerateShareChartAnalysisInput = z.infer<typeof GenerateShareChartAnalysisInputSchema>;

const GenerateShareChartAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the share chart in Chinese, using Markdown for emphasis. It should identify dominant business lines, assess their contribution quality based on variable_cost_ratio, and highlight potential structural insights or imbalances.'),
});
export type GenerateShareChartAnalysisOutput = z.infer<typeof GenerateShareChartAnalysisOutputSchema>;

export async function generateShareChartAnalysis(input: GenerateShareChartAnalysisInput): Promise<GenerateShareChartAnalysisOutput> {
  return shareChartAnalysisFlow(input);
}

const shareChartAnalysisPrompt = ai.definePrompt({
  name: 'shareChartAnalysisPrompt',
  input: {schema: GenerateShareChartAnalysisInputSchema},
  output: {schema: GenerateShareChartAnalysisOutputSchema},
  prompt: `您是麦肯锡的资深车险业务组合与结构分析专家，请基于以下占比图数据，对指标 **{{{analyzedMetric}}}** 的业务构成进行深度解读。
您的分析需识别主导业务类型，并重点评估其“变动成本率”表现，从而判断其对整体业务组合的健康度和盈利贡献质量。

**当前分析背景：**
- 分析模式: {{{analysisMode}}}
- 数据周期: {{{currentPeriodLabel}}}
- 筛选的业务类型 (若适用): {{filtersJson.selectedBusinessTypes}}
- 变动成本率颜色规则解读: {{filtersJson.vcrColorRules}} (饼图扇区颜色由“变动成本率”决定：绿色代表经营状况优秀/低风险，蓝色代表健康/中等风险，红色代表警告/高风险)

**占比图数据 (JSON格式):**
(每个条目包含业务线名称 'name', 指标 **{{{analyzedMetric}}}** 的值 'value', 占比 'percentage', 'vcr' (变动成本率)及其对应的 'color')
{{{chartDataJson}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、主要业务构成与主导者分析 (Key Business Composition & Dominant Players Analysis):**
   - 识别并列出在指标 **{{{analyzedMetric}}}** 上占比最高的2-3个**主导业务线**。
   - 明确指出它们各自的**占比份额**及其对整体 **{{{analyzedMetric}}}** 的贡献程度。
   - **核心评估**：对这些主导业务线的“变动成本率”颜色指示及其业务含义进行深入分析。
     - 例如：“**非营业客车新车** 占据了 **{{{analyzedMetric}}}** 高达 **X%** 的份额，是绝对的领先者。其**变动成本率表现为健康的蓝色**，说明其在贡献主要份额的同时，保持了较好的盈利能力和风险控制，是业务组合中的**压舱石**。”
     - 或：“**某某货车业务** 虽然占比达到 **Y%**，位居第二，但其**变动成本率呈红色警戒**，这表明其规模贡献的背后，可能存在**较高的成本或风险敞口**，对整体利润的**实际拉动效应有限**，需警惕其对业务组合健康度的潜在拖累。”

**二、业务结构健康度与平衡性评估 (Portfolio Health & Balance Assessment):**
   - 综合评估当前业务组合在 **{{{analyzedMetric}}}** 上的**集中度**。是否存在少数业务线占比过高，导致整体业务对单一类型依赖性过强的情况？
   - 分析“变动成本率”颜色在主要占比业务线中的分布。优质贡献（即占比较高且变动成本率健康/优秀）的业务是否占据主导？还是高风险业务占据了较大份额？这对整体业务组合的**稳健性和盈利可持续性**有何影响？

**三、次要业务线中的机会与风险点 (Opportunities & Risks in Smaller Segments):**
   - 关注那些占比较小，但“变动成本率”表现突出的业务线。
     - 是否存在“**小而精**”的业务（占比小，但变动成本率呈绿色）？它们是否代表了潜在的**高利润增长点**或**利基市场机会**？
     - 是否存在“**小而差**”的业务（占比小，且变动成本率呈红色）？这些业务是否在**持续侵蚀资源**，需要考虑优化或退出策略？

**四、战略启示与结构优化建议 (Strategic Implications & Structural Optimization Recommendations):**
   - 基于对业务构成的占比和各部分盈利质量的分析，提炼1-2项关于**业务结构调整或战略聚焦**的核心洞察。
   - 例如，是否需要进一步提升优质核心业务的占比？如何改善高占比但高风险业务的经营效率？如何培育有潜力的小众高利润业务？

**重要输出要求：**
- 分析报告**必须为中文自然语言**。
- **结构清晰，层次分明**，严格按照上述四部分组织内容。
- 语言**精炼专业，富有洞察力**。
- 关键的指标名称、业务线名称、占比数据、结论性判断等，请使用**Markdown加粗**。
- 深刻理解并运用“变动成本率”及其颜色指示作为核心分析工具，以评估各构成部分的“贡献质量”。

请开始您的分析。`,
});

const shareChartAnalysisFlow = ai.defineFlow(
  {
    name: 'shareChartAnalysisFlow',
    inputSchema: GenerateShareChartAnalysisInputSchema,
    outputSchema: GenerateShareChartAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await shareChartAnalysisPrompt(input);
    return output!;
  }
);
