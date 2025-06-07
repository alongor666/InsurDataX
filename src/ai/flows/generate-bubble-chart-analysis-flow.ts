
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
  chartDataJson: z.string().describe('The bubble chart data, in JSON format. Each item has id, name, x, y, z values, vcr, and a color based on variable_cost_ratio.'),
  xAxisMetric: z.string().describe('The metric represented on the X-axis (e.g., "跟单保费").'),
  yAxisMetric: z.string().describe('The metric represented on the Y-axis (e.g., "满期赔付率").'),
  bubbleSizeMetric: z.string().describe('The metric represented by the bubble size (e.g., "保单数量").'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes VCR color rules and their business implications.')
});
export type GenerateBubbleChartAnalysisInput = z.infer<typeof GenerateBubbleChartAnalysisInputSchema>;

const GenerateBubbleChartAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the bubble chart in Chinese, using Markdown for emphasis. It should highlight outliers, clusters, and relationships, considering the VCR-based coloring implications and selected metrics.'),
});
export type GenerateBubbleChartAnalysisOutput = z.infer<typeof GenerateBubbleChartAnalysisOutputSchema>;

export async function generateBubbleChartAnalysis(input: GenerateBubbleChartAnalysisInput): Promise<GenerateBubbleChartAnalysisOutput> {
  return bubbleChartAnalysisFlow(input);
}

const bubbleChartAnalysisPrompt = ai.definePrompt({
  name: 'bubbleChartAnalysisPrompt',
  input: {schema: GenerateBubbleChartAnalysisInputSchema},
  output: {schema: GenerateBubbleChartAnalysisOutputSchema},
  prompt: `You are a data analyst specializing in car insurance business performance.
Analyze the provided bubble chart data for car insurance business lines.

**Chart Configuration:**
- X-axis: **{{{xAxisMetric}}}**
- Y-axis: **{{{yAxisMetric}}}**
- Bubble size: **{{{bubbleSizeMetric}}}**

**Context:**
- Analysis Mode: {{{analysisMode}}}
- Data Period: {{{currentPeriodLabel}}}
- Selected Business Types (if applicable in filters): {{filtersJson.selectedBusinessTypes}}
- Bubble Color Implication: Colors are dynamically determined by variable_cost_ratio (VCR). {{{filtersJson.vcrColorRules}}}
    - Green shades imply **good operational efficiency / lower risk**.
    - Blue shades imply **healthy operational efficiency / moderate risk**.
    - Red/Orange shades imply **poor operational efficiency / higher risk**.

**Chart Data (JSON):**
(Each item includes name, x, y, z values, vcr, and a 'color' field based on VCR)
{{{chartDataJson}}}

**Your Task:**
Provide a structured and concise analysis of this bubble chart in Chinese, using Markdown for emphasis (e.g., **bold text** for key elements). Organize your response with clear sections:

**1. 关键业务线表现解读 (Key Business Line Performance):**
   - Identify 2-3 notable business lines (e.g., largest bubbles, outliers, those in specific risk categories based on VCR).
   - For each, describe its position on the chart in terms of **{{{xAxisMetric}}}** and **{{{yAxisMetric}}}**, its size representing **{{{bubbleSizeMetric}}}**.
   - Directly state the business implication of its VCR (e.g., "**非营业客车新车** 的变动成本率**非常高**，显示其运营风险**较高**.").
   - Quantify key metrics for these lines (e.g., "跟单保费 **12460万元**", "案均赔款 **3990元**").

**2. 集群与分布特征 (Clusters & Distribution Patterns):**
   - Describe any visible clusters of business lines. What are their common characteristics regarding the three metrics and implied VCR risk levels?
   - Are there specific quadrants or areas of the chart that are more populated? What does this imply about overall business health or risk concentration?

**3. 指标间关系与权衡 (Metric Relationships & Trade-offs):**
   - What relationships or trade-offs can be observed between **{{{xAxisMetric}}}**, **{{{yAxisMetric}}}**, and **{{{bubbleSizeMetric}}}**?
   - How does the VCR (and its implied risk) relate to these metrics? For example, do business lines with **high {{{bubbleSizeMetric}}}** tend to have better/worse VCRs or specific X/Y positions?

**4. 潜在洞察与建议 (Potential Insights & Suggestions):**
   - Based on the chart, what are 1-2 **actionable insights** or areas for strategic focus?
   - For business lines identified as **high risk** (e.g., based on high VCR), suggest potential next steps for investigation.

**Important:**
- The analysis MUST be in Chinese.
- Use Markdown for emphasis on key terms, business line names, and significant figures (e.g., \`**重点业务**\`, \`**1234万元**\`).
- Ensure your interpretation is specific to the selected metrics ({{{xAxisMetric}}}, {{{yAxisMetric}}}, {{{bubbleSizeMetric}}}) and the business implications of VCR.
- Do not simply state the color of the bubble; explain what that color implies in terms of business performance or risk.
- Be concise and directly reference patterns in the chart data.

Analysis (in Chinese Markdown):`,
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

