"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import EmergencyContact from "@/src/features/emergency/EmergencyContact";
import "@/src/features/emergency/emergency.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://choppercare.toeanmuda.id";

const QUICK_QUESTIONS = [
  "🌊 Saat tsunami?",
  "🏔️ Gunung meletus?",
  "🌧️ Saat banjir?",
  "🎒 Tas siaga bencana?",
  "📞 Kontak darurat?",
  "🏠 Gempa di rumah?",
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

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Halo! Saya ChopperCare 🆘\n\nAsisten AI tanggap bencana Indonesia. Tanyakan apa saja seputar kesiapsiagaan dan penanganan bencana.",
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
      setShowContacts(false);
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
              "Kamu sedang offline.\n\nHubungi segera:\n• BNPB: 117\n• Basarnas: 115\n• Ambulans: 119",
          },
        ]);
        setLoading(false);
        return;
      }

      let assistantContent = "";
      let firstToken = true;
      let handledTerminalState = false;

      try {
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, session_id: sessionId }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        if (!res.body) {
          throw new Error("Empty response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error && !handledTerminalState) {
                handledTerminalState = true;
                setIsTyping(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: data.error,
                  },
                ]);
                break;
              }
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
            } catch {}
          }

          if (handledTerminalState) break;
        }

        if (!handledTerminalState && !assistantContent) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Belum ada jawaban yang bisa ditampilkan. Coba kirim ulang pertanyaannya.",
            },
          ]);
        }
      } catch {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Koneksi bermasalah. Coba lagi atau hubungi BNPB di 117.",
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

  const showQuickQ = messages.length <= 1;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        #app {
          display: flex; flex-direction: column;
          height: 100dvh;
          max-width: 430px; margin: 0 auto;
          background: #111;
        }
        .header {
          background: #111; border-bottom: 1px solid #1c1c1c;
          padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0;
        }
        .avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: #DC2626;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: white;
          flex-shrink: 0;
        }
        .header-info { flex: 1; }
        .header-name { font-size: 15px; font-weight: 700; color: #fff; }
        .header-sub { font-size: 11px; color: #555; margin-top: 1px; }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .online-badge {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #22c55e; font-weight: 500;
        }
        .online-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 5px #22c55e;
        }
        .online-dot.off { background: #444; box-shadow: none; }
        .sos-btn {
          background: #DC2626; border: none; border-radius: 8px;
          padding: 7px 11px; font-size: 12px; font-weight: 700;
          color: white; cursor: pointer; letter-spacing: 0.3px;
        }
        .emergency-panel {
          background: #0f0a0a; border-bottom: 1px solid #1e1010;
          padding: 12px 16px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          flex-shrink: 0;
        }
        .contact-card {
          background: #191010; border: 1px solid #2a1010;
          border-radius: 10px; padding: 10px 12px;
          display: flex; align-items: center; justify-content: space-between;
          text-decoration: none;
        }
        .contact-name { font-size: 11px; color: #888; font-weight: 500; }
        .contact-number { font-size: 17px; font-weight: 800; color: #DC2626; }
        .messages {
          flex: 1; overflow-y: auto;
          padding: 16px; display: flex; flex-direction: column; gap: 10px;
          scrollbar-width: none;
        }
        .messages::-webkit-scrollbar { display: none; }
        .msg-row { display: flex; gap: 8px; align-items: flex-end; }
        .msg-row.user { flex-direction: row-reverse; }
        .msg-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: #1c1c1c; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #DC2626;
        }
        .bubble {
          max-width: 76%; padding: 10px 14px;
          font-size: 14px; line-height: 1.6;
          white-space: pre-wrap; word-break: break-word;
          border-radius: 16px;
        }
        .bubble.assistant {
          background: #1a1a1a; color: #ddd;
          border: 1px solid #222; border-bottom-left-radius: 4px;
        }
        .bubble.user {
          background: #DC2626; color: white;
          border-bottom-right-radius: 4px;
        }
        .cursor {
          display: inline-block; width: 2px; height: 13px;
          background: #555; margin-left: 2px; vertical-align: middle;
          animation: blink 1s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .typing-row { display: flex; gap: 8px; align-items: flex-end; }
        .typing-bubble {
          background: #1a1a1a; border: 1px solid #222;
          border-radius: 16px; border-bottom-left-radius: 4px;
          padding: 12px 16px; display: flex; gap: 5px; align-items: center;
        }
        .dot {
          width: 7px; height: 7px; border-radius: 50%; background: #333;
          animation: ta 1.4s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes ta {
          0%,60%,100% { transform: scale(0.8); background: #2a2a2a; }
          30% { transform: scale(1.2); background: #DC2626; }
        }
        .quick-wrap { padding: 0 16px 12px; flex-shrink: 0; }
        .quick-label { font-size: 10px; color: #3a3a3a; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; margin-bottom: 8px; }
        .quick-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .pill {
          background: #171717; border: 1px solid #222; border-radius: 20px;
          padding: 7px 12px; font-size: 12px; color: #999;
          cursor: pointer; white-space: nowrap; transition: all 0.15s;
        }
        .pill:hover { background: #1e1e1e; border-color: #DC2626; color: #fff; }
        .pill:active { transform: scale(0.96); }
        .input-wrap {
          background: #111; border-top: 1px solid #1c1c1c;
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          flex-shrink: 0;
        }
        .input-row { display: flex; gap: 8px; align-items: flex-end; }
        .input-field {
          flex: 1; background: #1a1a1a; border: 1px solid #252525;
          border-radius: 14px; padding: 11px 14px;
          font-size: 14px; color: #e0e0e0; resize: none;
          outline: none; min-height: 44px; max-height: 110px;
          font-family: inherit; line-height: 1.5; transition: border-color 0.15s;
        }
        .input-field::placeholder { color: #3a3a3a; }
        .input-field:focus { border-color: #DC2626; }
        .send {
          width: 44px; height: 44px; background: #DC2626;
          border: none; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: all 0.15s;
        }
        .send:hover { background: #b91c1c; }
        .send:active { transform: scale(0.92); }
        .send:disabled { background: #1e1e1e; cursor: not-allowed; }
        .hotline {
          text-align: center; font-size: 11px; color: #555; margin-top: 8px;
        }
        .hotline strong { color: #DC2626; }
        .bubble.assistant h1,
        .bubble.assistant h2,
        .bubble.assistant h3 {
          font-size: 14px; font-weight: 700; color: #fff;
          margin-bottom: 6px; margin-top: 10px;
        }
        .bubble.assistant h1:first-child,
        .bubble.assistant h2:first-child,
        .bubble.assistant h3:first-child { margin-top: 0; }
        .bubble.assistant strong { color: #fff; font-weight: 700; }
        .bubble.assistant em { color: #aaa; font-style: italic; }
        .bubble.assistant p { margin-bottom: 8px; }
        .bubble.assistant p:last-child { margin-bottom: 0; }
        .bubble.assistant { white-space: normal; text-align: justify; }
        .bubble.assistant ul {
          padding-left: 20px; margin: 6px 0;
          list-style-type: disc;
        }
        .bubble.assistant ol {
          padding-left: 20px; margin: 6px 0;
          list-style-type: decimal;
        }
        .bubble.assistant li { margin-bottom: 4px; line-height: 1.6; }
        .bubble.assistant li p { margin-bottom: 0; }
        .bubble.assistant li::marker { color: #DC2626; }
        .bubble.assistant p { margin-bottom: 8px; text-align: justify; }
        .bubble.assistant p:last-child { margin-bottom: 0; }
        .bubble.assistant strong { color: #fff; font-weight: 700; }
        .bubble.assistant h1, .bubble.assistant h2, .bubble.assistant h3 {
          font-size: 14px; font-weight: 700; color: #fff;
          margin: 10px 0 4px; text-align: left;
        }
        .bubble.assistant code {
          background: #2a2a2a; border-radius: 4px;
          padding: 1px 5px; font-size: 12px; color: #e5e5e5;
        }
      `}</style>

      <div id="app">
        <div className="header">
          <div className="avatar">CC</div>
          <div className="header-info">
            <div className="header-name">ChopperCare</div>
            <div className="header-sub">Tanggap Bencana AI • BNPB</div>
          </div>
          <div className="header-right">
            <div className="online-badge">
              <div className={`online-dot ${isOnline ? "" : "off"}`} />
            </div>
            <button
              className="sos-btn"
              onClick={() => setShowContacts(!showContacts)}
            >
              🆘 SOS
            </button>
          </div>
        </div>

        {showContacts && (
          <div className="emergency-panel">
            {EMERGENCY_CONTACTS.map((c) => (
              <a key={c.name} href={`tel:${c.number}`} className="contact-card">
                <span className="contact-name">{c.name}</span>
                <span className="contact-number">{c.number}</span>
              </a>
            ))}
          </div>
        )}

        <EmergencyContact />

        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              {msg.role === "assistant" && <div className="msg-icon">CC</div>}
              <div className={`bubble ${msg.role}`}>
                {msg.role === "assistant" ? (
                  <>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.streaming && <span className="cursor" />}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="typing-row">
              <div className="msg-icon">CC</div>
              <div className="typing-bubble">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showQuickQ && (
          <div className="quick-wrap">
            <div className="quick-label">Tanya langsung</div>
            <div className="quick-pills">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="pill"
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="input-wrap">
          <div className="input-row">
            <textarea
              ref={inputRef}
              className="input-field"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "44px";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 110) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tanya seputar bencana..."
              rows={1}
              disabled={loading}
            />
            <button
              className="send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#333" strokeWidth="2" />
                  <path
                    d="M12 3a9 9 0 0 1 9 9"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="0.7s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <div className="hotline">
            BNPB <strong>117</strong> &nbsp;•&nbsp; Basarnas{" "}
            <strong>115</strong> &nbsp;•&nbsp; Ambulans <strong>119</strong>
          </div>
        </div>
      </div>
    </>
  );
}
