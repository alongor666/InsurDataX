
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-business-summary.ts';
import '@/ai/flows/generate-trend-analysis-flow.ts';
import '@/ai/flows/generate-bubble-chart-analysis-flow.ts';
import '@/ai/flows/generate-bar-ranking-analysis-flow.ts';
// import '@/ai/flows/generate-share-chart-analysis-flow.ts'; // TODO: Create and uncomment
import '@/ai/flows/generate-pareto-analysis-flow.ts'; // New
