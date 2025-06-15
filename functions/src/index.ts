
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

// Dynamically import Genkit flows from the local 'ai/flows' directory
import { generateBusinessSummary, type GenerateBusinessSummaryInput } from './ai/flows/generate-business-summary';
import { generateTrendAnalysis, type GenerateTrendAnalysisInput } from './ai/flows/generate-trend-analysis-flow';
import { generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput } from './ai/flows/generate-bubble-chart-analysis-flow';
import { generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput } from './ai/flows/generate-bar-ranking-analysis-flow';
import { generateShareChartAnalysis, type GenerateShareChartAnalysisInput } from './ai/flows/generate-share-chart-analysis-flow';
import { generateParetoAnalysis, type GenerateParetoAnalysisInput } from './ai/flows/generate-pareto-analysis-flow';


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
