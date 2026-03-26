"use client";

import { useRef } from "react";

import { cn } from "@/app/components/UI";
import type { ChatMessage, OldFriendContext } from "@/app/types/ai-chat";
import { Send, SmilePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";

/**
 * 初始欢迎消息：作为 AI（CHUM）的开场白
 */
const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "好久不见，最近有什么想聊聊的吗？",
};

interface OldFriendChatDrawerProps {
  open: boolean;
  onClose: () => void;
  context: OldFriendContext;
}

/**
 * 解析 SSE 数据行，提取 delta.content、delta.reasoning_content 或注入的 response_id
 * @param line - SSE 格式的一行数据（如 "data: {...}"）
 * @returns 提取的文本内容与状态
 */
function parseSSEChunk(line: string): {
  content: string;
  reasoning: string;
  isDone: boolean;
  id?: string;
} {
  if (line.startsWith("data: ")) {
    const data = line.slice(6);
    if (data === "[DONE]") return { content: "", reasoning: "", isDone: true };
    try {
      const json = JSON.parse(data) as Record<string, unknown>;
      if ((json as { type?: string }).type === "response_id") {
        return {
          id: (json as { id?: string }).id,
          content: "",
          reasoning: "",
          isDone: false,
        };
      }
      const responseId = (json as { response?: { id?: string } }).response?.id;
      if (responseId) {
        return { id: responseId, content: "", reasoning: "", isDone: false };
      }
      if ((json as { type?: string }).type === "response.output_text.delta") {
        return {
          content: (json as { delta?: string }).delta ?? "",
          reasoning: "",
          isDone: false,
        };
      }
      const choices = (
        json as {
          choices?: Array<{
            delta?: { content?: string; reasoning_content?: string };
          }>;
        }
      ).choices;
      return {
        content: choices?.[0]?.delta?.content ?? "",
        reasoning: choices?.[0]?.delta?.reasoning_content ?? "",
        isDone: false,
      };
    } catch {
      const contentMatch = data.match(/"content"\s*:\s*"([^"]*)/);
      const reasoningMatch = data.match(/"reasoning_content"\s*:\s*"([^"]*)/);
      return {
        content: contentMatch?.[1] ?? "",
        reasoning: reasoningMatch?.[1] ?? "",
        isDone: false,
      };
    }
  }
  return { content: "", reasoning: "", isDone: false };
}

/**
 * CHUM 聊天抽屉组件
 * 支持展开/收起动画、消息列表展示、输入发送、流式响应解析
 */
