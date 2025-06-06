
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
  data: z.string().describe('The data to analyze, in JSON format. This includes keyPerformanceIndicators (KPIs) and topBusinessLinesByPremiumWritten.'),
  filters: z.string().describe('The filters applied to the data, in JSON format. This includes analysisMode, period, selectedBusinessTypes, and vcrColorRules.'),
});
export type GenerateBusinessSummaryInput = z.infer<typeof GenerateBusinessSummaryInputSchema>;

const GenerateBusinessSummaryOutputSchema = z.object({
  summary: z.string().describe('A structured and concise summary of business performance highlights, potential risks, and actionable insights, in Chinese. The summary should be tailored to the provided data and filters.'),
});
export type GenerateBusinessSummaryOutput = z.infer<typeof GenerateBusinessSummaryOutputSchema>;

export async function generateBusinessSummary(input: GenerateBusinessSummaryInput): Promise<GenerateBusinessSummaryOutput> {
  return generateBusinessSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBusinessSummaryPrompt',
  input: {schema: GenerateBusinessSummaryInputSchema},
  output: {schema: GenerateBusinessSummaryOutputSchema},
  prompt: `You are a top-tier data analyst and a leading expert in car insurance operations.
Based on the provided data and filters, generate a concise, structured business performance summary in Chinese.

**Context:**
- Analysis Mode: {{filters.analysisMode}}
- Data Period: {{filters.period}}
- Selected Business Types: {{filters.selectedBusinessTypes}}
- VCR Color Rules: {{filters.vcrColorRules}}

**Data Provided (JSON):**
Key Performance Indicators (KPIs) and Top Business Lines by Premium Written:
{{{data}}}

**Your Task:**
Produce a summary with the following structure:

**一、核心指标解读 (Key Metric Insights):**
   - Analyze key KPIs from the provided data.
   - Highlight significant positive or negative trends based on MoM/YoY changes.
   - Note any KPIs indicating risk (e.g., high loss_ratio, high variable_cost_ratio).

**二、主要业务线表现 (Key Business Line Performance):**
   - If top business lines data is available, comment on their premium_written, loss_ratio, and variable_cost_ratio.
   - Mention their VCR-based color and what it implies (e.g., "非营业客车新车 (红色, 风险较高)")

**三、主要亮点与机遇 (Key Highlights & Opportunities):**
   - Identify 2-3 key positive achievements or potential opportunities based on the data.

**四、潜在风险与关注点 (Potential Risks & Concerns):**
   - Identify 2-3 potential risks or areas needing attention.

**五、初步建议 (Initial Recommendations - Optional & Brief):**
   - If obvious, provide 1-2 very brief, actionable insights or suggestions.

**Important Considerations:**
- The summary MUST be in Chinese.
- Be concise and to the point.
- Ensure your analysis directly reflects the provided 'data' and 'filters'.
- If 'selectedBusinessTypes' indicates a specific focus, tailor your analysis accordingly.
- Refer to the VCR color implications when discussing business lines or relevant KPIs.

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

