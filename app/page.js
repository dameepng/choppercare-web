"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://choppercare.toeanmuda.id";

const QUICK_QUESTIONS = [
  "Apa yang harus dilakukan saat gempa bumi?",
  "Cara mempersiapkan tas siaga bencana?",
  "Tanda-tanda tsunami akan datang?",
  "Kontak darurat bencana Indonesia?",
  "Apa yang dilakukan saat banjir?",
  "Bagaimana evakuasi saat gunung meletus?",
];

const EMERGENCY_CONTACTS = [
  { name: "BNPB", number: "117" },
  { name: "Basarnas", number: "115" },
  { name: "Ambulans", number: "119" },
  { name: "Polisi", number: "110" },
];

function generateSessionId() {
  return (
    "sess-" + Date.now().toString(36) + Math.random().toString(36).substr(2, 6)
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start message-enter">
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex message-enter ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold mr-2 mt-1 flex-shrink-0">
          CC
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "chat-bubble-user text-white rounded-br-sm"
            : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
        }`}
      >
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-4 bg-gray-300 ml-0.5 animate-pulse rounded align-middle" />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Halo! Saya ChopperCare, asisten tanggap bencana berbasis AI 🆘\n\nSaya siap membantu kamu dengan informasi seputar kesiapsiagaan dan penanganan bencana di Indonesia.\n\nAda yang bisa saya bantu?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [isOnline, setIsOnline] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const userMessage = (text || input).trim();
      if (!userMessage || loading) return;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setLoading(true);
      setIsTyping(true);

      if (!isOnline) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "⚠️ Kamu sedang offline.\n\nUntuk informasi darurat segera hubungi:\n• BNPB: 117\n• Basarnas: 115\n• Ambulans: 119",
          },
        ]);
        setLoading(false);
        return;
      }

      let assistantContent = "";

      try {
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, session_id: sessionId }),
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let firstToken = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                if (firstToken) {
                  setIsTyping(false);
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "", streaming: true },
                  ]);
                  firstToken = false;
                }
                assistantContent += data.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                    streaming: true,
                  };
                  return updated;
                });
              }
              if (data.done) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                    streaming: false,
                  };
                  return updated;
                });
              }
              if (data.error) {
                setIsTyping(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content:
                      "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi BNPB di 117.",
                  },
                ]);
              }
            } catch {}
          }
        }
      } catch {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Koneksi bermasalah. Silakan coba lagi atau hubungi BNPB di 117.",
          },
        ]);
      } finally {
        setLoading(false);
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, isOnline, sessionId],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showQuickQuestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-red-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg z-10">
        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-red-600 font-black text-xs">CC</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base leading-tight">ChopperCare</h1>
          <p className="text-red-200 text-xs truncate">
            Asisten Tanggap Bencana AI • BNPB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </div>
          <button
            onClick={() => setShowContacts(!showContacts)}
            className="bg-red-700 hover:bg-red-800 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
          >
            🆘 Darurat
          </button>
        </div>
      </header>

      {/* Emergency contacts dropdown */}
      {showContacts && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 grid grid-cols-2 gap-2">
          {EMERGENCY_CONTACTS.map((c) => (
            <a
              key={c.name}
              href={`tel:${c.number}`}
              className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-red-100 hover:bg-red-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {c.name}
              </span>
              <span className="text-red-600 font-bold text-sm">{c.number}</span>
            </a>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {showQuickQuestions && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 mb-2 font-medium">
            Pertanyaan umum:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs bg-white border border-red-200 text-red-700 rounded-full px-3 py-1.5 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 shadow-up">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya seputar bencana..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 max-h-28 disabled:bg-gray-50 transition-colors"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-red-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 h-11"
          >
            {loading ? (
              <span className="flex gap-1 items-center">
                <span
                  className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            ) : (
              "Kirim"
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Informasi darurat: BNPB <strong>117</strong> • Basarnas{" "}
          <strong>115</strong>
        </p>
      </div>
    </div>
  );
}
