import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { Bot, Sparkles, Send, User, CornerDownLeft, Loader2, HelpCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AIAssistantChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "Hello Col. Nair! I am the SmartGate AI Facility & Operations Assistant. I monitor real-time gate traffic, security anomalies, predictive maintenance, and billing telemetry for Greenwood Heights. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const samplePrompts = [
    "Give me an executive summary of today's security and visitors",
    "Show maintenance collection percentage and defaulters",
    "Check elevator and generator predictive maintenance health",
    "Are there any active security anomalies or overstays?",
  ];

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.queryAIAssistant(q);
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: `Unable to connect with AI model: ${err.message || 'Check connection'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-neutral-900 to-indigo-950 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              SmartGate AI Admin Assistant
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                GEMINI 3.8 FLASH
              </span>
            </h3>
            <span className="text-[11px] text-neutral-300">Live operational telemetry & conversational queries</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
              m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-neutral-900 text-indigo-400'
            }`}>
              {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            <div className={`max-w-[80%] rounded-2xl p-3.5 leading-relaxed ${
              m.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-xs'
                : 'bg-neutral-50 text-neutral-800 border border-neutral-200/80 rounded-tl-xs whitespace-pre-line'
            }`}>
              {m.text}
              <div className={`text-[10px] mt-1 font-mono ${m.sender === 'user' ? 'text-indigo-200 text-right' : 'text-neutral-400'}`}>
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 p-3 rounded-xl border border-neutral-200 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Analyzing real-time society telemetry...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50/70">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-neutral-200 bg-white">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything about society operations, visitors, bills, or complaints..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            id="btn-send-ai-query"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};
