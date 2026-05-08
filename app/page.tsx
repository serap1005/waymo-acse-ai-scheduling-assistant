"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  scheduleCard?: ScheduleData;
}

interface ScheduleData {
  origin: string;
  destination: string;
  days: string[];
  departureTime: string;
  returnTrip: boolean;
  returnTime?: string;
  lockedPrice: string;
}

function parseSchedule(text: string): ScheduleData | null {
  const match = text.match(/<schedule>([\s\S]*?)<\/schedule>/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

function cleanMessage(text: string): string {
  return text.replace(/<schedule>[\s\S]*?<\/schedule>/, "").trim();
}

function formatMessage(text: string) {
  const cleaned = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: cleaned }} />;
}

function monthlyTotal(lockedPrice: string, days: string[]): string {
  const price = parseFloat(lockedPrice.replace("$", ""));
  const ridesPerWeek = days.length;
  const monthly = Math.round(price * ridesPerWeek * 4.3);
  return `$${monthly}`;
}

// ─── SCHEDULE CARD (inline in chat) ──────────────────────────────────────────
function InlineScheduleCard({ schedule }: { schedule: ScheduleData }) {
  const dayAbbr: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
  };
  const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const monthly = monthlyTotal(schedule.lockedPrice, schedule.days);

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      width: "100%",
      marginTop: 4,
    }}>
      {/* Card header */}
      <div style={{
        background: "linear-gradient(135deg, #1565C0 0%, #00BFA5 100%)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "white", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Commute Pass
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: "#1A73E8",
          background: "white", padding: "2px 8px", borderRadius: 50,
        }}>
          Price Locked
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px" }}>
        {/* Route */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1A73E8", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#6B7280" }}>From</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: "0 0 6px 14px" }}>{schedule.origin}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00BFA5", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#6B7280" }}>To</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: "0 0 0 14px" }}>{schedule.destination}</p>
        </div>

        {/* Days */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          {allDays.map((day) => {
            const active = schedule.days.includes(day);
            return (
              <span key={day} style={{
                fontSize: 10, fontWeight: 600,
                padding: "3px 7px", borderRadius: 50,
                background: active ? "#1A73E8" : "#F3F4F6",
                color: active ? "white" : "#9CA3AF",
              }}>
                {dayAbbr[day]}
              </span>
            );
          })}
        </div>

        {/* Time + per ride price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "0 0 1px 0" }}>Departure</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{schedule.departureTime}</p>
          </div>
          {schedule.returnTrip && schedule.returnTime && (
            <div>
              <p style={{ fontSize: 10, color: "#9CA3AF", margin: "0 0 1px 0" }}>Return</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{schedule.returnTime}</p>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "0 0 1px 0" }}>Per Ride</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1A73E8", margin: 0 }}>{schedule.lockedPrice}</p>
          </div>
        </div>

        {/* Monthly total */}
        <div style={{
          background: "#F0F9FF",
          borderRadius: 10,
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 11, color: "#0369A1", fontWeight: 600 }}>
            Est. monthly total ({schedule.days.length}x/week)
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#1A73E8" }}>{monthly}</span>
        </div>

        {/* Confirm button */}
        <button style={{
          width: "100%",
          background: "#111827",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: "11px 0",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}>
          Confirm Schedule
        </button>
      </div>
    </div>
  );
}

// ─── STATUS BAR ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      paddingLeft: 20, paddingRight: 20, paddingTop: 10, paddingBottom: 6,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#111827" }}>
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
        </svg>
        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#111827" }}>
          <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
        </svg>
      </div>
    </div>
  );
}

