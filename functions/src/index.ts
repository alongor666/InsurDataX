
/**
 * @fileOverview Firebase Functions for AI proxy.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Dynamically import Genkit flows
// Only the overall business summary flow is needed now.
import { generateBusinessSummary, type GenerateBusinessSummaryInput } from '@/ai/flows/generate-business-summary';
// Removed imports for:
// generateTrendAnalysis, GenerateTrendAnalysisInput
// generateBubbleChartAnalysis, GenerateBubbleChartAnalysisInput
// generateBarRankingAnalysis, GenerateBarRankingAnalysisInput
// generateShareChartAnalysis, GenerateShareChartAnalysisInput
// generateParetoAnalysis, GenerateParetoAnalysisInput

// Configure CORS
const corsHandler = cors({ origin: true });

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
    corsHandler(request, response, async () => {
      if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed');
        return;
      }

      try {
        const { flowName, inputData } = request.body as AiProxyRequest;

        if (!flowName || !inputData) {
          response.status(400).send('Missing flowName or inputData in request body.');
          return;
        }
        
        console.log(`Proxying request for flow: ${flowName}`);

        let result;
        switch (flowName) {
          case 'generateBusinessSummary':
            result = await generateBusinessSummary(inputData as GenerateBusinessSummaryInput);
            break;
          // Cases for other flows (trend, bubble, etc.) have been removed
          default:
            response.status(400).send(`Unknown or unsupported flowName: ${flowName}`);
            return;
        }

        console.log(`Successfully processed flow: ${flowName}`);
        response.status(200).json(result);

      } catch (error) {
        console.error(`Error processing flow ${request.body?.flowName}:`, error);
        let errorMessage = 'An unexpected error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        response.status(500).json({ error: errorMessage, details: error });
      }
    });
  });

