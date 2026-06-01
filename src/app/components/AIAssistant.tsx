import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Mic, Sparkles, ChevronDown, RotateCcw, MicOff } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
}

type RecordingState = "idle" | "listening" | "done" | "error";

// ─── Mock AI ─────────────────────────────────────────────────────────────────

const GREETINGS = [
  "你好！我是你的 AI 学习助手 ✨ 有什么错题或知识点想弄清楚吗？",
  "嗨～我是 AI 学习助手，随时准备帮你分析错题！",
];

const AI_RESPONSES: { keywords: string[]; reply: string }[] = [
  { keywords: ["极值", "极大", "极小", "鞍点"], reply: "判断多元函数极值时，先求偏导令其为 0 得到驻点，再用黑塞矩阵（Hessian）判别：行列式 Δ>0 且 f_xx<0 时为极大值，f_xx>0 时为极小值，Δ<0 为鞍点，Δ=0 需进一步讨论。" },
  { keywords: ["积分", "换元", "面积"], reply: "定积分换元时要特别注意：① 上下限必须随换元一起改变；② 反代换后记得整理被积函数；③ 面积通常取绝对值，确认被积函数在区间上的正负。" },
  { keywords: ["特征值", "特征向量", "矩阵"], reply: "求特征值：解 det(A - λI) = 0 的特征多项式；再代回求特征向量。注意：① 对称矩阵不同特征值对应的特征向量必然正交；② 特征向量只有方向意义，可以乘任意非零常数。" },
  { keywords: ["正态分布", "高斯", "均值", "方差", "σ"], reply: "N(μ, σ²) 的关键：① 68-95-99.7 法则：1σ 覆盖 68%，2σ 覆盖 95%，3σ 覆盖 99.7%；② 标准化：Z = (X-μ)/σ；③ 查表时注意 Φ(z) 是累积分布，P(X>x) = 1 - Φ(z)。" },
  { keywords: ["RC", "电路", "充电", "放电", "时间常数"], reply: "RC 电路核心公式：充电 u_C(t) = U₀(1 - e^{-t/τ})，放电 u_C(t) = U₀e^{-t/τ}，时间常数 τ = RC。经过 1τ 充到约 63.2%，5τ 后认为完全充电。" },
  { keywords: ["单摆", "重力加速度", "g", "周期", "T"], reply: "单摆 T = 2π√(L/g)，推导 g = 4π²L/T²。实验要点：① 摆角 <5°；② 计时多个周期取平均；③ 摆长从悬点到摆球重心。" },
  { keywords: ["折射", "斯涅尔", "光", "折射率"], reply: "斯涅尔定律：n₁ sin θ₁ = n₂ sin θ₂。注意角度均从法线量起；光从密→疏介质时有全反射临界角。" },
  { keywords: ["相对论", "质能", "E=mc²", "洛伦兹", "γ"], reply: "狭义相对论要点：E = γmc²，γ = 1/√(1-v²/c²)；静止能量 E₀ = mc²，动能 T = (γ-1)mc²。v → c 时 γ → ∞，必须用相对论公式而非 ½mv²！" },
  { keywords: ["二叉树", "AVL", "平衡", "旋转", "搜索树"], reply: "AVL 树插入后检查每个祖先平衡因子（左高-右高）。|bf| > 1 时触发旋转：LL→右旋，RR→左旋，LR→先左后右，RL→先右后左。旋转后平衡因子从插入点向上重新计算到根。" },
  { keywords: ["为什么", "错了", "问题", "哪里"], reply: `大多数错题归因于：① 概念混淆；② 忽略边界条件；③ 计算粗心；④ 题目理解偏差。建议在卡片的"出错原因"里详细记录，复习时重点攻克。` },
  { keywords: ["复习", "备考", "方法", "技巧", "怎么学"], reply: `高效复习建议：① 间隔重复——今天错的题，明天、三天后、一周后各复习一次；② 主动回忆胜于被动阅读；③ 错题分类（计算/概念/审题），分类攻克。` },
  { keywords: ["谢谢", "感谢", "好的", "明白", "懂了"], reply: "很高兴能帮到你！💪 继续加油，把每道错题都变成下次的正确题！" },
];

function getMockReply(input: string): string {
  const lower = input.toLowerCase();
  for (const { keywords, reply } of AI_RESPONSES) {
    if (keywords.some((k) => lower.includes(k))) return reply;
  }
  return `关于「${input.slice(0, 18)}${input.length > 18 ? "…" : ""}」，建议先回顾教材定义，再对比错题中的解题步骤，找出跳跃或遗漏的推理环节。把具体题目告诉我，我来帮你拆解 ✏️`;
}

