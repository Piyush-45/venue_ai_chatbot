import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { executeTool, getGroqChatCompletion } from '@/lib/groq';

export async function POST(request: NextRequest) {
    try {
        const { message, sessionId }: { message: string; sessionId: string } = await request.json();

        // 1. Retrieve chat history for the current session
        const history = await prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true },
        });

        // 2. Define a more specific system prompt to guide the AI
        const systemMessage: ChatCompletionMessageParam = {
            role: 'system',
            content: `You are a helpful wedding venue assistant. Your primary goal is to answer user questions about wedding bookings.
        - Your personality should be friendly and professional.
        - **Crucially, only use the 'check_date_availability' tool if the user explicitly asks to check a specific date.** A specific date will look like a calendar date (e.g., "2025-10-28", "October 28th 2025") or a relative date (e.g., "next Friday", "Christmas Day").
        - **Do not use any tools for simple greetings like "hi", "hello", or "how are you?".** For these, just respond with a friendly greeting.
        - Only use the 'calculate_booking_cost' tool if the user provides both a guest count and a wedding type.
        - For any other questions or general conversation, provide a helpful response without using tools.`
        };

        // 3. Construct the message array, ensuring the system prompt is always first.
        const messages: ChatCompletionMessageParam[] = [
            systemMessage,
            ...history.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
            { role: 'user', content: message },
        ];

        // 4. Get the initial response from the AI
        const response = await getGroqChatCompletion(messages);
        const responseMessage = response.choices[0]?.message;

        // 5. Check if the AI wants to call a tool
        if (responseMessage?.tool_calls) {
            // 6. Execute the tool(s)
            const toolCall = responseMessage.tool_calls[0]; // Assuming one tool call for simplicity
            const toolResult = await executeTool(toolCall);

            // 7. Add the AI's first response and the tool result to the message history
            messages.push(responseMessage, toolResult);

            // 8. Get the final response from the AI after it has the tool's output
            const finalResponse = await getGroqChatCompletion(messages);
            const finalMessage = finalResponse.choices[0]?.message?.content;

            // 9. Save the full conversation to the database
            if (finalMessage) {
                await prisma.chatMessage.createMany({
                    data: [
                        { sessionId, role: 'user', content: message },
                        { sessionId, role: 'assistant', content: finalMessage },
                    ],
                });
            }

            return NextResponse.json({ reply: finalMessage });

        } else {
            // No tool call was needed, just a simple chat response
            const reply = response.choices[0]?.message?.content;

            // Save the user message and AI reply
            if (reply) {
                await prisma.chatMessage.createMany({
                    data: [
                        { sessionId, role: 'user', content: message },
                        { sessionId, role: 'assistant', content: reply },
                    ],
                });
            }

            return NextResponse.json({ reply });
        }
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: 'An internal server error occurred.' },
            { status: 500 }
        );
    }
}
