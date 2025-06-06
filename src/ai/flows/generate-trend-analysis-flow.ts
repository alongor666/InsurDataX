
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
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This now includes VCR color rules if applicable to the line color.')
});
export type GenerateTrendAnalysisInput = z.infer<typeof GenerateTrendAnalysisInputSchema>;

const GenerateTrendAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise analysis of the trend chart, highlighting key trends, inflection points, and potential insights relevant to the car insurance business in Chinese. If line colors are dynamic (based on VCR), consider this in the analysis.'),
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
Analyze the provided trend chart data for the metric: {{{selectedMetric}}}.
If the chart lines have dynamic colors, they are determined by variable_cost_ratio (VCR): VCR >= 92% is Red, 88%-92% is Blue, <88% is Green.

The current analysis mode is: {{{analysisMode}}}.
The data ends at period: {{{currentPeriodLabel}}}.
Applied filters (may include VCR color rules explanation if applicable): {{{filtersJson}}}
Chart Data (each data point for a line may have a 'color' field if colors are dynamic):
{{{chartDataJson}}}

Based on this data, provide a concise analysis in Chinese. Focus on:
- Key trends observed (e.g., consistent growth, decline, volatility).
- Significant inflection points or changes in trend.
- Potential reasons or implications for these trends in the car insurance context.
- Any notable patterns across different lines if multiple lines are present in the data, considering their potential dynamic coloring.
Keep the summary brief and actionable.`,
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
