import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Plus, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { getUser } from '../lib/auth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { AIConversation, AIMessage } from '../types'

const QUICK_PROMPTS = [
  "Help me prep today's standup",
  "How is my execution this week?",
  "I'm falling behind on my goals",
  "Help me do an end-of-day reflection",
  "What habits am I struggling with?",
  "Generate a weekly check-in",
]

function MessageBubble({ msg }: { msg: AIMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? 'bg-brand-600 text-white rounded-tr-sm'
          : 'bg-surface-800 text-surface-200 rounded-tl-sm border border-surface-700'
      }`}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  )
}

export default function AICoachPage() {
  const me = getUser()
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [activeConvo, setActiveConvo] = useState<AIConversation | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadConversations() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadConversations() {
    const { data } = await api.get('/ai/conversations').catch(() => ({ data: [] }))
    setConversations(data)
    if (data.length > 0 && !activeConvo) {
      selectConversation(data[0])
    }
  }

  async function selectConversation(convo: AIConversation) {
    setActiveConvo(convo)
    const { data } = await api.get(`/ai/conversations/${convo.id}/messages`)
    setMessages(data)
  }

  async function newConversation() {
    const { data } = await api.post('/ai/conversations', { title: `Chat ${new Date().toLocaleDateString()}` })
    setConversations(prev => [data, ...prev])
    setActiveConvo(data)
    setMessages([{
      id: 'welcome',
      conversation_id: data.id,
      user_id: me?.id,
      role: 'assistant',
      content: `Hey ${me?.name?.split(' ')[0]}. I'm your AI Coach. I have access to your goals, habits, and execution data.\n\nWhat do you need help with? Be direct — no fluff.`,
      created_at: new Date().toISOString(),
    } as any])
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || !activeConvo) return
    setInput('')
    setLoading(true)

    const userMsg: AIMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: activeConvo.id,
      user_id: me?.id || '',
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const { data } = await api.post('/ai/chat', { conversationId: activeConvo.id, message: msg })
      const assistantMsg: AIMessage = {
        id: data.messageId,
        conversation_id: activeConvo.id,
        user_id: me?.id || '',
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), userMsg, assistantMsg])
    } catch {
      setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), userMsg, {
        id: 'err',
        conversation_id: activeConvo.id,
        user_id: '',
        role: 'assistant',
        content: 'Connection error. Try again.',
        created_at: new Date().toISOString(),
      }])
    }
    setLoading(false)
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-60 bg-surface-900 border-r border-surface-800 flex flex-col">
        <div className="p-4 border-b border-surface-800">
          <Button className="w-full justify-center" size="sm" onClick={newConversation}>
            <Plus size={14} /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                activeConvo?.id === c.id ? 'bg-brand-600/20 text-brand-300' : 'text-surface-400 hover:bg-surface-800 hover:text-white'
              }`}
            >
              <Bot size={14} className="flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {!activeConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">AI Life Coach</h2>
            <p className="text-surface-400 mb-6 max-w-sm">Your data-driven accountability partner. I see your goals, habits, and scores. Let's work.</p>
            <Button size="lg" onClick={newConversation}>Start Coaching Session</Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-surface-800 flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-semibold">AI Coach</div>
                <div className="text-surface-500 text-xs">Has access to your goals, habits & scores</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-surface-500 py-8">
                  <p>Start the conversation. What do you need?</p>
                </div>
              )}
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-surface-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-surface-700">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length === 0 && (
              <div className="px-4 pb-2">
                <div className="text-surface-500 text-xs mb-2">Quick start:</div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map(p => (
                    <button key={p} onClick={() => sendMessage(p)}
                      className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-full text-xs text-surface-300 hover:text-white transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-surface-800">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Talk to your coach..."
                  className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 text-sm"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-12 h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-xl flex items-center justify-center transition-all"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
