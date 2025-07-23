"use client";

import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send } from 'lucide-react';

// Define the structure of a message
interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Generate a unique session ID when the component mounts
    useEffect(() => {
        setSessionId(crypto.randomUUID());
    }, []);

    // Scroll to the bottom of the chat window when new messages are added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !sessionId) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, sessionId }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', content: data.reply };
            setMessages((prev) => [...prev, assistantMessage]);

        } catch (error) {
            console.error('Failed to fetch chat reply:', error);
            const errorMessage: Message = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[85vh] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex flex-col gap-4">
                    {/* Initial welcome message */}
                    {messages.length === 0 && (
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
                            Hello! How can I help you with your wedding plans today? Feel free to ask about dates or pricing.
                        </div>
                    )}
                    {/* Render all messages */}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {/* Show loading indicator */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 text-gray-800 rounded-2xl px-4 py-2">
                                <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                    {/* Dummy div to scroll to */}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about available dates, e.g., 'Is 2025-12-25 available?'"
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}