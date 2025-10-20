import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { streamGeminiResponse } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

// Icons
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75zM12 18a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0112 18zM5.25 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM15 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM7.06 7.06a.75.75 0 011.06 0l2.122 2.121a.75.75 0 11-1.061 1.06L7.06 8.12a.75.75 0 010-1.06zM14.828 14.828a.75.75 0 011.06 0l2.122 2.121a.75.75 0 11-1.061 1.06l-2.121-2.12a.75.75 0 010-1.061zM7.06 16.94a.75.75 0 010-1.06l2.121-2.122a.75.75 0 011.061 1.061l-2.12 2.12a.75.75 0 01-1.061 0zM14.828 9.172a.75.75 0 010-1.06l2.121-2.122a.75.75 0 011.061 1.061l-2.12 2.12a.75.75 0 01-1.061 0z"/></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

const GeminiAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Hello! I'm your AI Betting Assistant. Ask me about your betting history, for number patterns, or for some strategies.", sender: 'ai' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !user) return;
        
        const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const aiMessageId = Date.now() + 1;
        setMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai' }]);

        await streamGeminiResponse(
            user,
            input,
            (chunk) => {
                setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId ? { ...msg, text: msg.text + chunk } : msg
                ));
            },
            (error) => {
                addNotification(`Assistant Error: ${error.message}`, 'error');
                setMessages(prev => prev.filter(msg => msg.id !== aiMessageId)); // Remove empty AI message on error
                setIsLoading(false);
            },
            () => {
                setIsLoading(false);
            }
        );
    };

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-40 h-16 w-16 bg-gradient-to-br from-accent-blue via-accent-violet to-accent-orange rounded-full text-white flex items-center justify-center shadow-lg animate-pulse-glow transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-primary"
                aria-label="Open AI Assistant"
            >
                <SparklesIcon />
            </button>

            {/* Modal */}
            {isOpen && (
                <div 
                    className={`fixed bottom-4 right-4 z-50 w-full max-w-md bg-bg-secondary/90 backdrop-blur-lg rounded-xl shadow-glow-hard border border-border-highlight flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                    style={{ height: '70vh', maxHeight: '600px' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border-color">
                        <h3 className="text-lg font-bold bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">AI Betting Assistant</h3>
                        <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white">
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-sm rounded-lg px-4 py-2 ${msg.sender === 'user' ? 'bg-gradient-to-r from-accent-blue to-accent-violet text-white' : 'bg-bg-primary'}`}>
                                    {msg.text === '' && msg.sender === 'ai' ? (
                                        <div className="flex items-center space-x-1 py-2">
                                            <div className="h-2 w-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="h-2 w-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="h-2 w-2 bg-text-secondary rounded-full animate-bounce"></div>
                                        </div>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-border-color">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask me anything..."
                                disabled={isLoading}
                                className="w-full bg-bg-primary border border-border-color rounded-full py-3 pl-4 pr-14 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                            />
                            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-accent-violet text-white disabled:bg-border-color disabled:text-text-secondary disabled:opacity-50 transition-colors">
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GeminiAssistant;