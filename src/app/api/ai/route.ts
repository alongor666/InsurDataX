
import { NextResponse, type NextRequest } from 'next/server';
import { 
  generateBusinessSummary, type GenerateBusinessSummaryInput,
  generateTrendAnalysis, type GenerateTrendAnalysisInput,
  generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput,
  generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput,
  generateShareChartAnalysis, type GenerateShareChartAnalysisInput,
  generateParetoAnalysis, type GenerateParetoAnalysisInput
} from '@/ai/flows';

// Ensure all flows are exported from a central index file in the flows directory
// This is a new file we'll create: src/ai/flows/index.ts

interface AiProxyRequest {
  flowName: string;
  inputData: any;
}

export async function POST(request: NextRequest) {
  try {
    const { flowName, inputData } = (await request.json()) as AiProxyRequest;

    if (!flowName || !inputData) {
      return NextResponse.json(
        { error: 'Missing flowName or inputData in request body.' },
        { status: 400 }
      );
    }
    
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
        return NextResponse.json(
          { error: `Unknown or unsupported flowName: ${flowName}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error(`[API Route Error] Error processing flow:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json(
      { error: `AI Service Error: ${errorMessage}`, details: String(error) },
      { status: 500 }
    );
  }
}