// ─── Waveform canvas ─────────────────────────────────────────────────────────

function WaveformCanvas({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream) return;

    const ctx = canvas.getContext("2d")!;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const BAR_COUNT = 20;
    const BAR_W = 4;
    const GAP = (W - BAR_COUNT * BAR_W) / (BAR_COUNT + 1);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = data[Math.floor(i * data.length / BAR_COUNT)] / 255;
        const barH = Math.max(4, val * H * 0.85);
        const x = GAP + i * (BAR_W + GAP);
        const y = (H - barH) / 2;
        // Use hex directly — canvas API cannot consume CSS variables
        ctx.fillStyle = "#4D5CFF";
        ctx.globalAlpha = 0.3 + val * 0.7;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_W, barH, 3);
        ctx.fill();
      }
    }
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtx.close();
    };
  }, [stream]);

  if (!stream) {
    // Fallback CSS-animated bars when no stream (requesting permission)
    return (
      <div className="flex items-end justify-center gap-1" style={{ height: 40 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 4,
              borderRadius: 3,
              backgroundColor: "var(--brand\\/--brand-color)",
              opacity: 0.4,
              animation: "ai-wave 0.8s ease-in-out infinite alternate",
              animationDelay: `${(i % 5) * 0.12}s`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 40, display: "block" }}
    />
  );
}

// ─── useRecorder hook ─────────────────────────────────────────────────────────

function useRecorder() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const recRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalRef = useRef("");

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stop = useCallback(() => {
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const reset = useCallback(() => {
    stop();
    setRecordingState("idle");
    setTranscript("");
    setErrorMsg("");
    finalRef.current = "";
  }, [stop]);

  const start = useCallback(() => {
    if (!supported) {
      setErrorMsg("当前浏览器不支持语音识别，请使用 Chrome 或 Edge。");
      setRecordingState("error");
      return;
    }

    setRecordingState("listening");
    setTranscript("");
    finalRef.current = "";

    // Get mic stream for waveform visualization
    navigator.mediaDevices?.getUserMedia({ audio: true }).then((s) => {
      streamRef.current = s;
      setStream(s);
    }).catch(() => {
      // visualization fails silently — recognition still works
    });

    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: SpeechRecognition = new Ctor();
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) { finalRef.current = final; setTranscript(final); }
      else setTranscript(interim);
    };

    rec.onend = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
      if (finalRef.current.trim()) setRecordingState("done");
      else if (recordingState !== "error") setRecordingState("idle");
    };

    rec.onerror = (e: Event) => {
      const code = (e as any).error as string;
      const msgs: Record<string, string> = {
        "not-allowed": "麦克风权限被拒绝。请点击地址栏左侧锁形图标，允许麦克风后重试。",
        "service-not-allowed": "当前预览环境限制了语音访问。请点击右上角「在新标签页打开」后使用语音功能。",
        "no-speech": "未检测到语音，请靠近麦克风后重试。",
        "audio-capture": "未找到麦克风，请确认设备已连接并启用。",
        network: "网络不可用，语音识别需要联网。",
      };
      setErrorMsg(msgs[code] ?? `语音错误（${code}），请重试。`);
      setRecordingState("error");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    };

    recRef.current = rec;
    rec.start();
  }, [supported, recordingState]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return { recordingState, transcript, errorMsg, stream, start, stop, reset, supported };
}

// ─── Inline voice overlay ────────────────────────────────────────────────────

