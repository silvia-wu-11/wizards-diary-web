'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send } from 'lucide-react';
import { cn } from '@/app/components/UI';
import type { OldFriendContext, ChatMessage } from '@/app/types/ai-chat';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '好久不见，最近有什么想聊聊的吗？',
};

interface OldFriendChatDrawerProps {
  open: boolean;
  onClose: () => void;
  context: OldFriendContext;
}

function parseSSEChunk(line: string): string {
  if (line.startsWith('data: ')) {
    const data = line.slice(6);
    if (data === '[DONE]') return '';
    try {
      const json = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      return json.choices?.[0]?.delta?.content ?? '';
    } catch {
      return '';
    }
  }
  return '';
}

export function OldFriendChatDrawer({ open, onClose, context }: OldFriendChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [streamingContent, setStreamingContent] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const chatMessages = messages
        .filter((m) => m.role !== 'system')
        .concat(userMsg)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages, context }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? '请求失败');
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('流式响应不可用');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const content = parseSSEChunk(line);
          if (content) {
            fullContent += content;
            setStreamingContent(fullContent);
          }
        }
      }

      if (buffer) {
        const content = parseSSEChunk(buffer);
        if (content) {
          fullContent += content;
          setStreamingContent(fullContent);
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullContent || '（无回复）' }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `抱歉，出了点小问题：${err instanceof Error ? err.message : '请稍后再试'}`,
        },
      ]);
    } finally {
      setStreamingContent('');
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[91] w-full max-w-md bg-[#2c2420] border-l-2 border-faded-gold/40 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-faded-gold/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-faded-gold/20 flex items-center justify-center text-faded-gold text-xl">
                  ✦
                </div>
                <div>
                  <h2 className="font-['Cinzel'] font-bold text-faded-gold">老朋友</h2>
                  <p className="text-xs text-faded-gold/60">基于你的日记与你对话</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-faded-gold/10 text-faded-gold/80 hover:text-faded-gold transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 magic-scrollbar"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5',
                      m.role === 'user'
                        ? 'bg-faded-gold/20 text-faded-gold border border-faded-gold/30'
                        : 'bg-white/10 text-parchment-white border border-faded-gold/20'
                    )}
                  >
                    <p className="font-['Caveat'] text-lg whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-white/10 text-parchment-white border border-faded-gold/20">
                    <p className="font-['Caveat'] text-lg whitespace-pre-wrap">
                      {streamingContent}
                      <span className="inline-block w-2 h-4 ml-0.5 bg-faded-gold/80 animate-pulse" />
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-faded-gold/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="输入你想说的..."
                  className="flex-1 bg-white/10 border border-faded-gold/40 rounded-full py-2.5 pl-4 pr-4 outline-none focus:ring-2 focus:ring-faded-gold/50 text-faded-gold placeholder:text-faded-gold/40 font-['Caveat'] text-lg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-full bg-faded-gold/30 hover:bg-faded-gold/50 text-faded-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="发送"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
