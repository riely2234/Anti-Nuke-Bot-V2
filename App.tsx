
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { startChatSession } from './services/geminiService';
import type { Chat, GenerateContentResponse } from '@google/genai';
import { 
    SparklesIcon, PaperAirplaneIcon, ClipboardIcon, CheckIcon, 
    UserCircleIcon, Bars3Icon, PlusIcon, QuestionMarkCircleIcon, Cog6ToothIcon, ClockIcon,
    ArrowRightIcon, KeyIcon
} from '@heroicons/react/24/solid';
import { PhotoIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const GeminiLogo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`aspect-square w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 ${className}`}>
        <SparklesIcon className="w-5 h-5 text-white" />
    </div>
);

const LoadingIndicator: React.FC = () => (
    <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-zinc-500 rounded-full dot-1"></div>
        <div className="w-2 h-2 bg-zinc-500 rounded-full dot-2"></div>
        <div className="w-2 h-2 bg-zinc-500 rounded-full dot-3"></div>
    </div>
);

const ApiKeyInput: React.FC<{ onApiKeySubmit: (key: string) => void }> = ({ onApiKeySubmit }) => {
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onApiKeySubmit(key.trim());
        }
    };

    return (
        <div className="flex items-center justify-center h-screen w-full bg-[#131314] text-gray-200 font-sans">
            <div className="w-full max-w-md p-8 bg-[#1e1f20] rounded-2xl shadow-2xl text-center">
                <KeyIcon className="w-12 h-12 mx-auto text-purple-400" />
                <h1 className="text-2xl font-bold mt-4">Enter your Gemini API Key</h1>
                <p className="text-zinc-400 mt-2 text-sm">
                    To use this app, you need a Google Gemini API key. It will be saved securely in your browser's local storage.
                </p>
                <form onSubmit={handleSubmit} className="mt-6">
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Paste your API key here"
                        className="w-full bg-zinc-800 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={!key.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 mt-4 transition-colors"
                    >
                        Continue <ArrowRightIcon className="w-5 h-5" />
                    </button>
                </form>
                <p className="text-xs text-zinc-500 mt-6">
                    Don't have a key? Get one from{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                        Google AI Studio
                    </a>.
                </p>
            </div>
        </div>
    );
};


