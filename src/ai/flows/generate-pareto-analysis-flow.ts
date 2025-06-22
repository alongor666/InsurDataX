
'use server';
/**
 * @fileOverview AI agent to analyze Pareto chart data for car insurance business.
 *
 * - generateParetoAnalysis - Generates analysis for Pareto chart data.
 * - GenerateParetoAnalysisInput - Input type.
 * - GenerateParetoAnalysisOutput - Output type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Input Schema for Pareto Analysis
const GenerateParetoAnalysisInputSchema = z.object({
  system_instruction: z.string().describe('The master system prompt for the AI assistant.'),
  chartDataJson: z.string().describe('The Pareto chart data, in JSON format. Each item has "name" (business line), "value" for the ranked metric, "cumulativePercentage", and a "color" field (SHOULD NOT BE USED by AI for description) based on variable_cost_ratio (变动成本率) and its "vcr" value.'),
  analyzedMetric: z.string().describe('The metric being analyzed in the Pareto chart (e.g., 跟单保费, 总赔款).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第23周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes vcrColorRules which explains how variable_cost_ratio (变动成本率) maps to colors AND BUSINESS STATUS/IMPLICATIONS (e.g., green: "经营优秀/低风险", blue: "健康/中等风险", red: "警告/高风险"). AI MUST USE THESE BUSINESS STATUS DESCRIPTIONS, NOT COLORS.')
});
export type GenerateParetoAnalysisInput = z.infer<typeof GenerateParetoAnalysisInputSchema>;

// Define Output Schema for Pareto Analysis
const GenerateParetoAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the Pareto chart in Chinese, using Markdown for emphasis. It should highlight key contributors (the "vital few" typically contributing to 80% of the total), their variable_cost_ratio business status implications, and any significant observations from the "trivial many," providing deep business insights.'),
});
export type GenerateParetoAnalysisOutput = z.infer<typeof GenerateParetoAnalysisOutputSchema>;

// Exported function to be called by the application
export async function generateParetoAnalysis(input: GenerateParetoAnalysisInput): Promise<GenerateParetoAnalysisOutput> {
  return paretoAnalysisFlow(input);
}

// Define the Prompt for Pareto Analysis
const paretoAnalysisPrompt = ai.definePrompt({
  name: 'paretoAnalysisPrompt',
  input: {schema: GenerateParetoAnalysisInputSchema},
  output: {schema: GenerateParetoAnalysisOutputSchema},
  prompt: `{{{system_instruction}}}

您是麦肯锡的资深车险业务结构与盈利性分析专家，请基于以下帕累托图数据，对指标 **{{{analyzedMetric}}}** 的贡献结构进行深度剖析。
您的分析需运用帕累托法则（80/20原则）识别核心业务，并重点评估这些核心业务的“变动成本率”所指示的业务状态及其对整体盈利质量的影响。

**当前分析背景：**
- 分析模式: {{{analysisMode}}}
- 数据周期: {{{currentPeriodLabel}}}
- 筛选的业务类型 (若适用): {{filtersJson.selectedBusinessTypes}}
- 变动成本率的业务状态解读规则 (vcrColorRules): {{filtersJson.vcrColorRules}} (例如：绿色可能代表“经营优秀，低风险”，蓝色代表“经营健康，中等风险”，红色代表“经营告警，高风险”。请严格依据此规则进行业务状态判断。)

**帕累托图数据 (JSON格式):**
(每个条目包含业务线名称 'name', 指标 **{{{analyzedMetric}}}** 的值 'value', 累计贡献百分比 'cumulativePercentage', 'vcr' (变动成本率)数值。AI需根据上述规则解读其业务状态)
{{{chartDataJson}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、核心贡献业务线 (关键少数 - The Vital Few) 及其盈利质量评估：**
   - 识别出贡献了总 **{{{analyzedMetric}}}** 约 **80%** 的“**关键少数**”业务线（参考 \`cumulativePercentage\` 字段）。
   - 逐一列出这些“**关键少数**”业务线。对于每一个：
     - 清晰说明其贡献的 **{{{analyzedMetric}}}** 数值及其在整体中的大致占比。
     - **核心分析指令 - 变动成本率解读:**
       - **严禁在您的分析中直接提及颜色** (例如，不要说“绿色柱子”等)。
       - 您必须**始终**基于输入数据中 \`filtersJson.vcrColorRules\` 提供的映射规则，将“变动成本率”的数值区间，转化为其所代表的**业务健康状态描述**。
       - **核心评估**：详细分析其“变动成本率”所指示的业务状态及其深层业务含义。例如：“**非营业客车旧车非过户** 业务贡献了 **XXX万元** 的 **{{{analyzedMetric}}}**，是主要驱动力之一。其**变动成本率**表现为**经营优秀，低风险状态**，表明该业务不仅贡献规模大，且**盈利能力强，风险可控**，是高质量的核心业务。” 或 “**某某货车业务** 虽贡献了显著的 **{{{analyzedMetric}}}**，但其**变动成本率**处于**经营告警，高风险状态**，提示其高贡献的背后可能隐藏着**高成本或高风险**，对整体利润的**实际贡献质量有待提升**。”
   - 总结这批“**关键少数**”业务线对整体 **{{{analyzedMetric}}}** 贡献的集中度，以及它们总体的**盈利画像**（例如，是普遍处于“经营优秀/健康”状态，还是喜忧参半？）。

**二、其余业务线 (次要多数 - The Trivial Many) 概览与机会挖掘：**
   - 简要评述剩余贡献约20%的“**次要多数**”业务线。
   - 在这些业务线中，是否存在“**小而美**”的类型？即虽然其对 **{{{analyzedMetric}}}** 的整体贡献不大，但其“变动成本率”表现为“经营优秀，低风险”状态，显示出较高的运营效率和盈利潜力。这些业务是否值得投入更多资源以扩大规模？
   - 同时，是否存在一些贡献小且“变动成本率”表现为“经营告警，高风险”状态的业务线，可能需要考虑优化或调整策略？

**三、帕累托结构洞察与战略启示 (Pareto Structure Insights & Strategic Implications):**
   - 基于80/20分布以及“**关键少数**”的“变动成本率”所指示的业务状态综合表现，对当前业务结构在 **{{{analyzedMetric}}}** 指标上提出核心洞察。
   - 例如，当前业务是否过度依赖少数几个处于“经营告警，高风险”状态的业务线？或者，处于“经营优秀/健康”状态的业务线是否已形成规模效应？

**四、战略聚焦与资源配置建议 (Strategic Focus & Resource Allocation Recommendations):**
   - 基于您的帕累托分析，提出1-2项关于**战略聚焦**和**资源优化配置**的初步建议。
   - 例如，是否应进一步巩固和扩大处于“经营优秀/健康”状态核心业务的优势？如何提升高贡献但处于“经营告警，高风险”状态业务的盈利能力？对于“小而美”（低贡献但“经营优秀”）的业务，应采取何种培育策略？

**重要输出要求：**
- 分析报告**必须为中文自然语言**。**请确保您的分析报告完全使用中文，避免使用任何英文单词或短语。**
- **结构清晰，层次分明**，严格按照上述四部分组织内容。
- 语言**精炼专业，富有洞察力**。
- 关键的指标名称、业务线名称、数据点（如80%分界线）、结论性判断等，请使用**Markdown加粗**。
- 深刻理解并运用“变动成本率”及其业务状态指示（根据\`vcrColorRules\`）作为核心分析工具，并清晰解释其业务含义，特别是在评估“贡献质量”时。

请开始您的分析。`,
});

// Define the Flow for Pareto Analysis
const paretoAnalysisFlow = ai.defineFlow(
  {
    name: 'paretoAnalysisFlow',
    inputSchema: GenerateParetoAnalysisInputSchema,
    outputSchema: GenerateParetoAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await paretoAnalysisPrompt(input);
    return output!;
  }
);
