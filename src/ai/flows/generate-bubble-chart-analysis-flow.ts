
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
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes VCR color rules.')
});
export type GenerateBubbleChartAnalysisInput = z.infer<typeof GenerateBubbleChartAnalysisInputSchema>;

const GenerateBubbleChartAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the bubble chart in Chinese. It should highlight outliers, clusters, and relationships, considering the VCR-based coloring and selected metrics.'),
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
- Bubble Color Logic: Colors are dynamically determined by variable_cost_ratio (VCR). {{{filtersJson.vcrColorRules}}}

**Chart Data (JSON):**
(Each item includes name, x, y, z values, vcr, and a 'color' field based on VCR)
{{{chartDataJson}}}

**Your Task:**
Provide a structured and concise analysis of this bubble chart in Chinese. Organize your response with clear sections:

**1. 关键业务线表现解读 (Key Business Line Performance):**
   - Identify 2-3 notable business lines (e.g., largest bubbles, outliers, those in specific VCR color categories).
   - For each, describe its position on the chart in terms of **{{{xAxisMetric}}}** and **{{{yAxisMetric}}}**, its size representing **{{{bubbleSizeMetric}}}**, and its VCR-indicated color (e.g., "业务线A位于X高Y低区域，规模较大，呈绿色(优秀)").

**2. 集群与分布特征 (Clusters & Distribution Patterns):**
   - Describe any visible clusters of business lines. What are their common characteristics regarding the three metrics and VCR colors?
   - Are there specific quadrants or areas of the chart that are more populated? What does this imply?

**3. 指标间关系与权衡 (Metric Relationships & Trade-offs):**
   - What relationships or trade-offs can be observed between **{{{xAxisMetric}}}**, **{{{yAxisMetric}}}**, and **{{{bubbleSizeMetric}}}**?
   - How does the VCR (indicated by color) relate to these metrics? For example, do larger bubbles (higher **{{{bubbleSizeMetric}}}**) tend to have better/worse VCRs or specific X/Y positions?

**4. 潜在洞察与建议 (Potential Insights & Suggestions):**
   - Based on the chart, what are 1-2 potential insights or areas for strategic focus for the car insurance business?

**Important:**
- The analysis MUST be in Chinese.
- Ensure your interpretation is specific to the selected metrics ({{{xAxisMetric}}}, {{{yAxisMetric}}}, {{{bubbleSizeMetric}}}) and the VCR color implications.
- Be concise and directly reference patterns in the chart data.

Analysis (in Chinese):`,
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

