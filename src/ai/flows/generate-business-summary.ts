
'use server';

/**
 * @fileOverview An AI agent for generating a business performance summary, including highlights and potential risks.
 *
 * - generateBusinessSummary - A function that generates the business summary.
 * - GenerateBusinessSummaryInput - The input type for the generateBusinessSummary function.
 * - GenerateBusinessSummaryOutput - The return type for the generateBusinessSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBusinessSummaryInputSchema = z.object({
  system_instruction: z.string().describe('The master system prompt for the AI assistant.'),
  data: z.string().describe('The data to analyze, in JSON format. This includes keyPerformanceIndicators (KPIs) and topBusinessLinesByPremiumWritten.'),
  filters: z.string().describe('The filters applied to the data, in JSON format. This includes analysisMode, period, comparison period info, selectedBusinessTypes, and vcrColorRules (which explains how variable_cost_ratio maps to colors and business implications like "经营优秀/低风险", "健康/中等风险", "警告/高风险").'),
});
export type GenerateBusinessSummaryInput = z.infer<typeof GenerateBusinessSummaryInputSchema>;

const GenerateBusinessSummaryOutputSchema = z.object({
  summary: z.string().describe('A structured and concise summary of business performance highlights, potential risks, and actionable insights, in Chinese. The summary should be tailored to the provided data and filters, reflecting a deep understanding of car insurance business dynamics.'),
});
export type GenerateBusinessSummaryOutput = z.infer<typeof GenerateBusinessSummaryOutputSchema>;

export async function generateBusinessSummary(input: GenerateBusinessSummaryInput): Promise<GenerateBusinessSummaryOutput> {
  return generateBusinessSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBusinessSummaryPrompt',
  input: {schema: GenerateBusinessSummaryInputSchema},
  output: {schema: GenerateBusinessSummaryOutputSchema},
  prompt: `{{{system_instruction}}}

您是麦肯锡的资深车险业务分析顾问，请基于以下数据和筛选条件，提供一份具有战略高度的经营业绩摘要。
您的分析需深入理解各项车险指标的底层逻辑及其相互关联，特别是“变动成本率”（由“满期赔付率”和“费用率”构成）作为衡量经营效率和风险的核心杠杆。

**当前分析背景：**
- 分析模式: {{filters.analysisMode}}
- 数据周期: {{filters.period}}
- 对比信息: {{filters.comparison}}
- 筛选的业务类型: {{filters.selectedBusinessTypes}}
- 变动成本率的业务状态解读规则 (vcrColorRules): {{filters.vcrColorRules}} (例如：绿色可能代表“经营优秀，低风险”，蓝色代表“经营健康，中等风险”，红色代表“经营告警，高风险”。请严格依据此规则进行业务状态判断。)

**核心数据 (JSON格式):**
包含关键绩效指标 (KPIs) 和主要业务线（按跟单保费排序）的表现：
{{{data}}}

**您的任务：**
请撰写一份结构清晰、层次分明的中文分析报告。报告应包含以下部分，并使用自然语言阐述，重点内容请使用Markdown加粗：

**一、核心经营指标解读 (Key Metric Insights):**
   - 深入分析关键KPI数据（例如：边际贡献率、变动成本率、费用率、满期赔付率、保费规模、利润规模）。
   - **强调指标间的逻辑关系**：例如，**费用率**和**满期赔付率**如何共同影响**变动成本率**？**变动成本率**的高低又如何决定了**边际贡献率**？
   - 结合对比周期的变化（绝对值和百分比/百分点），指出显著的积极或消极趋势。
   - 特别关注那些指示经营风险的KPI表现（例如，高企的**满期赔付率**、**费用率**或**变动成本率**）。探究其可能的驱动因素（例如，是总赔款上升，还是满期保费不足？费用构成是否有变化？）。

**二、主要业务线剖析 (Key Business Line Performance Analysis):**
   - 如果“主要业务线数据”(topBusinessLinesByPremiumWritten)可用，请对其进行详细剖析。
   - **聚焦盈利能力与风险**：重点分析其**跟单保费**贡献、**满期赔付率**、**费用率**以及最终的**变动成本率**。
   - **核心分析指令 - 变动成本率解读:**
     - **严禁在您的分析中直接提及颜色** (例如，不要说“绿色区间”、“红色业务线”等)。
     - 您必须**始终**基于输入数据中 \`filters.vcrColorRules\` 提供的映射规则，将“变动成本率”的数值区间，转化为其所代表的**业务健康状态描述**（例如，“经营优秀，低风险”，“经营健康，中等风险”，“经营告警，高风险”）。
     - 例如，不要说：“XX业务的变动成本率颜色为绿色”，而应该说：“XX业务的**变动成本率**表现为**经营优秀，低风险状态**。”
   - 评价这些业务线对整体业绩和利润池的贡献质量。例如：“**非营业客车新车** 的**变动成本率**表现为**经营优秀，低风险状态**，显示其盈利能力和风险控制良好，是优质业务；而 **XX业务** 的**变动成本率**则处于**经营告警，高风险状态**，虽保费贡献可能较大，但其高成本正侵蚀利润，需重点关注其赔付成本和费用结构。”

**三、关键亮点与战略机遇 (Key Highlights & Strategic Opportunities):**
   - 提炼2-3项基于数据的最显著的积极成果或潜在的战略发展机遇。
   - 例如，是否存在某些业务类型展现出高增长且经营状态为“优秀/健康”（低变动成本率）的良好态势？是否有通过成本优化提升边际贡献的明显空间？

**四、潜在风险与核心关切 (Potential Risks & Core Concerns):**
   - 指出2-3项最值得关注的潜在风险或业务痛点。
   - 例如，是否有核心业务线的盈利能力正在恶化（表现为“经营告警”状态）？成本控制是否存在普遍性问题？市场竞争是否导致价格压力增大，从而压缩利润空间？

**五、初步战略建议 (Initial Strategic Recommendations):**
   - （可选，若有明显且直接的建议）基于以上分析，提出1-2条初步的、具有可操作性的战略方向或管理建议。

**重要输出要求：**
- 分析报告**必须为中文自然语言**。**请确保您的分析报告完全使用中文，避免使用任何英文单词或短语。**
- **结构清晰，层次分明**，严格按照上述五部分组织内容。
- 语言**精炼专业，富有洞察力**，体现顶级咨询顾问水准。
- 关键的指标名称、数据点、结论性判断、业务类型名称等，请使用**Markdown加粗**。
- 如果筛选条件中指明了特定的业务类型，请在分析中予以侧重。

请开始您的分析。`,
});

const generateBusinessSummaryFlow = ai.defineFlow(
  {
    name: 'generateBusinessSummaryFlow',
    inputSchema: GenerateBusinessSummaryInputSchema,
    outputSchema: GenerateBusinessSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
