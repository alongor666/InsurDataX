
'use server';
/**
 * @fileOverview AI agent to analyze trend chart data for car insurance business.
 *
 * - generateTrendAnalysis - Generates analysis for trend data.
 * - GenerateTrendAnalysisInput - Input type.
 * - GenerateTrendAnalysisOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTrendAnalysisInputSchema = z.object({
  chartDataJson: z.string().describe('The trend chart data, in JSON format. Each item typically has a "name" (period label) and keys for different business lines or a total, with their values for the selected metric. Each data point for a line may also include a "color" field based on variable_cost_ratio.'),
  selectedMetric: z.string().describe('The primary metric being trended (e.g., premium_written, loss_ratio).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the most recent period in the trend (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes VCR color rules if applicable to the line color.')
});
export type GenerateTrendAnalysisInput = z.infer<typeof GenerateTrendAnalysisInputSchema>;

const GenerateTrendAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the trend chart in Chinese. It should highlight key trends, inflection points, and potential insights relevant to the car insurance business, considering the selected metric, analysis mode, and VCR-based line colors.'),
});
export type GenerateTrendAnalysisOutput = z.infer<typeof GenerateTrendAnalysisOutputSchema>;

export async function generateTrendAnalysis(input: GenerateTrendAnalysisInput): Promise<GenerateTrendAnalysisOutput> {
  return trendAnalysisFlow(input);
}

const trendAnalysisPrompt = ai.definePrompt({
  name: 'trendAnalysisPrompt',
  input: {schema: GenerateTrendAnalysisInputSchema},
  output: {schema: GenerateTrendAnalysisOutputSchema},
  prompt: `You are a data analyst specializing in car insurance business performance.
Analyze the provided trend chart data for the metric: **{{{selectedMetric}}}**.

**Context:**
- Analysis Mode: {{{analysisMode}}}
- Data ends at period: {{{currentPeriodLabel}}}
- Selected Business Types (if applicable in filters): {{filtersJson.selectedBusinessTypes}}
- Line Color Logic: Colors are dynamically determined by variable_cost_ratio (VCR). {{{filtersJson.vcrColorRules}}}

**Chart Data (JSON):**
(Each data point for a line may have a 'color' field reflecting its VCR at that point)
{{{chartDataJson}}}

**Your Task:**
Provide a structured and concise analysis of this trend chart in Chinese. Organize your response with clear sections:

**1. 整体趋势解读 (Overall Trend Interpretation):**
   - Describe the main trend(s) for **{{{selectedMetric}}}** over the displayed periods. (e.g., consistent growth, decline, volatility, stability).
   - If multiple lines are present (e.g., different business types or '合计'), compare their general trends.

**2. 关键节点与变化 (Key Inflection Points & Changes):**
   - Identify any significant turning points, sharp increases/decreases, or changes in the trend direction.
   - Note the approximate period when these changes occurred.

**3. 颜色与绩效关联 (Color & Performance Correlation - if applicable):**
   - Comment on how the VCR-based line colors change over time for the trend(s).
   - Does a shift in color (e.g., from blue to red) correlate with a change in the trend of **{{{selectedMetric}}}**? Explain.

**4. 潜在洞察与建议 (Potential Insights & Suggestions):**
   - Based on the trend, and considering the VCR implications from line colors, what are 1-2 potential insights or areas for further investigation for the car insurance business?

**Important:**
- The analysis MUST be in Chinese.
- Focus specifically on the **{{{selectedMetric}}}**.
- Be concise and directly reference the data patterns and color implications.
- If the chart shows a single aggregated trend, focus on that. If it compares multiple lines, address both individual and comparative aspects.

Analysis (in Chinese):`,
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