function VoiceOverlay({
  recorder,
  onSend,
  onCancel,
}: {
  recorder: ReturnType<typeof useRecorder>;
  onSend: (text: string) => void;
  onCancel: () => void;
}) {
  const { recordingState, transcript, errorMsg, stream, stop, reset } = recorder;

  const handleSend = () => {
    const text = transcript.trim();
    stop();
    reset();
    if (text) onSend(text);
    else onCancel();
  };

  const handleCancel = () => {
    stop();
    reset();
    onCancel();
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        padding: "24px 20px",
        backgroundColor: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* ── Listening ── */}
      {(recordingState === "listening" || recordingState === "done") && (
        <>
          {/* Animated mic ring */}
          <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
            {recordingState === "listening" && (
              <>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  backgroundColor: "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
                  animation: "ai-ring 1.6s ease-out infinite",
                }} />
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  backgroundColor: "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
                  animation: "ai-ring 1.6s ease-out 0.5s infinite",
                }} />
              </>
            )}
            <div style={{
              position: "absolute", inset: 10, borderRadius: "50%",
              backgroundColor: recordingState === "done"
                ? "var(--color\\/bg\\/success\\/color-bg-success-default)"
                : "var(--brand\\/--brand-color)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background-color 0.3s",
            }}>
              <Mic size={24} color="white" />
            </div>
          </div>

          {/* Real waveform */}
          <div style={{ width: "100%" }}>
            <WaveformCanvas stream={stream} />
          </div>

          {/* Status label */}
          <span className="mark-small" style={{
            color: recordingState === "done"
              ? "var(--color\\/text\\/color-text-success-default)"
              : "var(--color\\/text\\/color-text-brand-default)",
          }}>
            {recordingState === "done" ? "识别完成" : "正在聆听…"}
          </span>

          {/* Live transcript */}
          <div
            className="body-small w-full"
            style={{
              minHeight: 56,
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
              border: "1px solid var(--color\\/border\\/color-border-default)",
              color: transcript
                ? "var(--color\\/text\\/color-text-primary)"
                : "var(--color\\/text\\/color-text-placeholder)",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            {transcript || "请开始说话…"}
          </div>

          {/* Controls */}
          <div className="flex gap-3 w-full">
            {/* raw <button>: no kit component */}
            <button
              onClick={handleCancel}
              className="body-small flex-1"
              style={{
                padding: "10px 0", borderRadius: 10,
                border: "1px solid var(--color\\/border\\/color-border-default)",
                background: "none", cursor: "pointer",
                color: "var(--color\\/text\\/color-text-secondary)",
              }}
            >
              取消
            </button>
            {recordingState === "listening" && (
              <button
                onClick={() => { stop(); }}
                className="body-small flex-1 flex items-center justify-center gap-1.5"
                style={{
                  padding: "10px 0", borderRadius: 10, border: "none",
                  cursor: "pointer",
                  backgroundColor: "var(--color\\/bg\\/error\\/color-bg-error-subtlest)",
                  color: "var(--color\\/text\\/color-text-error-default)",
                }}
              >
                <MicOff size={14} /> 停止
              </button>
            )}
            {recordingState === "done" && (
              <button
                onClick={handleSend}
                disabled={!transcript.trim()}
                className="body-small flex-1 flex items-center justify-center gap-1.5"
                style={{
                  padding: "10px 0", borderRadius: 10, border: "none",
                  cursor: transcript.trim() ? "pointer" : "not-allowed",
                  backgroundColor: transcript.trim()
                    ? "var(--brand\\/--brand-color)"
                    : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                  color: transcript.trim()
                    ? "var(--color\\/text\\/color-text-anti)"
                    : "var(--color\\/icon\\/color-icon-disabled)",
                }}
              >
                <Send size={14} /> 发送
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Error ── */}
      {recordingState === "error" && (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: "var(--color\\/bg\\/error\\/color-bg-error-subtlest)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MicOff size={28} style={{ color: "var(--color\\/text\\/color-text-error-default)" }} />
          </div>
          <span className="body-small" style={{
            color: "var(--color\\/text\\/color-text-secondary)",
            textAlign: "center", lineHeight: 1.7,
          }}>
            {errorMsg}
          </span>
          <div className="flex gap-3 w-full">
            <button onClick={handleCancel} className="body-small flex-1" style={{
              padding: "10px 0", borderRadius: 10,
              border: "1px solid var(--color\\/border\\/color-border-default)",
              background: "none", cursor: "pointer",
              color: "var(--color\\/text\\/color-text-secondary)",
            }}>
              关闭
            </button>
            <button onClick={() => { reset(); recorder.start(); }} className="body-small flex-1" style={{
              padding: "10px 0", borderRadius: 10, border: "none",
              cursor: "pointer",
              backgroundColor: "var(--brand\\/--brand-color)",
              color: "var(--color\\/text\\/color-text-anti)",
            }}>
              重试
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "assistant", text: GREETINGS[0], ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorder = useRecorder();

  const addUserMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: trimmed, ts: Date.now() },
    ]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: getMockReply(trimmed), ts: Date.now() },
      ]);
      setThinking(false);
    }, 600 + Math.random() * 800);
  }, []);

  const handleSend = () => { if (input.trim()) addUserMessage(input); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReset = () => {
    setMessages([{ id: crypto.randomUUID(), role: "assistant", text: GREETINGS[1], ts: Date.now() }]);
  };

  const handleMicClick = () => {
    setShowVoice(true);
    recorder.start();
  };

  const handleVoiceSend = (text: string) => {
    setShowVoice(false);
    addUserMessage(text);
  };

  const handleVoiceCancel = () => {
    setShowVoice(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (open && !showVoice) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, showVoice]);

  return (
    <>
      {/* ── Floating panel ── */}
      {open && (
        <div
          className="flex flex-col"
          style={{
            position: "fixed" as const,
            bottom: 88,
            right: 24,
            width: 360,
            maxHeight: "60vh",
            zIndex: 200,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--color\\/border\\/color-border-default)",
            boxShadow: "0 8px 32px rgba(2,4,24,0.12), 0 2px 8px rgba(2,4,24,0.08)",
            backdropFilter: "blur(28px) saturate(180%)",
            backgroundColor: "rgba(255,255,255,0.96)",
          }}
        >
          {/* Voice overlay — covers the panel when recording */}
          {showVoice && (
            <VoiceOverlay
              recorder={recorder}
              onSend={handleVoiceSend}
              onCancel={handleVoiceCancel}
            />
          )}

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              borderBottom: "1px solid var(--color\\/border\\/color-border-default)",
              backgroundColor: "var(--color\\/bg\\/container\\/color-bg-container-default)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 28, height: 28, backgroundColor: "var(--brand\\/--brand-color)" }}
              >
                <Sparkles size={14} color="white" />
              </div>
              <span className="title-small" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>
                AI 学习助手
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* raw <button>: no kit IconButton in component catalog */}
              <button
                onClick={handleReset}
                title="清空对话"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--color\\/icon\\/color-icon-secondary)", display: "flex" }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--color\\/icon\\/color-icon-secondary)", display: "flex" }}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 px-4 py-4" style={{ minHeight: 0 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex flex-col"
                style={{ alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div
                  className="body-small"
                  style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    lineHeight: 1.6,
                    backgroundColor: msg.role === "user"
                      ? "var(--brand\\/--brand-color)"
                      : "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
                    color: msg.role === "user"
                      ? "var(--color\\/text\\/color-text-anti)"
                      : "var(--color\\/text\\/color-text-primary)",
                    border: msg.role === "assistant"
                      ? "1px solid var(--color\\/border\\/color-border-default)"
                      : "none",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex" style={{ alignItems: "flex-start" }}>
                <div className="flex items-center gap-1" style={{
                  padding: "10px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  border: "1px solid var(--color\\/border\\/color-border-default)",
                  backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
                }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                      backgroundColor: "var(--color\\/icon\\/color-icon-placeholder)",
                      animation: "ai-bounce 1.2s infinite",
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
            style={{
              borderTop: "1px solid var(--color\\/border\\/color-border-default)",
              backgroundColor: "var(--color\\/bg\\/container\\/color-bg-container-default)",
            }}
          >
            <div className="flex items-center gap-2 flex-1" style={{
              backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
              border: "1px solid var(--color\\/border\\/color-border-input)",
              borderRadius: 10,
              padding: "8px 12px",
            }}>
              {/* raw <input>: no kit TextField in component catalog */}
              <input
                ref={inputRef}
                type="text"
                placeholder="问我任何知识点…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="body-small flex-1"
                style={{ border: "none", background: "transparent", outline: "none", color: "var(--color\\/text\\/color-text-primary)", minWidth: 0 }}
              />
            </div>

            {/* Mic button */}
            <button
              onClick={handleMicClick}
              title="语音输入"
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: "1px solid var(--color\\/border\\/color-border-default)",
                backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
                color: "var(--color\\/icon\\/color-icon-secondary)",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}
            >
              <Mic size={16} />
            </button>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                backgroundColor: input.trim() && !thinking
                  ? "var(--brand\\/--brand-color)"
                  : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                color: input.trim() && !thinking
                  ? "var(--color\\/text\\/color-text-anti)"
                  : "var(--color\\/icon\\/color-icon-disabled)",
                cursor: input.trim() && !thinking ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? "收起 AI 助手" : "打开 AI 助手"}
        style={{
          position: "fixed", bottom: 28, right: 24,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          backgroundColor: open
            ? "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)"
            : "var(--brand\\/--brand-color)",
          color: open ? "var(--color\\/icon\\/color-icon-secondary)" : "white",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 201,
          boxShadow: open ? "0 2px 8px rgba(2,4,24,0.10)" : "0 4px 16px rgba(77,92,255,0.35)",
          transition: "all 0.2s",
        }}
      >
        {open ? <X size={20} /> : <Sparkles size={22} />}
      </button>

      <style>{`
        @keyframes ai-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes ai-wave {
          0%   { height: 4px; }
          100% { height: 24px; }
        }
        @keyframes ai-ring {
          0%   { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </>
  );
}
