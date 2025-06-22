
import { NextResponse, type NextRequest } from 'next/server';
import { 
  generateBusinessSummary, type GenerateBusinessSummaryInput,
  generateTrendAnalysis, type GenerateTrendAnalysisInput,
  generateBubbleChartAnalysis, type GenerateBubbleChartAnalysisInput,
  generateBarRankingAnalysis, type GenerateBarRankingAnalysisInput,
  generateShareChartAnalysis, type GenerateShareChartAnalysisInput,
  generateParetoAnalysis, type GenerateParetoAnalysisInput,
  generateChatResponse, type GenerateChatResponseInput
} from '@/ai/flows';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '@/lib/firebase';


interface AiProxyRequest {
  flowName: string;
  inputData: any;
}

// Fetches the master prompt from Firestore.
// Includes a fallback to a default prompt if Firestore is unavailable or the doc is missing.
async function getSystemInstruction(): Promise<string> {
  const { db } = getFirebaseInstances();
  const defaultInstruction = "You are a helpful AI assistant.";
  try {
    const docRef = doc(db, "ai_configs", "cursor_assistant_prompt");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data()?.prompt_text) {
      console.log("Successfully fetched AI instructions from Firestore.");
      return docSnap.data().prompt_text;
    } else {
      console.warn("AI instructions not found in Firestore (ai_configs/cursor_assistant_prompt), using default.");
      return defaultInstruction;
    }
  } catch (error) {
    console.error("Error fetching AI instructions from Firestore, using default:", error);
    return defaultInstruction;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Fetch the master system instruction first.
    const systemInstruction = await getSystemInstruction();
    
    const { flowName, inputData } = (await request.json()) as AiProxyRequest;
    
    // Inject the system instruction into the input data for the flow.
    const fullInputData = {
        ...inputData,
        system_instruction: systemInstruction
    };

    if (!flowName || !inputData) {
      return NextResponse.json(
        { error: 'Missing flowName or inputData in request body.' },
        { status: 400 }
      );
    }
    
    let result;
    switch (flowName) {
      case 'generateBusinessSummary':
        result = await generateBusinessSummary(fullInputData as GenerateBusinessSummaryInput);
        break;
      case 'generateTrendAnalysis':
        result = await generateTrendAnalysis(fullInputData as GenerateTrendAnalysisInput);
        break;
      case 'generateBubbleChartAnalysis':
        result = await generateBubbleChartAnalysis(fullInputData as GenerateBubbleChartAnalysisInput);
        break;
      case 'generateBarRankingAnalysis':
        result = await generateBarRankingAnalysis(fullInputData as GenerateBarRankingAnalysisInput);
        break;
      case 'generateShareChartAnalysis':
        result = await generateShareChartAnalysis(fullInputData as GenerateShareChartAnalysisInput);
        break;
      case 'generateParetoAnalysis':
        result = await generateParetoAnalysis(fullInputData as GenerateParetoAnalysisInput);
        break;
      case 'generateChatResponse':
        result = await generateChatResponse(fullInputData as GenerateChatResponseInput);
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
