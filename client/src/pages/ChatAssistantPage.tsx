import React, { useState, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, MessageSquare, Plus, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../types';

const QUICK_QUERIES = [
  "Show me all users who accessed loan systems after 10 PM this week",
  "Who shares access patterns with flagged user EMP-4421?",
  "Generate a summary of Rajan Mehta's activity over the last 7 days",
  "What are the top 3 red flags I should investigate first today?",
  "Draft a summary of the fraud ring involving the Treasury department",
];

export default function ChatAssistantPage() {
  const { apiFetch } = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; time: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, conversationId }),
      });

      if (!conversationId) {
        setConversationId(result.conversationId);
        setConversations(prev => [{ id: result.conversationId, title: msg.slice(0, 40) + '...', time: new Date().toLocaleTimeString() }, ...prev]);
      }

      const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: result.reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = { id: `e-${Date.now()}`, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)] flex gap-4">
      {/* Sidebar */}
      <div className="w-64 bg-navy-800 border border-navy-700 rounded-xl flex flex-col">
        <div className="p-4 border-b border-navy-700">
          <button onClick={newConversation} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-900 border border-navy-700 rounded-lg text-sm text-gray-300 hover:border-mint/30 hover:text-mint transition-all">
            <Plus size={16} /> New Investigation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 && <p className="text-xs text-gray-600 text-center py-8">No conversations yet</p>}
          {conversations.map(c => (
            <button key={c.id} className="w-full text-left p-2.5 rounded-lg hover:bg-navy-900 transition-colors group">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-gray-600 flex-shrink-0" />
                <p className="text-xs text-gray-400 truncate">{c.title}</p>
              </div>
              <p className="text-[10px] text-gray-600 mt-1 pl-6">{c.time}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-navy-800 border border-navy-700 rounded-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint/20 to-mint/5 flex items-center justify-center">
            <Bot size={18} className="text-mint" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">SurakshaAI Investigation Assistant</h2>
            <p className="text-[10px] text-gray-500">Powered by Google Gemini • Context-aware fraud analysis</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mint/10 to-mint/5 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-mint" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">How can I help investigate?</h3>
              <p className="text-sm text-gray-500 max-w-md mb-6">Ask me about suspicious activities, employee behavior patterns, risk assessments, or investigation procedures.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-mint/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} className="text-mint" />
                </div>
              )}
              <div className={`max-w-[70%] ${msg.role === 'user' ? 'bg-mint/10 border border-mint/20' : 'bg-navy-900 border border-navy-700'} rounded-xl px-4 py-3`}>
                {msg.role === 'assistant' ? (
                  <div className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-mint [&_code]:bg-navy-800 [&_code]:px-1 [&_code]:rounded [&_strong]:text-white">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-white">{msg.content}</p>
                )}
                <p className="text-[9px] text-gray-600 mt-2 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={14} className="text-gray-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-mint/10 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-mint" />
              </div>
              <div className="bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-mint/50 rounded-full" style={{ animation: 'typing 1.4s ease-in-out infinite' }} />
                <span className="w-2 h-2 bg-mint/50 rounded-full" style={{ animation: 'typing 1.4s ease-in-out 0.2s infinite' }} />
                <span className="w-2 h-2 bg-mint/50 rounded-full" style={{ animation: 'typing 1.4s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick Queries */}
        {messages.length === 0 && (
          <div className="px-6 pb-2">
            <div className="flex flex-wrap gap-2">
              {QUICK_QUERIES.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} className="text-[11px] px-3 py-1.5 bg-navy-900 border border-navy-700 rounded-full text-gray-400 hover:border-mint/30 hover:text-mint transition-all">
                  {q.length > 50 ? q.slice(0, 50) + '...' : q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-navy-700">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about suspicious activities, employees, or investigation steps..."
              className="flex-1 bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mint/40 transition-all placeholder:text-gray-600"
              disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="w-10 h-10 rounded-xl bg-gradient-to-r from-mint to-mint-dark flex items-center justify-center text-navy-950 disabled:opacity-30 hover:shadow-lg hover:shadow-mint/20 transition-all">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
