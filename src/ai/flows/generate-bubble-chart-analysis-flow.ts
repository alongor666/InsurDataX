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
  chartDataJson: z.string().describe('The bubble chart data, in JSON format. Each item has id, name, x, y, z values.'),
  xAxisMetric: z.string().describe('The metric represented on the X-axis (e.g., "跟单保费").'),
  yAxisMetric: z.string().describe('The metric represented on the Y-axis (e.g., "满期赔付率").'),
  bubbleSizeMetric: z.string().describe('The metric represented by the bubble size (e.g., "保单数量").'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第22周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format.')
});
export type GenerateBubbleChartAnalysisInput = z.infer<typeof GenerateBubbleChartAnalysisInputSchema>;

const GenerateBubbleChartAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise analysis of the bubble chart, highlighting outliers, clusters, and relationships between metrics for different business lines in Chinese.'),
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
X-axis represents: {{{xAxisMetric}}}
Y-axis represents: {{{yAxisMetric}}}
Bubble size represents: {{{bubbleSizeMetric}}}
The current analysis mode is: {{{analysisMode}}}.
The data is for period: {{{currentPeriodLabel}}}.
Applied filters: {{{filtersJson}}}
Chart Data:
{{{chartDataJson}}}

Based on this data, provide a concise analysis in Chinese. Focus on:
- Identifying any outlier business lines and explaining their characteristics based on the three metrics.
- Describing any clusters of business lines and their common traits.
- Highlighting key relationships or trade-offs observed between the X-axis, Y-axis, and bubble size metrics.
- Providing potential insights relevant to the car insurance business based on these observations.
Keep the summary brief and actionable.`,
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
