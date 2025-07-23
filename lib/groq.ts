
import Groq from 'groq-sdk';
import prisma from './prisma';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// --- Type Definitions ---
interface Tool {
    [key: string]: (args: any) => Promise<string>;
}

interface CheckDateArgs {
    date: string;
}

interface CalculateCostArgs {
    guest_count: number;
    wedding_type: string;
}

// A map to associate tool names with their actual functions
const tools: Tool = {
    check_date_availability: checkDateAvailability,
    calculate_booking_cost: calculateBookingCost,
};

/**
 * The main function to interact with the Groq AI.
 * It sends the chat history and a list of available tools to the AI.
 * @param {ChatCompletionMessageParam[]} messages - The history of the conversation.
 * @returns {Promise<Groq.Chat.Completions.ChatCompletion>} - The AI's response object.
 */
export async function getGroqChatCompletion(messages: ChatCompletionMessageParam[]) {
    return groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages,
        tools: [
            // Tool definition for checking date availability
            {
                type: 'function',
                function: {
                    name: 'check_date_availability',
                    description: 'Check if a specific date is available for a wedding booking. The date must be in YYYY-MM-DD format.',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: {
                                type: 'string',
                                description: 'The date to check for availability, e.g., 2025-12-25',
                            },
                        },
                        required: ['date'],
                    },
                },
            },
            // Tool definition for calculating booking cost
            {
                type: 'function',
                function: {
                    name: 'calculate_booking_cost',
                    description: 'Calculates the estimated cost of a wedding booking.',
                    parameters: {
                        type: 'object',
                        properties: {
                            guest_count: {
                                type: 'number',
                                description: 'The total number of guests attending the wedding.',
                            },
                            wedding_type: {
                                type: 'string',
                                enum: ['Hindu', 'Muslim', 'Christian', 'Other'],
                                description: 'The type of wedding ceremony.',
                            },
                        },
                        required: ['guest_count', 'wedding_type'],
                    },
                },
            },
        ],
        tool_choice: 'auto',
    });
}

/**
 * A tool function to check date availability in the database.
 * @param {CheckDateArgs} args - The arguments for the function.
 * @returns {Promise<string>} - A JSON string indicating if the date is available or not.
 */
async function checkDateAvailability({ date }: CheckDateArgs): Promise<string> {
    // Basic validation to prevent invalid date errors
    if (isNaN(new Date(date).getTime())) {
        return JSON.stringify({ error: 'Invalid date format provided.' });
    }

    try {
        const availableDate = await prisma.availableDate.findUnique({
            where: { date: new Date(date) },
        });

        if (availableDate) {
            return JSON.stringify({
                is_available: true,
                message: `Great news! The date ${date} is available for booking.`,
            });
        } else {
            return JSON.stringify({
                is_available: false,
                message: `Unfortunately, the date ${date} is not available. Please try another date.`,
            });
        }
    } catch (error) {
        console.error('Error checking date:', error);
        return JSON.stringify({ error: 'Failed to check date availability.' });
    }
}

/**
 * A tool function to calculate the booking cost based on guest count and wedding type.
 * @param {CalculateCostArgs} args - The arguments for the function.
 * @returns {Promise<string>} - A JSON string with the estimated cost.
 */
async function calculateBookingCost({ guest_count, wedding_type }: CalculateCostArgs): Promise<string> {
    let base_cost_per_guest = 150; // Base cost in USD
    let type_multiplier = 1.0;

    switch (wedding_type.toLowerCase()) {
        case 'hindu': type_multiplier = 1.2; break;
        case 'muslim': type_multiplier = 1.1; break;
        case 'christian': type_multiplier = 1.0; break;
        default: type_multiplier = 1.0;
    }

    const estimated_cost = guest_count * base_cost_per_guest * type_multiplier;

    return JSON.stringify({
        guest_count,
        wedding_type,
        estimated_cost: `$${estimated_cost.toFixed(2)}`,
        message: `The estimated cost for a ${wedding_type} wedding with ${guest_count} guests is $${estimated_cost.toFixed(2)}.`,
    });
}

/**
 * Executes a tool call based on the AI's decision.
 * @param {Groq.Chat.Completions.ChatCompletionMessage.ToolCall} toolCall - The tool call object from the AI response.
 * @returns {Promise<ChatCompletionMessageParam>} - The result of the tool execution, formatted as a message.
 */
export async function executeTool(toolCall: Groq.Chat.Completions.ChatCompletionMessage.ToolCall): Promise<ChatCompletionMessageParam> {
    const functionName = toolCall.function.name;
    const functionToCall = tools[functionName];
    const functionArgs = JSON.parse(toolCall.function.arguments);

    const functionResponse = await functionToCall(functionArgs);

    return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: functionResponse,
    };
}