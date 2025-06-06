
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
  chartDataJson: z.string().describe('The bar ranking chart data, in JSON format. Each item has a "name" (business line), a value for the ranked metric, and a "color" field based on variable_cost_ratio.'),
  rankedMetric: z.string().describe('The metric being ranked (e.g., premium_written, loss_ratio).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This now includes VCR color rules.')
});
export type GenerateBarRankingAnalysisInput = z.infer<typeof GenerateBarRankingAnalysisInputSchema>;

const GenerateBarRankingAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise analysis of the bar ranking chart, highlighting top/bottom performers and significant gaps in Chinese, considering the VCR-based coloring of bars.'),
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
Analyze the provided bar ranking chart data for car insurance business lines based on the metric: {{{rankedMetric}}}.
The color of each bar is dynamically determined by its variable_cost_ratio (VCR) to show performance:
- Green (Excellent): VCR < 88%. The lower the VCR, the deeper the green.
- Blue (Healthy): 88% <= VCR < 92%. The closer to 88%, the deeper the blue.
- Red (Risk): VCR >= 92%. The higher the VCR, the deeper the red.

The current analysis mode is: {{{analysisMode}}}.
The data is for period: {{{currentPeriodLabel}}}.
Applied filters (includes VCR color rules explanation): {{{filtersJson}}}
Chart Data (each item includes a 'color' field based on VCR):
{{{chartDataJson}}}

Based on this data, provide a concise analysis in Chinese. Focus on:
- Identifying the top 2-3 performing business lines and quantifying their performance, also noting their VCR-based color and what it implies.
- Identifying the bottom 2-3 performing business lines and quantifying their performance, also noting their VCR-based color and what it implies.
- Highlighting any significant gaps or disparities between business lines, considering their VCR colors.
- Providing potential insights or areas for investigation based on the ranking and VCR colors.
Keep the summary brief and actionable.`,
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