export function OldFriendChatDrawer({
  open,
  onClose,
  context,
}: OldFriendChatDrawerProps) {
  const STREAM_FLUSH_INTERVAL_MS = 40;
  const STREAM_METRICS_KEY = "oldFriendStreamMetrics";
  const DRAWER_WIDTH_KEY = "oldFriendDrawerWidth";
  const MIN_DRAWER_WIDTH = 320;
  const MAX_DRAWER_WIDTH = 800;
  /** 对话消息列表，包含 user 和 assistant 角色的消息 */
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  /** 流式响应内容：正在接收的 AI 回复（逐字更新） */
  const [streamingContent, setStreamingContent] = useState("");
  /** 初始化流式内容：抽屉打开时的固定问候 + 模型回复 */
  const [initStreamingContent, setInitStreamingContent] = useState("");
  /** 用户输入框内容 */
  const [input, setInput] = useState("");
  /** 是否正在等待 AI 回复 */
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(448);
  /** 当前 Session 的 response_id，用于多轮对话串联 */
  const [responseId, setResponseId] = useState<string | null>(null);
  const responseIdRef = useRef<string | null>(null);
  const initRequestStartedRef = useRef(false);
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  /** Session 是否已初始化（已发送过带 instructions 的初始化请求） */
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  /** 消息列表滚动容器引用，用于自动滚动到底部 */
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * 监听消息变化，自动滚动到底部
   * 依赖 messages 和 streamingContent，确保流式输出时也能实时滚动
   */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingContent]);

  /**
   * 抽屉打开时，禁止背景页面滚动
   */
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  /**
   * 抽屉关闭时重置 Session
   */
  useEffect(() => {
    if (!open) {
      setResponseId(null);
      setIsSessionInitialized(false);
      setMessages([INITIAL_MESSAGE]);
      setInitStreamingContent("");
      responseIdRef.current = null;
      initRequestStartedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    let storedWidth: number | null = null;
    try {
      const raw = localStorage.getItem(DRAWER_WIDTH_KEY);
      if (raw) storedWidth = Number(raw);
    } catch {}
    const baseWidth =
      storedWidth && Number.isFinite(storedWidth) ? storedWidth : 448;
    const maxWidth = Math.min(MAX_DRAWER_WIDTH, window.innerWidth);
    const clampedWidth = Math.max(
      MIN_DRAWER_WIDTH,
      Math.min(maxWidth, baseWidth),
    );
    setDrawerWidth(clampedWidth);
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const handleWindowResize = () => {
      setDrawerWidth((prev) => Math.min(prev, window.innerWidth));
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(DRAWER_WIDTH_KEY, String(drawerWidth));
    } catch {}
  }, [drawerWidth, isMounted]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizingRef.current) return;
      const delta = resizeStartXRef.current - event.clientX;
      const nextWidth = resizeStartWidthRef.current + delta;
      const maxWidth = Math.min(MAX_DRAWER_WIDTH, window.innerWidth);
      const clampedWidth = Math.max(
        MIN_DRAWER_WIDTH,
        Math.min(maxWidth, nextWidth),
      );
      setDrawerWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [MAX_DRAWER_WIDTH, MIN_DRAWER_WIDTH]);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isResizingRef.current = true;
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = drawerWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  /**
   * 抽屉打开时，立即发起初始化请求建立 Session 缓存
   */
  useEffect(() => {
    if (!open || isSessionInitialized || initRequestStartedRef.current) return;
    initRequestStartedRef.current = true;

    const initSession = async () => {
      setInitStreamingContent(INITIAL_MESSAGE.content);
      const limitedContext = context
        ? { ...context, entries: context.entries.slice(0, 20) }
        : context;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: INITIAL_MESSAGE.content,
            context: limitedContext,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = (data as { detail?: string }).detail;
          if (detail) {
            try {
              const parsed = JSON.parse(detail);
              console.error(
                "[OldFriendChat] Session 初始化 API 错误详情:",
                parsed,
              );
            } catch {
              console.error(
                "[OldFriendChat] Session 初始化 API 错误详情:",
                detail,
              );
            }
          }
          setIsSessionInitialized(true);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setIsSessionInitialized(true);
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = INITIAL_MESSAGE.content;
        let pendingPartial = "";
        let lastFlushAt = 0;
        let flushTimer: ReturnType<typeof setTimeout> | null = null;
        let hasContent = false;
        let firstChunkAt: number | null = null;

        const flushInitStreaming = () => {
          lastFlushAt = performance.now();
          flushTimer = null;
          flushSync(() => setInitStreamingContent(fullContent));
        };

        const scheduleInitFlush = () => {
          const now = performance.now();
          if (now - lastFlushAt >= STREAM_FLUSH_INTERVAL_MS) {
            flushInitStreaming();
            return;
          }
          if (!flushTimer) {
            const wait = STREAM_FLUSH_INTERVAL_MS - (now - lastFlushAt);
            flushTimer = setTimeout(flushInitStreaming, wait);
          }
        };

        const handleResponseId = (id: string) => {
          if (!responseIdRef.current) {
            setResponseId(id);
            responseIdRef.current = id;
          }
        };

        const handleContentDelta = (delta: string) => {
          if (!delta) return;
          if (!hasContent) {
            hasContent = true;
          }
          fullContent += delta;
          scheduleInitFlush();
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          if (!firstChunkAt) firstChunkAt = performance.now();

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const parsed = parseSSEChunk(line);
            if (parsed.id) {
              handleResponseId(parsed.id);
              continue;
            }
            if (parsed.content) {
              if (pendingPartial && parsed.content === pendingPartial) {
                pendingPartial = "";
                continue;
              }
              handleContentDelta(parsed.content);
              pendingPartial = parsed.content;
            }
          }

          if (buffer) {
            const parsed = parseSSEChunk(buffer);
            if (parsed.id) {
              handleResponseId(parsed.id);
            } else if (parsed.content) {
              const delta =
                pendingPartial && parsed.content.startsWith(pendingPartial)
                  ? parsed.content.slice(pendingPartial.length)
                  : parsed.content;
              if (delta) {
                handleContentDelta(delta);
              }
              pendingPartial = parsed.content;
            }
          } else {
            pendingPartial = "";
          }
        }

        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (hasContent) {
          flushSync(() => setInitStreamingContent(fullContent));
        }
        if (firstChunkAt) {
          const doneAt = performance.now();
          console.log(
            `[OldFriendChat] Init stream: firstChunk→done ${Math.round(doneAt - firstChunkAt)}ms`,
          );
        }

        const finalContent = fullContent || INITIAL_MESSAGE.content;
        setMessages((prev) =>
          prev.map((msg) =>
            msg === INITIAL_MESSAGE ? { ...msg, content: finalContent } : msg,
          ),
        );
      } catch {
        // silent fail
      } finally {
        setInitStreamingContent("");
        setIsSessionInitialized(true);
      }
    };

    initSession();
  }, [open, isSessionInitialized, context]);

  /**
   * 发送消息处理函数
   * 流程：构建消息历史 → 调用 API → 解析 SSE 流式响应 → 更新 UI
   */
  const handleSend = async () => {
    // 获取用户输入并去除首尾空格
    const text = input.trim();
    // 空消息或正在加载中时直接返回，防止重复提交
    if (!text || isLoading) return;

    // 清空输入框
    setInput("");
    // 构建用户消息对象
    const userMsg: ChatMessage = { role: "user", content: text };
    // 将用户消息添加到消息列表
    setMessages((prev) => [...prev, userMsg]);
    // 设置加载状态，禁止重复发送
    setIsLoading(true);
    // 清空上一次的流式内容
    setStreamingContent("");

    try {
      // 构建发送给后端的请求体：仅传当前输入与 response_id
      const requestBody: {
        input: string;
        previous_response_id?: string;
      } = { input: text };
      if (responseId) {
        requestBody.previous_response_id = responseId;
      }

      // 调用聊天接口，发送POST请求
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      // 接口返回错误时的处理
      if (!res.ok) {
        // 尝试解析错误信息，解析失败则返回空对象
        const data = await res.json().catch(() => ({}));
        const errorMsg = (data as { error?: string }).error ?? "请求失败";
        const detail = (data as { detail?: string }).detail;
        if (detail) {
          try {
            const parsed = JSON.parse(detail);
            console.error("[OldFriendChat] API 错误详情:", parsed);
          } catch {
            console.error("[OldFriendChat] API 错误详情:", detail);
          }
        }
        // 抛出错误，包含后端返回的错误信息或默认提示
        throw new Error(errorMsg);
      }

      // 获取流式响应的读取器
      const reader = res.body?.getReader();
      // 读取器不存在时抛出错误
      if (!reader) {
        throw new Error("流式响应不可用");
      }

      // 创建文本解码器，用于将二进制流转换为字符串
      const decoder = new TextDecoder();
      // 缓冲区，用于存储不完整的SSE行
      let buffer = "";
      // 存储AI返回的完整回复内容
      let fullContent = "";
      let pendingPartial = "";
      let lastFlushAt = 0;
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      let hasContent = false;
      let hasThinking = false;
      let firstChunkAt: number | null = null;
      let firstContentAt: number | null = null;

      const flushStreaming = () => {
        lastFlushAt = performance.now();
        flushTimer = null;
        flushSync(() => setStreamingContent(fullContent));
      };

      const scheduleFlush = () => {
        const now = performance.now();
        if (now - lastFlushAt >= STREAM_FLUSH_INTERVAL_MS) {
          flushStreaming();
          return;
        }
        if (!flushTimer) {
          const wait = STREAM_FLUSH_INTERVAL_MS - (now - lastFlushAt);
          flushTimer = setTimeout(flushStreaming, wait);
        }
      };

      const markFirstContent = () => {
        if (!firstContentAt) {
          firstContentAt = performance.now();
        }
      };

      const handleReasoning = (reasoning: string) => {
        if (!reasoning || hasContent) return;
        if (!hasThinking) {
          hasThinking = true;
          flushSync(() => setStreamingContent("思考中"));
        }
      };

      const handleContentDelta = (delta: string) => {
        if (!delta) return;
        if (!hasContent) {
          hasContent = true;
          hasThinking = false;
          markFirstContent();
        }
        fullContent += delta;
        scheduleFlush();
      };

      const handleResponseId = (id: string) => {
        if (!responseId) {
          setResponseId(id);
        }
      };

      // 循环读取流式响应，直到结束
      while (true) {
        // 读取下一个chunk，done表示响应是否结束，value是二进制数据
        const { done, value } = await reader.read();
        // 响应结束则退出循环
        if (done) break;

        // 将二进制数据解码为字符串，添加到缓冲区
        buffer += decoder.decode(value, { stream: true });
        if (!firstChunkAt) {
          firstChunkAt = performance.now();
        }
        // 按换行符分割缓冲区内容，得到完整的SSE行
        const lines = buffer.split("\n");
        // 最后一行可能不完整，放回缓冲区等待下次处理
        buffer = lines.pop() ?? "";

        // 遍历所有完整的SSE行
        for (const line of lines) {
          const parsed = parseSSEChunk(line);
          if (parsed.id) {
            handleResponseId(parsed.id);
          } else {
            handleReasoning(parsed.reasoning);
            if (parsed.content) {
              if (pendingPartial && parsed.content === pendingPartial) {
                pendingPartial = "";
                continue;
              }
              handleContentDelta(parsed.content);
            }
          }
        }

        if (buffer) {
          const parsed = parseSSEChunk(buffer);
          if (parsed.id) {
            handleResponseId(parsed.id);
          } else {
            handleReasoning(parsed.reasoning);
            if (parsed.content) {
              const delta =
                pendingPartial && parsed.content.startsWith(pendingPartial)
                  ? parsed.content.slice(pendingPartial.length)
                  : parsed.content;
              if (delta) {
                handleContentDelta(delta);
              }
              pendingPartial = parsed.content;
            }
          }
        } else {
          pendingPartial = "";
        }
      }

      // 循环结束后，处理缓冲区中剩余的内容
      if (buffer) {
        const parsed = parseSSEChunk(buffer);
        if (parsed.id) {
          handleResponseId(parsed.id);
        } else {
          handleReasoning(parsed.reasoning);
          if (parsed.content) {
            const delta =
              pendingPartial && parsed.content.startsWith(pendingPartial)
                ? parsed.content.slice(pendingPartial.length)
                : parsed.content;
            if (delta) {
              handleContentDelta(delta);
            }
          }
        }
      }
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (hasContent) {
        flushSync(() => setStreamingContent(fullContent));
      }
      if (firstChunkAt && firstContentAt) {
        const doneAt = performance.now();
        const metrics = {
          firstChunkToFirstContentMs: Math.round(firstContentAt - firstChunkAt),
          firstContentToDoneMs: Math.round(doneAt - firstContentAt),
          recordedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(STREAM_METRICS_KEY, JSON.stringify(metrics));
        } catch {}
      }

      // 流式响应结束后，将完整的AI回复添加到消息列表
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent || "（无回复）" },
      ]);
    } catch (err) {
      // 捕获所有错误，将错误信息作为AI回复添加到消息列表
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `抱歉，出了点小问题：${err instanceof Error ? err.message : "请稍后再试"}`,
        },
      ]);
    } finally {
      // 无论成功失败，最终都要重置状态
      // 清空流式内容
      setStreamingContent("");
      // 取消加载状态，允许下次发送
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ width: drawerWidth }}
            className="fixed right-0 top-0 bottom-0 z-[91] bg-[#2c2420] border-l-2 border-faded-gold/40 shadow-2xl flex flex-col">
            <div
              onPointerDown={handleResizeStart}
              className="absolute left-0 top-0 h-full w-2 cursor-col-resize"
            />
            <div className="flex items-center justify-between p-4 border-b border-faded-gold/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-faded-gold/20 flex items-center justify-center text-faded-gold text-xl">
                  <SmilePlus size={26} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-['Cinzel'] font-bold text-faded-gold">
                    CHUM
                  </h2>
                  <p className="text-xs text-faded-gold/60">
                    基于你的日记与你对话
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-faded-gold/10 text-faded-gold/80 hover:text-faded-gold transition-colors"
                aria-label="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 magic-scrollbar">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                const showInitStream =
                  isLast &&
                  m.role === "assistant" &&
                  initStreamingContent !== "";
                const displayContent = showInitStream
                  ? initStreamingContent
                  : m.content;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                        m.role === "user"
                          ? "bg-faded-gold/20 text-faded-gold border border-faded-gold/30"
                          : "bg-white/10 text-parchment-white border border-faded-gold/20",
                      )}>
                      <p className="font-['Caveat'] text-lg whitespace-pre-wrap">
                        {displayContent}
                        {showInitStream && (
                          <span className="inline-block w-2 h-4 ml-0.5 bg-faded-gold/80 animate-pulse" />
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  placeholder="输入你想说的..."
                  className="flex-1 bg-white/10 border border-faded-gold/40 rounded-full py-2.5 pl-4 pr-4 outline-none focus:ring-2 focus:ring-faded-gold/50 text-faded-gold placeholder:text-faded-gold/40 font-['Caveat'] text-lg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-full bg-faded-gold/30 hover:bg-faded-gold/50 text-faded-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="发送">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
