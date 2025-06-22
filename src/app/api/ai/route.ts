
import { NextResponse, type NextRequest } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '@/lib/firebase';
import { 
  getBusinessSummaryPrompt,
  getTrendAnalysisPrompt,
  getBubbleChartAnalysisPrompt,
  getBarRankingAnalysisPrompt,
  getShareChartAnalysisPrompt,
  getParetoAnalysisPrompt,
  getChatResponsePrompt
} from '@/ai/prompts';


// IMPORTANT: Replace this with your deployed Cloudflare Worker URL
const OPENROUTER_PROXY_URL = 'https://your-proxy-worker.your-domain.workers.dev';

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

async function callProxy(prompt: string) {
  if (OPENROUTER_PROXY_URL.includes('your-proxy-worker')) {
    throw new Error('OpenRouter Proxy URL is not configured. Please deploy the Cloudflare worker and update the URL in src/app/api/ai/route.ts');
  }

  const response = await fetch(OPENROUTER_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Proxy Error:', errorText);
    throw new Error(`AI Proxy service failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  if (!result.choices || !result.choices[0] || !result.choices[0].message) {
    console.error('Invalid response structure from proxy:', result);
    throw new Error('AI service returned an unexpected response structure.');
  }
  return result.choices[0].message.content;
}

export async function POST(request: NextRequest) {
  try {
    const systemInstruction = await getSystemInstruction();
    const { flowName, inputData } = (await request.json()) as AiProxyRequest;

    if (!flowName || !inputData) {
      return NextResponse.json(
        { error: 'Missing flowName or inputData in request body.' },
        { status: 400 }
      );
    }

    let finalPrompt;
    let isChatFlow = false;
    
    switch (flowName) {
      case 'generateBusinessSummary':
        finalPrompt = getBusinessSummaryPrompt(inputData, systemInstruction);
        break;
      case 'generateTrendAnalysis':
        finalPrompt = getTrendAnalysisPrompt(inputData, systemInstruction);
        break;
      case 'generateBubbleChartAnalysis':
        finalPrompt = getBubbleChartAnalysisPrompt(inputData, systemInstruction);
        break;
      case 'generateBarRankingAnalysis':
        finalPrompt = getBarRankingAnalysisPrompt(inputData, systemInstruction);
        break;
      case 'generateShareChartAnalysis':
        finalPrompt = getShareChartAnalysisPrompt(inputData, systemInstruction);
        break;
      case 'generateParetoAnalysis':
        finalPrompt = getParetoAnalysisPrompt(inputData, systemInstruction);
        break;
      case 'generateChatResponse':
        finalPrompt = getChatResponsePrompt(inputData, systemInstruction);
        isChatFlow = true;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown or unsupported flowName: ${flowName}` },
          { status: 400 }
        );
    }
    
    const aiContent = await callProxy(finalPrompt);

    const result = isChatFlow ? { response: aiContent } : { summary: aiContent };

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