function BottomNav() {
  const items = [
    { label: "My trip",  active: true,  d: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
    { label: "My car",   active: false, d: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" },
    { label: "Help",     active: false, d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" },
    { label: "Account",  active: false, d: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" },
  ];
  return (
    <div style={{
      flexShrink: 0, background: "white",
      borderTop: "1px solid #F3F4F6",
      display: "flex", justifyContent: "space-around",
      alignItems: "center", padding: "10px 8px 8px",
    }}>
      {items.map((item) => (
        <button key={item.label} style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 2, flex: 1, background: "none", border: "none", cursor: "pointer",
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: item.active ? "#1A73E8" : "#9CA3AF" }}>
            <path d={item.d} />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 600, color: item.active ? "#1A73E8" : "#9CA3AF" }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#E8EAF0" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 40 }} />
        <div style={{ textAlign: "center", paddingLeft: 24, paddingRight: 24 }}>
          <p style={{ fontSize: 32, fontWeight: 900, color: "#111827", lineHeight: 1.2, letterSpacing: "-0.5px", margin: 0 }}>
            Your car can arrive<br />
            in <span style={{ color: "#1A73E8" }}>4 min</span>
          </p>
        </div>
        <div style={{ height: 44 }} />
        <div style={{ paddingLeft: 16, paddingRight: 16 }}>
          <button
            onClick={() => onNavigate("chat")}
            style={{
              width: "100%", background: "white", borderRadius: 50,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "none", cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "#9CA3AF", flexShrink: 0 }}>
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <span style={{ fontSize: 16, color: "#9CA3AF", fontWeight: 500 }}>Where to, Sera?</span>
          </button>
        </div>
        <div style={{ height: 20 }} />
        <div style={{ paddingLeft: 16, paddingRight: 16, display: "flex", gap: 8 }}>
          {[{ icon: "🏠", label: "Home" }, { icon: "💼", label: "Work" }].map((d) => (
            <button key={d.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "white", border: "1.5px solid #D1D5DB",
              borderRadius: 14, padding: "8px 14px", cursor: "pointer",
            }}>
              <span style={{ fontSize: 14 }}>{d.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1F2937" }}>{d.label}</span>
            </button>
          ))}
        </div>
        <div style={{ height: 20 }} />
        <div style={{
          marginLeft: 16, marginRight: 16,
          background: "white", borderRadius: 16,
          overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}>
          {[
            { label: "Chase Center", sub: "1 Warriors Way, San Francisco" },
            { label: "San Francisco Airport", sub: "780 S Airport Blvd" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              borderBottom: i === 0 ? "1px solid #F3F4F6" : "none",
            }}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#9CA3AF", flexShrink: 0 }}>
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0 0" }}>{item.sub}</p>
              </div>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "#D1D5DB" }}>
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
        <div style={{ marginLeft: 16, marginRight: 16, marginBottom: 16 }}>
          <button
            onClick={() => onNavigate("chat")}
            style={{
              width: "100%", background: "white", borderRadius: 20,
              overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              border: "none", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              background: "linear-gradient(135deg, #1565C0 0%, #00BFA5 100%)",
              padding: "20px 20px", position: "relative", overflow: "hidden",
              height: 130, display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            }}>
              <div style={{ position: "absolute", right: -20, top: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", right: 40, top: 10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
              <div style={{ zIndex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 4px 0" }}>WAYMO</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.1 }}>Commute<br />Pass</p>
              </div>
              <svg viewBox="0 0 100 50" style={{ width: 90, height: 45, zIndex: 1, opacity: 0.85 }} fill="white">
                <path d="M85 20H15l-6 18h82l-6-18zM14 42c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm72 0c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
                <path d="M20 20l8-12h44l8 12H20z" opacity="0.6"/>
              </svg>
            </div>
            <div style={{ padding: "12px 16px 14px" }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: "0 0 3px 0" }}>Set up Commute Pass AI Agent</p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0, lineHeight: 1.4 }}>Lock in your price. Schedule recurring rides. No surge pricing — ever.</p>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
      <div style={{ background: "white", display: "flex", justifyContent: "center", paddingBottom: 8, paddingTop: 4 }}>
        <div style={{ width: 96, height: 4, background: "#D1D5DB", borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ─── CHAT SCREEN ─────────────────────────────────────────────────────────────
function ChatScreen({
  messages, input, setInput, sendMessage, loading, bottomRef, onBack,
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  loading: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "white" }}>
      <StatusBar />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px 12px", borderBottom: "1px solid #F3F4F6", flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, marginLeft: -4 }}>
          <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: "#374151" }}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#1A73E8",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "white" }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Commute Pass Setup</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
            <p style={{ fontSize: 10, color: "#6B7280", margin: 0 }}>ACSE Assistant · Online</p>
          </div>
        </div>
        <span style={{
          fontSize: 10, color: "#9CA3AF", background: "#F3F4F6",
          padding: "3px 8px", borderRadius: 50, flexShrink: 0,
        }}>SF · PHX</span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 14px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {messages.map((m, i) => (
          <div key={i}>
            {/* Text bubble */}
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 8,
              flexDirection: m.role === "user" ? "row-reverse" : "row",
            }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: "#1A73E8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginBottom: m.scheduleCard ? 0 : 2,
                }}>
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>W</span>
                </div>
              )}
              <div style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 18,
                fontSize: 12, lineHeight: 1.5,
                background: m.role === "user" ? "#1A73E8" : "#F3F4F6",
                color: m.role === "user" ? "white" : "#111827",
                borderBottomRightRadius: m.role === "user" ? 4 : 18,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 18,
              }}>
                {formatMessage(m.content)}
              </div>
            </div>

            {/* Schedule card — appears below text for assistant messages */}
            {m.scheduleCard && (
              <div style={{
                marginLeft: 36,
                marginTop: 8,
              }}>
                <InlineScheduleCard schedule={m.scheduleCard} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: "#1A73E8",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>W</span>
            </div>
            <div style={{
              background: "#F3F4F6", padding: "12px 16px",
              borderRadius: 18, borderBottomLeftRadius: 4,
              display: "flex", gap: 4, alignItems: "center",
            }}>
              {[0, 150, 300].map((delay) => (
                <div key={delay} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#9CA3AF",
                  animation: "bounce 1s infinite",
                  animationDelay: `${delay}ms`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sample prompts */}
      {messages.length <= 1 && (
        <div style={{
          flexShrink: 0, padding: "6px 14px 8px",
          display: "flex", gap: 8, flexWrap: "wrap",
        }}>
          {[
            "Mission District to downtown SF, Mon–Fri 8:30 AM",
            "Cancellation policy?",
            "Scottsdale to Sky Harbor, 7 AM",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => setInput(prompt)}
              style={{
                fontSize: 11, color: "#1A73E8",
                border: "1.5px solid #BFDBFE", background: "#EFF6FF",
                padding: "8px 14px", borderRadius: 50,
                cursor: "pointer", lineHeight: 1.4, fontWeight: 500,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid #F3F4F6", background: "white",
        padding: "12px 16px 14px", display: "flex", gap: 10, alignItems: "center",
      }}>
        <input
          style={{
            flex: 1, background: "#F3F4F6", borderRadius: 50,
            padding: "13px 18px", fontSize: 13,
            outline: "none", border: "none", color: "#111827",
          }}
          placeholder="Describe your commute..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            width: 46, height: 46, background: "#1A73E8", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, border: "none", cursor: "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "white" }}>
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      {/* Home indicator */}
      <div style={{
        background: "white", display: "flex",
        justifyContent: "center", paddingBottom: 8, paddingTop: 4, flexShrink: 0,
      }}>
        <div style={{ width: 96, height: 4, background: "#D1D5DB", borderRadius: 99 }} />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen] = useState<"home" | "chat">("home");
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hi! I'm ACSE, your Waymo Commute Pass assistant. Tell me about your commute and I'll set up a recurring schedule with a locked price — no surge pricing, ever.\n\nWhere are you commuting from and to?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  messages: updated.map(({ role, content }) => ({ role, content })),
}),
      });
      const data = await res.json();
      const raw = data.message;
      const parsed = parseSchedule(raw);
      const cleaned = cleanMessage(raw);

      if (parsed) {
        // Text summary first, then card attached to same message
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: cleaned,
          scheduleCard: parsed,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: cleaned,
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 40,
    }}>
      {/* Phone */}
      <div style={{
        position: "relative",
        flexShrink: 0,
        overflow: "hidden",
        width: 360,
        height: 760,
        borderRadius: 52,
        border: "7px solid #374151",
        background: "#000",
        boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px #111",
      }}>
        {/* Notch */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: "black", zIndex: 30,
          width: 110, height: 26, borderRadius: "0 0 18px 18px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1f2937" }} />
          <div style={{ width: 48, height: 12, borderRadius: 99, background: "#111827" }} />
        </div>

        {/* Side buttons */}
        <div style={{ position: "absolute", left: -9, top: 96, width: 6, height: 32, background: "#4B5563", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", left: -9, top: 144, width: 6, height: 40, background: "#4B5563", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", left: -9, top: 200, width: 6, height: 40, background: "#4B5563", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", right: -9, top: 128, width: 6, height: 56, background: "#4B5563", borderRadius: "0 2px 2px 0" }} />

        {/* Screen */}
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden",
          borderRadius: 46, paddingTop: 22,
          display: "flex", flexDirection: "column",
        }}>
          {screen === "home" ? (
            <HomeScreen onNavigate={(s) => setScreen(s as "home" | "chat")} />
          ) : (
            <ChatScreen
              messages={messages}
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              loading={loading}
              bottomRef={bottomRef}
              onBack={() => setScreen("home")}
            />
          )}
        </div>
      </div>

      {/* Right panel — simplified */}
      <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px 0" }}>
            Waymo ACSE
          </p>
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
            AI-Native Commute Scheduling Engine
          </p>
        </div>

        <div style={{
          background: "#111827", border: "1px solid #1F2937",
          borderRadius: 16, padding: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px 0" }}>
            How to demo
          </p>
          {[
            { n: "1", text: "Tap the Commute Pass card on the home screen" },
            { n: "2", text: "Describe your commute in natural language" },
            { n: "3", text: "Watch ACSE parse your schedule and generate a price-locked card" },
            { n: "4", text: "Ask follow-up questions about policy or pricing" },
          ].map((step) => (
            <div key={step.n} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#1A73E8",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>{step.n}</span>
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>{step.text}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: "#111827", border: "1px solid #1F2937",
          borderRadius: 16, padding: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px 0" }}>
            Try asking
          </p>
          {[
            "Mission District to Salesforce Tower, Mon–Fri 8:30 AM",
            "What's the cancellation policy?",
            "Scottsdale to Sky Harbor, weekdays 7 AM",
          ].map((q, i) => (
            <p key={i} style={{
              fontSize: 11, color: "#4B5563", margin: "0 0 6px 0",
              paddingLeft: 8, borderLeft: "2px solid #1F2937", lineHeight: 1.4,
            }}>"{q}"</p>
          ))}
        </div>
      </div>
    </div>
  );
}