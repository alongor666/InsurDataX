"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInsuranceStats = exports.generateAiSummaryProxy = void 0;
console.log('[Cloud Functions] Loading generateAiSummaryProxy function module...'); // Diagnostic log
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
    console.log('[Cloud Functions] Firebase Admin SDK initialized.');
}
// Dynamically import Genkit flows from the local 'ai/flows' directory
const generate_business_summary_1 = require("./ai/flows/generate-business-summary");
const generate_trend_analysis_flow_1 = require("./ai/flows/generate-trend-analysis-flow");
const generate_bubble_chart_analysis_flow_1 = require("./ai/flows/generate-bubble-chart-analysis-flow");
const generate_bar_ranking_analysis_flow_1 = require("./ai/flows/generate-bar-ranking-analysis-flow");
const generate_share_chart_analysis_flow_1 = require("./ai/flows/generate-share-chart-analysis-flow");
const generate_pareto_analysis_flow_1 = require("./ai/flows/generate-pareto-analysis-flow");
console.log('[Cloud Functions] AI flows imported.');
// Configure CORS
const corsHandler = (0, cors_1.default)({ origin: true });
console.log('[Cloud Functions] CORS handler configured.');
exports.generateAiSummaryProxy = functions
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
            const { flowName, inputData } = request.body;
            if (!flowName || !inputData) {
                console.error('[Cloud Functions] generateAiSummaryProxy: Missing flowName or inputData.');
                response.status(400).send('Missing flowName or inputData in request body.');
                return;
            }
            console.log(`[Cloud Functions] generateAiSummaryProxy: Processing flow: ${flowName}`);
            let result;
            switch (flowName) {
                case 'generateBusinessSummary':
                    result = await (0, generate_business_summary_1.generateBusinessSummary)(inputData);
                    break;
                case 'generateTrendAnalysis':
                    result = await (0, generate_trend_analysis_flow_1.generateTrendAnalysis)(inputData);
                    break;
                case 'generateBubbleChartAnalysis':
                    result = await (0, generate_bubble_chart_analysis_flow_1.generateBubbleChartAnalysis)(inputData);
                    break;
                case 'generateBarRankingAnalysis':
                    result = await (0, generate_bar_ranking_analysis_flow_1.generateBarRankingAnalysis)(inputData);
                    break;
                case 'generateShareChartAnalysis':
                    result = await (0, generate_share_chart_analysis_flow_1.generateShareChartAnalysis)(inputData);
                    break;
                case 'generateParetoAnalysis':
                    result = await (0, generate_pareto_analysis_flow_1.generateParetoAnalysis)(inputData);
                    break;
                default:
                    console.error(`[Cloud Functions] generateAiSummaryProxy: Unknown flowName: ${flowName}`);
                    response.status(400).send(`Unknown or unsupported flowName: ${flowName}`);
                    return;
            }
            console.log(`[Cloud Functions] generateAiSummaryProxy: Successfully processed flow: ${flowName}`);
            response.status(200).json(result);
        }
        catch (error) {
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
// functions/src/index.ts
// ... (其他已有的导入和导出，请保留它们)
// Import and export your new function
var getInsuranceStats_1 = require("./getInsuranceStats");
Object.defineProperty(exports, "getInsuranceStats", { enumerable: true, get: function () { return getInsuranceStats_1.getInsuranceStats; } });
//# sourceMappingURL=index.js.map