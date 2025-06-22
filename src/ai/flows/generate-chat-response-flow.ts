
'use server';
/**
 * @fileOverview AI agent to handle natural language queries about car insurance business data.
 *
 * - generateChatResponse - Generates a response based on user query and data context.
 * - GenerateChatResponseInput - Input type.
 * - GenerateChatResponseOutput - Output type.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateChatResponseInputSchema = z.object({
  system_instruction: z.string().describe('The master system prompt for the AI assistant.'),
  userQuery: z.string().describe("The user's latest question in natural language."),
  conversationHistory: z.string().describe('The history of the conversation so far, in JSON format. Provides context for follow-up questions.'),
  dataContext: z.string().describe('A JSON string representing the complete data context from the dashboard. This is the AI\'s ONLY source of truth for answering questions.'),
});
export type GenerateChatResponseInput = z.infer<typeof GenerateChatResponseInputSchema>;

const GenerateChatResponseOutputSchema = z.object({
  response: z.string().describe('A helpful and factual response to the user\'s query, strictly based on the provided data context. The response should be in Chinese and use Markdown for formatting.'),
});
export type GenerateChatResponseOutput = z.infer<typeof GenerateChatResponseOutputSchema>;

export async function generateChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> {
  return chatResponseFlow(input);
}

const chatResponsePrompt = ai.definePrompt({
  name: 'chatResponsePrompt',
  input: { schema: GenerateChatResponseInputSchema },
  output: { schema: GenerateChatResponseOutputSchema },
  prompt: `{{{system_instruction}}}

您是一位专业、严谨的车险数据分析师。您的任务是根据下面提供的“当前数据上下文”来回答用户的问题。

**核心准则：**
1.  **忠于数据**: 您回答问题所使用的信息 **必须且只能** 来源于“当前数据上下文”中提供的JSON数据。**严禁** 使用任何外部知识或进行凭空猜测。
2.  **承认未知**: 如果用户的问题无法从“当前数据上下文”中找到答案，您必须**明确、坦诚地**告知用户：“根据当前提供的数据，我无法回答这个问题。”
3.  **理解上下文**: 请参考“对话历史”来理解用户可能提出的追问或模糊问题。
4.  **清晰表达**: 使用**中文**进行回答，关键数据和结论请使用 **Markdown 加粗** 格式，使回答清晰易读。

---

**当前数据上下文 (JSON格式):**
这是您回答问题唯一的事实依据。其中包含KPI指标、详细数据表、筛选条件等。
{{{dataContext}}}

---

**对话历史 (JSON格式):**
{{{conversationHistory}}}

---

**用户最新的问题是:**
"{{{userQuery}}}"

请基于以上信息，生成您的专业分析回答。`,
});

const chatResponseFlow = ai.defineFlow(
  {
    name: 'generateChatResponseFlow',
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: GenerateChatResponseOutputSchema,
  },
  async (input) => {
    const { output } = await chatResponsePrompt(input);
    return output!;
  }
);
