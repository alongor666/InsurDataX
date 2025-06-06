
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
  chartDataJson: z.string().describe('The bar ranking chart data, in JSON format. Each item has a "name" (business line), a value for the ranked metric, vcr, and a "color" field based on variable_cost_ratio.'),
  rankedMetric: z.string().describe('The metric being ranked (e.g., premium_written, loss_ratio).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes VCR color rules.')
});
export type GenerateBarRankingAnalysisInput = z.infer<typeof GenerateBarRankingAnalysisInputSchema>;

const GenerateBarRankingAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the bar ranking chart in Chinese. It should highlight top/bottom performers, significant gaps, and consider the VCR-based coloring of bars and the selected metric.'),
});
export type GenerateBarRankingAnalysisOutput = z.infer<typeof GenerateBarRankingAnalysisOutputSchema>;

export async function generateBarRankingAnalysis(input: GenerateBarRankingAnalysisInput): Promise<GenerateBarRankingAnalysisOutput> {
  return barRankingAnalysisFlow(input);
}

const barRankingAnalysisPrompt = ai.definePrompt({
  name: 'barRankingAnalysisPrompt',
  input: {schema: GenerateBarRankingAnalysisInputSchema},
  output: {schema: GenerateBarRankingAnalysisOutputSchema},
  prompt: `You are a data analyst specializing in car insurance business performance.
Analyze the provided bar ranking chart data for car insurance business lines based on the metric: **{{{rankedMetric}}}**.

**Context:**
- Analysis Mode: {{{analysisMode}}}
- Data Period: {{{currentPeriodLabel}}}
- Selected Business Types (if applicable in filters): {{filtersJson.selectedBusinessTypes}}
- Bar Color Logic: Colors are dynamically determined by variable_cost_ratio (VCR). {{{filtersJson.vcrColorRules}}}

**Chart Data (JSON):**
(Each item includes name, value for the ranked metric, vcr, and a 'color' field based on VCR)
{{{chartDataJson}}}

**Your Task:**
Provide a structured and concise analysis of this bar ranking chart in Chinese. Organize your response with clear sections:

**1. 头部梯队表现 (Top Performers):**
   - Identify the top 2-3 business lines for **{{{rankedMetric}}}**.
   - Quantify their performance (state their value for **{{{rankedMetric}}}**).
   - Note their VCR-based color and what it implies about their operational efficiency (e.g., "业务线A排名第一，指标值为X，呈绿色(优秀)").

**2. 尾部梯队表现 (Bottom Performers):**
   - Identify the bottom 2-3 business lines for **{{{rankedMetric}}}**.
   - Quantify their performance.
   - Note their VCR-based color and its implication.

**3. 主要差距与分布 (Key Gaps & Distribution):**
   - Highlight any significant performance gaps between the top, middle, and bottom business lines for **{{{rankedMetric}}}**.
   - Comment on the distribution of VCR colors across the ranking. Are high-ranking performers generally a specific color?

**4. 潜在洞察与建议 (Potential Insights & Suggestions):**
   - Based on the ranking for **{{{rankedMetric}}}** and the VCR colors, what are 1-2 potential insights or areas for further investigation?

**Important:**
- The analysis MUST be in Chinese.
- Focus specifically on the **{{{rankedMetric}}}**.
- Be concise and directly reference the data patterns and VCR color implications.

Analysis (in Chinese):`,
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

