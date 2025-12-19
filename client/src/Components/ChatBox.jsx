import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Send,
  Loader2,
  Bot,
  User,
  Wifi,
  WifiOff,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi ask me any finance question.",
      source: "system",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("live");
  const endRef = useRef();

  useEffect(
    () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
    [messages, loading]
  );

  async function sendMessage() {
    const prompt = input.trim();
    if (!prompt) return;
    setInput("");
    const userMsg = { role: "user", text: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await axios.post(
        "http://localhost:3001/api/chat",
        {
          prompt,
          max_tokens: 200,
          temperature: 0,
        },
        { timeout: 70000 }
      );

      const source = resp.data?.source || "unknown";
      const answer =
        resp.data?.answer || resp.data?.ollama_raw?.response || "(no answer)";
      const live = resp.data?.live || false;
      const ticker = resp.data?.ticker || null;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: answer, source, live, ticker },
      ]);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Request failed";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${msg}`, source: "gateway" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) sendMessage();
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-linear-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-100/50 border border-white/60 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 p-6 border-b border-slate-100/60 bg-white/40">
          <div className="relative">
            <div className="flex items-center justify-center w-12 h-12 shadow-lg rounded-xl bg-linear-to-br from-blue-600 to-indigo-700">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="absolute flex items-center justify-center w-5 h-5 bg-green-500 border-2 border-white rounded-full -bottom-1 -right-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-transparent bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text">
              Finance Assistant
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Professional financial insights & analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm ${
                status === "live"
                  ? "bg-green-50 text-green-700 border border-green-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  status === "live" ? "bg-green-500" : "bg-amber-500"
                }`}
              ></div>
              <span className="text-xs font-semibold tracking-wide">
                {status.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 p-6 overflow-auto bg-linear-to-b from-white/40 to-blue-50/30">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    } gap-3`}
                  >
                    {m.role === "assistant" && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm shrink-0 bg-linear-to-br from-blue-500 to-indigo-600">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div
                      className={`relative max-w-[75%] ${
                        m.role === "user"
                          ? "bg-linear-to-r from-blue-600 to-indigo-700 text-white rounded-2xl rounded-tr-md"
                          : "bg-white/80 backdrop-blur-sm border border-slate-100/80 rounded-2xl rounded-tl-md shadow-sm"
                      } p-4`}
                    >
                      {/* Message triangle */}
                      {m.role === "assistant" && (
                        <div className="absolute top-0 w-4 h-4 transform rotate-45 border-t border-l -left-2 bg-white/80 border-slate-100/80"></div>
                      )}
                      {m.role === "user" && (
                        <div className="absolute top-0 w-4 h-4 transform rotate-45 -right-2 bg-linear-to-r from-blue-600 to-indigo-700"></div>
                      )}

                      <div className="text-sm font-medium leading-6 whitespace-pre-wrap">
                        {m.text}
                      </div>

                      {/* {m.role === "assistant" && (
                        <div className="flex items-center justify-between pt-2 mt-3 border-t border-slate-100/60">
                          <div className="text-xs font-medium text-slate-500">
                            Source: <span className="font-semibold text-slate-700">{m.source}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )} */}

                      {m.role === "assistant" && (
                        <div className="flex items-center justify-between pt-2 mt-3 border-t border-slate-100/60">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                              Source:
                            </span>

                            {m.live && m.source === "live-price-api" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Wifi className="w-3 h-3" />
                                <span className="text-[11px] font-semibold">
                                  Live market API
                                  {m.ticker ? ` • ${m.ticker}` : ""}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <Bot className="w-3 h-3" />
                                <span className="text-[11px] font-semibold">
                                  {m.source === "ollama"
                                    ? "Fine tuned model + LLM (Ollama)"
                                    : m.source === "model-server"
                                    ? "Fine-tuned model"
                                    : m.source}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400">
                            {new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {m.role === "user" && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm shrink-0 bg-linear-to-br from-slate-600 to-slate-800">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading Indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start gap-3"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm shrink-0 bg-linear-to-br from-blue-500 to-indigo-600">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="p-4 border shadow-sm bg-white/80 backdrop-blur-sm border-slate-100/80 rounded-2xl rounded-tl-md">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div
                        className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      Analyzing your question...
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={endRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="p-6 border-t border-slate-100/60 bg-white/40 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  className="w-full p-4 pr-12 font-medium transition-all duration-200 border shadow-sm resize-none min-h-14 max-h-32 rounded-2xl border-slate-200/80 bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 text-slate-700 placeholder-slate-400"
                  placeholder="Type here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  disabled={loading}
                  rows="1"
                />
                <div className="absolute right-3 bottom-3 text-slate-400">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
                    <span className="text-xs font-medium">↵</span>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                whileHover={{ scale: loading || !input.trim() ? 1 : 1.02 }}
                whileTap={{ scale: loading || !input.trim() ? 1 : 0.98 }}
                className="flex items-center gap-2 px-6 py-4 font-semibold text-white transition-all duration-200 shadow-lg rounded-2xl bg-linear-to-r from-blue-600 to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </motion.button>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs font-medium text-slate-500">
                Powered by local model + Ollama fallback • Secure & private
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