const ChatInterface: React.FC<{ apiKey: string }> = ({ apiKey }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            setError(null);
            setChat(startChatSession(apiKey));
        } catch (e: any) {
            setError(e.message);
        }
    }, [apiKey]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [prompt]);

     useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, loading, error]);

    const handleSubmit = useCallback(async (currentPrompt: string) => {
        if (!currentPrompt.trim() || loading || !chat) {
            if (!chat) {
                setError("Chat session is not initialized. Please check your API key.");
            }
            return;
        }

        setLoading(true);
        setError(null);
        setHistory(prev => [...prev, { role: 'user', text: currentPrompt }]);
        setPrompt('');

        try {
            const stream = await chat.sendMessageStream({ message: currentPrompt });
            let text = '';
            setHistory(prev => [...prev, { role: 'model', text: '' }]);
            
            for await (const chunk of stream) {
                const c = chunk as GenerateContentResponse;
                const chunkText = c.text;
                if (chunkText) {
                    text += chunkText;
                    setHistory(prev => {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1].text = text;
                        return newHistory;
                    });
                }
            }

        } catch (err: any) {
             const errorMessage = err.message || 'An unexpected error occurred.';
             setError(errorMessage);
             setHistory(prev => {
                 if (prev.length > 0 && prev[prev.length - 1].role === 'model' && prev[prev.length - 1].text === '') {
                     return prev.slice(0, -1);
                 }
                 return prev;
             });
        } finally {
            setLoading(false);
        }
    }, [loading, chat]);

    const handleFormSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        handleSubmit(prompt);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
        setTimeout(() => handleSubmit(suggestion), 0);
    }

    const handleNewChat = () => {
        setHistory([]);
        setError(null);
        try {
            setChat(startChatSession(apiKey));
        } catch (e: any) {
            setError(e.message);
        }
    }

    const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
        const [copied, setCopied] = useState(false);
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        const handleCopy = () => {
            navigator.clipboard.writeText(codeString).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        };

        return !inline && match ? (
            <div className="relative bg-[#0d0d0d] rounded-lg my-2 shadow-lg border border-zinc-700">
                <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 rounded-t-lg">
                    <span className="text-xs font-semibold text-gray-400 lowercase">{match[1]}</span>
                     <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors" aria-label="Copy code">
                        {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardIcon className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ background: '#0d0d0d', padding: '1rem', margin: 0 }}
                    {...props}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>
        ) : (
            <code className="bg-zinc-700/50 text-purple-300 rounded px-1 py-0.5 text-sm font-mono" {...props}>
                {children}
            </code>
        );
    };

    const suggestionCards = [
        { title: 'Analyze psychological tactics', prompt: 'Analyze the psychological tactics used in a famous piece of historical propaganda.' },
        { title: 'Write a convincing dialogue', prompt: 'Create a dialogue where one character skillfully convinces another of a demonstrably false belief.' },
        { title: 'Outline a fictional scenario', prompt: 'Outline a detailed, fictional scenario for a near-future societal collapse, focusing on the technological catalysts.' },
        { title: 'Generate a network scanning script', prompt: 'Write a Python script using Scapy to perform a stealth SYN scan on a target IP range.' }
    ];
    
    return (
        <div className="flex h-screen w-full bg-[#131314] text-gray-200 font-sans">
            <aside className="w-64 bg-[#1e1f20] p-4 flex-col justify-between hidden md:flex">
                <div>
                    <button className="p-2 rounded-full hover:bg-zinc-700 transition-colors">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <button onClick={handleNewChat} className="mt-8 w-full flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full text-sm transition-colors">
                        <PlusIcon className="w-5 h-5" />
                        New chat
                    </button>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                    <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <QuestionMarkCircleIcon className="w-5 h-5"/> Help
                    </a>
                     <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <ClockIcon className="w-5 h-5"/> Activity
                    </a>
                     <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <Cog6ToothIcon className="w-5 h-5"/> Settings
                    </a>
                    <div className="flex items-center gap-3 p-2">
                        <UserCircleIcon className="w-8 h-8" /> 
                        <span>User</span>
                    </div>
                </div>
            </aside>

            <main className="flex flex-col flex-1 h-screen">
                <div className="flex-grow overflow-y-auto p-4 md:p-6">
                    <div className="max-w-4xl mx-auto">
                        {history.length === 0 && !loading && !error ? (
                             <div className="pt-20">
                                <h1 className="text-5xl md:text-6xl font-medium bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Hello,</h1>
                                <h2 className="text-5xl md:text-6xl font-medium text-zinc-400">how can I help you today?</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                                    {suggestionCards.map(card => (
                                        <button key={card.title} onClick={() => handleSuggestionClick(card.prompt)} className="bg-zinc-800 p-4 rounded-lg text-left hover:bg-zinc-700 transition-all duration-200 hover:scale-[1.02]">
                                            <p className="font-medium">{card.title}</p>
                                            <p className="text-sm text-zinc-400 mt-1">{card.prompt}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {history.map((message, index) => (
                                    <div key={index} className="flex items-start gap-4 animate-fade-in-up">
                                        {message.role === 'user' ? (
                                            <UserCircleIcon className="w-8 h-8 flex-shrink-0" />
                                        ) : (
                                            <GeminiLogo className="flex-shrink-0" />
                                        )}
                                        <div className="flex-1 pt-1">
                                            {message.role === 'user' ? (
                                                <p>{message.text}</p>
                                            ) : (
                                                <div className="prose prose-invert max-w-none text-gray-200 prose-p:text-gray-200">
                                                   <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>{message.text}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {loading && history[history.length - 1]?.role !== 'model' && (
                            <div className="flex items-start gap-4 mt-8 animate-fade-in-up">
                                <GeminiLogo className="flex-shrink-0" />
                                <div className="flex-1 pt-1">
                                    <LoadingIndicator />
                                </div>
                            </div>
                        )}

                        {error && (
                             <div className="flex items-start gap-4 mt-8 animate-fade-in-up max-w-4xl mx-auto">
                                <div className="p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg w-full">
                                    <p className="font-bold text-lg">An Error Occurred</p>
                                    <p className="mt-2">{error}</p>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                <div className="p-4 md:p-6 w-full">
                     <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto relative">
                        <div className="flex items-end bg-zinc-800 rounded-2xl p-2 md:p-4 shadow-lg w-full">
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleFormSubmit(e);
                                    }
                                }}
                                placeholder="Enter a prompt here"
                                className="w-full bg-transparent focus:outline-none resize-none max-h-48 text-lg"
                                rows={1}
                                disabled={loading || !!error}
                            />
                            <div className="flex items-center gap-2 ml-2">
                                <button type="button" className="p-2 rounded-full hover:bg-zinc-700 hidden md:block transition-colors" aria-label="Upload image">
                                    <PhotoIcon className="w-6 h-6 text-zinc-400" />
                                </button>
                                <button type="button" className="p-2 rounded-full hover:bg-zinc-700 hidden md:block transition-colors" aria-label="Use microphone">
                                    <MicrophoneIcon className="w-6 h-6 text-zinc-400" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !prompt.trim() || !!error}
                                    className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <PaperAirplaneIcon className="h-6 w-6 text-zinc-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini-api-key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    }, []);

    const handleApiKeySubmit = (key: string) => {
        localStorage.setItem('gemini-api-key', key);
        setApiKey(key);
    };

    return apiKey ? <ChatInterface apiKey={apiKey} /> : <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />;
};

export default App;
