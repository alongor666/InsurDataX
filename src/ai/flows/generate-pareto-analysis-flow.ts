
'use server';
/**
 * @fileOverview AI agent to analyze Pareto chart data for car insurance business.
 *
 * - generateParetoAnalysis - Generates analysis for Pareto chart data.
 * - GenerateParetoAnalysisInput - Input type.
 * - GenerateParetoAnalysisOutput - Output type.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Input Schema for Pareto Analysis
const GenerateParetoAnalysisInputSchema = z.object({
  chartDataJson: z.string().describe('The Pareto chart data, in JSON format. Each item has "name" (business line), "value" for the ranked metric, "cumulativePercentage", and a "color" field based on variable_cost_ratio (VCR).'),
  analyzedMetric: z.string().describe('The metric being analyzed in the Pareto chart (e.g., premium_written, total_loss_amount).'),
  analysisMode: z.string().describe('The analysis mode (e.g., cumulative, periodOverPeriod).'),
  currentPeriodLabel: z.string().describe('The label for the current data period (e.g., "2025年第23周").'),
  filtersJson: z.string().describe('Additional filters applied, like selected business types, in JSON format. This includes VCR color rules and their business implications.')
});
export type GenerateParetoAnalysisInput = z.infer<typeof GenerateParetoAnalysisInputSchema>;

// Define Output Schema for Pareto Analysis
const GenerateParetoAnalysisOutputSchema = z.object({
  summary: z.string().describe('A structured and concise analysis of the Pareto chart in Chinese, using Markdown for emphasis. It should highlight key contributors (the "vital few" typically contributing to 80% of the total), their VCR implications, and any significant observations from the "trivial many".'),
});
export type GenerateParetoAnalysisOutput = z.infer<typeof GenerateParetoAnalysisOutputSchema>;

// Exported function to be called by the application
export async function generateParetoAnalysis(input: GenerateParetoAnalysisInput): Promise<GenerateParetoAnalysisOutput> {
  return paretoAnalysisFlow(input);
}

// Define the Prompt for Pareto Analysis
const paretoAnalysisPrompt = ai.definePrompt({
  name: 'paretoAnalysisPrompt',
  input: {schema: GenerateParetoAnalysisInputSchema},
  output: {schema: GenerateParetoAnalysisOutputSchema},
  prompt: `You are a data analyst specializing in car insurance business performance, with expertise in Pareto analysis (80/20 rule).
Analyze the provided Pareto chart data for car insurance business lines based on the metric: **{{{analyzedMetric}}}**.

**Context:**
- Analysis Mode: {{{analysisMode}}}
- Data Period: {{{currentPeriodLabel}}}
- Selected Business Types (if applicable in filters): {{filtersJson.selectedBusinessTypes}}
- Bar Color Implication (VCR): Colors are dynamically determined by variable_cost_ratio (VCR). {{{filtersJson.vcrColorRules}}}
    - Green shades imply **good operational efficiency / lower risk**.
    - Blue shades imply **healthy operational efficiency / moderate risk**.
    - Red/Orange shades imply **poor operational efficiency / higher risk**.

**Chart Data (JSON):**
(Each item includes name, value for the analyzed metric, cumulativePercentage, and a 'color' field based on VCR. Data is sorted by 'value' descending.)
{{{chartDataJson}}}

**Your Task:**
Provide a structured and concise analysis of this Pareto chart in Chinese, using Markdown for emphasis (e.g., **bold text** for key elements). Organize your response with clear sections:

**1. 核心贡献业务线 (关键少数 - The Vital Few):**
   - Identify the top business lines that contribute to approximately **80%** of the total **{{{analyzedMetric}}}** (refer to \`cumulativePercentage\`).
   - List these "vital few" business lines. For each, state its value for **{{{analyzedMetric}}}**, its individual percentage contribution (if easily calculable or implied), and its VCR-based color and the business implication (e.g., "**非营业客车旧车非过户** 贡献了 **XXX万元** 的保费, 占总额的 **YY%**, 其VCR表现为**健康(蓝色)**.").
   - Summarize the collective contribution of this group.

**2. 其余业务线概览 (次要多数 - The Trivial Many):**
   - Briefly comment on the remaining business lines that contribute the other ~20%.
   - Are there any notable VCR colors or patterns among this group?

**3. 帕累托分析洞察 (Pareto Insights):**
   - Based on the 80/20 distribution for **{{{analyzedMetric}}}** and the VCR colors of the key contributors, what are the primary insights?
   - For example, are the top contributors also the most operationally efficient (green/blue VCR)? Or are there high-volume, high-risk (red VCR) contributors?

**4. 战略建议方向 (Strategic Implications):**
   - Based on your analysis, suggest 1-2 strategic considerations. For instance, should efforts be focused on optimizing the "vital few," or are there opportunities in the "trivial many" that are currently highly efficient?

**Important:**
- The analysis MUST be in Chinese.
- Focus specifically on the Pareto distribution for **{{{analyzedMetric}}}**.
- Clearly link VCR color implications to the business lines identified.
- Use Markdown for emphasis on key terms, business line names, and significant figures.
- Be concise and directly reference patterns in the chart data.

Analysis (in Chinese Markdown):`,
});

// Define the Flow for Pareto Analysis
const paretoAnalysisFlow = ai.defineFlow(
  {
    name: 'paretoAnalysisFlow',
    inputSchema: GenerateParetoAnalysisInputSchema,
    outputSchema: GenerateParetoAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await paretoAnalysisPrompt(input);
    // In a real scenario, you might add more logic here before or after the prompt call.
    return output!;
  }
);
