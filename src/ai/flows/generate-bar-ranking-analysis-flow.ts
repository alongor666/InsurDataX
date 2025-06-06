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
  chartDataJson: z.string().describe('The bar ranking chart data, in JSON format. Each item has a "name" (business line) and a value for the ranked metric.'),
  rankedMetric: z.string().describe('The metric being ranked (e.g., premium_written, loss_ratio).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format.')
});
export type GenerateBarRankingAnalysisInput = z.infer<typeof GenerateBarRankingAnalysisInputSchema>;

const GenerateBarRankingAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise analysis of the bar ranking chart, highlighting top/bottom performers and significant gaps in Chinese.'),
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
The current analysis mode is: {{{analysisMode}}}.
The data is for period: {{{currentPeriodLabel}}}.
Applied filters: {{{filtersJson}}}
Chart Data:
{{{chartDataJson}}}

Based on this data, provide a concise analysis in Chinese. Focus on:
- Identifying the top 2-3 performing business lines and quantifying their performance.
- Identifying the bottom 2-3 performing business lines and quantifying their performance.
- Highlighting any significant gaps or disparities between business lines.
- Providing potential insights or areas for investigation based on the ranking.
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
