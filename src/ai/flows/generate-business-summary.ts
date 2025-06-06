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
  data: z.string().describe('The data to analyze, in JSON format.'),
  filters: z.string().describe('The filters applied to the data, in JSON format.'),
});
export type GenerateBusinessSummaryInput = z.infer<typeof GenerateBusinessSummaryInputSchema>;

const GenerateBusinessSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of business performance highlights and potential risks.'),
});
export type GenerateBusinessSummaryOutput = z.infer<typeof GenerateBusinessSummaryOutputSchema>;

export async function generateBusinessSummary(input: GenerateBusinessSummaryInput): Promise<GenerateBusinessSummaryOutput> {
  return generateBusinessSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBusinessSummaryPrompt',
  input: {schema: GenerateBusinessSummaryInputSchema},
  output: {schema: GenerateBusinessSummaryOutputSchema},
  prompt: `You are a top-tier data analyst and a leading expert in car insurance operations. Based on the provided data and filters, generate a concise business performance summary in Chinese, highlighting key achievements, potential risks, and actionable insights specifically relevant to the car insurance industry.

Data: {{{data}}}
Filters: {{{filters}}}

Summary (in Chinese):`,
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
