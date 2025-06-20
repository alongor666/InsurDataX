
console.log('[Cloud Functions] Loading generateAiSummaryProxy function module...'); // Diagnostic log

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
  console.log('[Cloud Functions] Firebase Admin SDK initialized.');
}

// Dynamically import Genkit flows from the local 'ai/flows' directory
import { generateBusinessSummary, type GenerateBusinessSummaryInput } from './ai/flows/generate-business-summary';
import { generateTrendAnalysis, type GenerateTrendAnalysisInput } from './ai/flows/generate-trend-analysis-flow';
import { generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput } from './ai/flows/generate-bubble-chart-analysis-flow';
import { generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput } from './ai/flows/generate-bar-ranking-analysis-flow';
import { generateShareChartAnalysis, type GenerateShareChartAnalysisInput } from './ai/flows/generate-share-chart-analysis-flow';
import { generateParetoAnalysis, type GenerateParetoAnalysisInput } from './ai/flows/generate-pareto-analysis-flow';

console.log('[Cloud Functions] AI flows imported.');

// Configure CORS
const corsHandler = cors({ origin: true });
console.log('[Cloud Functions] CORS handler configured.');

interface AiProxyRequest {
  flowName: string;
  inputData: any;
}

export const generateAiSummaryProxy = functions
  .region('us-central1') 
  .runWith({
    timeoutSeconds: 300, 
    memory: '1GB',      
  })
  .https.onRequest(async (request, response) => {
    console.log(`[Cloud Functions] generateAiSummaryProxy: Received request for flow: ${request.body?.flowName}`);
    corsHandler(request, response, async () => {
      if (request.method !== 'POST') {
        console.warn(`[Cloud Functions] generateAiSummaryProxy: Method Not Allowed - ${request.method}`);
        response.status(405).send('Method Not Allowed');
        return;
      }

      try {
        const { flowName, inputData } = request.body as AiProxyRequest;

        if (!flowName || !inputData) {
          console.error('[Cloud Functions] generateAiSummaryProxy: Missing flowName or inputData.');
          response.status(400).send('Missing flowName or inputData in request body.');
          return;
        }
        
        console.log(`[Cloud Functions] generateAiSummaryProxy: Processing flow: ${flowName}`);

        let result;
        switch (flowName) {
          case 'generateBusinessSummary':
            result = await generateBusinessSummary(inputData as GenerateBusinessSummaryInput);
            break;
          case 'generateTrendAnalysis':
            result = await generateTrendAnalysis(inputData as GenerateTrendAnalysisInput);
            break;
          case 'generateBubbleChartAnalysis':
            result = await generateBubbleChartAnalysis(inputData as GenerateBubbleChartAnalysisInput);
            break;
          case 'generateBarRankingAnalysis':
            result = await generateBarRankingAnalysis(inputData as GenerateBarRankingAnalysisInput);
            break;
          case 'generateShareChartAnalysis':
            result = await generateShareChartAnalysis(inputData as GenerateShareChartAnalysisInput);
            break;
          case 'generateParetoAnalysis':
            result = await generateParetoAnalysis(inputData as GenerateParetoAnalysisInput);
            break;
          default:
            console.error(`[Cloud Functions] generateAiSummaryProxy: Unknown flowName: ${flowName}`);
            response.status(400).send(`Unknown or unsupported flowName: ${flowName}`);
            return;
        }

        console.log(`[Cloud Functions] generateAiSummaryProxy: Successfully processed flow: ${flowName}`);
        response.status(200).json(result);

      } catch (error) {
        console.error(`[Cloud Functions] generateAiSummaryProxy: Error processing flow ${request.body?.flowName}:`, error);
        let errorMessage = 'An unexpected error occurred during AI processing.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        // It's good practice to not send detailed internal errors to the client in production.
        // However, for debugging, this can be more informative.
        response.status(500).json({ error: `AI Service Error: ${errorMessage}`, details: String(error) });
      }
    });
  });

console.log('[Cloud Functions] generateAiSummaryProxy function defined.');

// Import and export your new function
export { getInsuranceStats } from './getInsuranceStats';
