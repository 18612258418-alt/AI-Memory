import { useRef, useState } from "react";
import { ExperimentModal, VIZ_SUPPORTED_IDS } from "./components/ExperimentVisualizer";
import { AIAssistant } from "./components/AIAssistant";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Star,
  Tag,
  GraduationCap,
  BarChart3,
  Camera,
  ScanText,
} from "lucide-react";

// No kit components in @figma/astraui-kit or _1130NewDesignSystem per components.md — all UI is hand-rolled
// Typography uses kit CSS classes from src/_1130NewDesignSystem/styles.css
// Colors use CSS custom property tokens from the same file

type Subject = "math" | "linear" | "prob" | "english" | "major" | "physics";
type TabKey = "all" | "unreviewed" | "reviewed";

interface Question {
  id: number;
  subject: Subject;
  subjectName: string;
  topic: string;
  question: string;
  myAnswer: string;
  correctAnswer: string;
  errorReason: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  date: string;
  reviewed: boolean;
  tags: string[];
  imageUrl?: string;
  imageAlt?: string;
}

interface SubjectConfig {
  name: string;
  emoji: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

const SUBJECT_CONFIG: Record<Subject | "all", SubjectConfig> = {
  all: {
    name: "全部科目",
    emoji: "📚",
    textColor: "var(--color\\/text\\/color-text-brand-default)",
    bgColor: "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-brand)",
  },
  math: {
    name: "高等数学",
    emoji: "📐",
    textColor: "var(--color\\/text\\/color-text-brand-default)",
    bgColor: "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-brand)",
  },
  linear: {
    name: "线性代数",
    emoji: "🔢",
    textColor: "var(--color\\/text\\/color-text-success-default)",
    bgColor: "var(--color\\/bg\\/success\\/color-bg-success-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-success)",
  },
  prob: {
    name: "概率论",
    emoji: "🎲",
    textColor: "var(--color\\/text\\/color-text-warning-default)",
    bgColor: "var(--color\\/bg\\/warning\\/color-bg-warning-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-warning)",
  },
  english: {
    name: "英语四六级",
    emoji: "🔤",
    textColor: "var(--color\\/text\\/color-text-error-default)",
    bgColor: "var(--color\\/bg\\/error\\/color-bg-error-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-error)",
  },
  major: {
    name: "专业课",
    emoji: "💡",
    textColor: "var(--color\\/text\\/color-text-redpurple-default)",
    bgColor: "var(--color\\/bg\\/redpurple\\/color-bg-redpurple-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-discovery)",
  },
  physics: {
    name: "物理实验",
    emoji: "🔬",
    textColor: "var(--color\\/text\\/color-text-skyblue-default)",
    bgColor: "var(--color\\/bg\\/skyblue\\/color-bg-skyblue-subtlest)",
    borderColor: "var(--color\\/border\\/color-border-info)",
  },
};

const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    subject: "math",
    subjectName: "高等数学",
    topic: "多元函数极值",
    question: "求函数 f(x,y) = x³ + y³ - 3xy 的极值点及极值",
    myAnswer:
      "令 ∂f/∂x = 3x² - 3y = 0，∂f/∂y = 3y² - 3x = 0，只找到了驻点 (1,1)，判断为极小值 -1",
    correctAnswer:
      "驻点为 (0,0) 和 (1,1)。\n(0,0) 处：A=0, B=-3, C=0，AC-B²=-9<0，不是极值点\n(1,1) 处：A=6, B=-3, C=6，AC-B²=27>0，A>0，极小值点，f(1,1)=-1",
    errorReason: "解方程组时遗漏了零解 (0,0)，导致少了一个驻点的判断",
    difficulty: 4,
    date: "2024-03-18",
    reviewed: false,
    tags: ["偏导数", "极值判断", "多元函数"],
  },
  {
    id: 2,
    subject: "math",
    subjectName: "高等数学",
    topic: "定积分 · 分部积分法",
    question: "计算定积分 ∫₀¹ x²eˣ dx",
    myAnswer: "用分部积分一次，令 u=x²，dv=eˣdx，最终结果写成 2e-2",
    correctAnswer:
      "需两次分部积分：\n∫₀¹ x²eˣ dx = [x²eˣ]₀¹ - 2∫₀¹ xeˣ dx\n= e - 2([xeˣ]₀¹ - ∫₀¹ eˣ dx)\n= e - 2(e - (e-1)) = e - 2",
    errorReason: "第二次分部积分化简时符号出错，多了一倍",
    difficulty: 3,
    date: "2024-03-15",
    reviewed: true,
    tags: ["定积分", "分部积分"],
  },
  {
    id: 3,
    subject: "linear",
    subjectName: "线性代数",
    topic: "特征值与特征向量",
    question: "求矩阵 A = [[4,1],[2,3]] 的特征值及对应特征向量",
    myAnswer:
      "特征多项式正确，λ₁=2，λ₂=5。特征向量写成 λ₁→(1,-2)ᵀ，λ₂→(1,1)ᵀ",
    correctAnswer:
      "λ₁=2：解 (A-2I)x=0，特征向量为 k(-1,2)ᵀ（k≠0）\nλ₂=5：解 (A-5I)x=0，特征向量为 k(1,1)ᵀ（k≠0）",
    errorReason: "λ₁=2 对应的特征向量方向写反了，应为 (-1,2)ᵀ 而非 (1,-2)ᵀ",
    difficulty: 3,
    date: "2024-03-14",
    reviewed: false,
    tags: ["特征值", "特征向量"],
  },
  {
    id: 4,
    subject: "prob",
    subjectName: "概率论",
    topic: "正态分布概率计算",
    question: "X~N(2,4)，求 P(0<X<4)",
    myAnswer: "P(0<X<4) = Φ(4) - Φ(0)，结果约为 0.5",
    correctAnswer:
      "X~N(2,4) 即 μ=2，σ²=4，σ=2\nP(0<X<4) = P(-1<Z<1) = 2Φ(1)-1 = 2×0.8413-1 ≈ 0.6826",
    errorReason: "未标准化，忘记除以标准差 σ=2",
    difficulty: 2,
    date: "2024-03-10",
    reviewed: true,
    tags: ["正态分布", "标准化"],
  },
  {
    id: 5,
    subject: "english",
    subjectName: "英语四六级",
    topic: "虚拟语气",
    question: 'If I ___ you, I would study harder. (be / were)',
    myAnswer: "填 be，认为 if 从句中动词用原形",
    correctAnswer:
      "应填 were。与现在事实相反的虚拟语气中，be 动词统一用 were，不论主语人称",
    errorReason:
      "混淆虚拟语气与一般条件句。虚拟条件从句用过去时，be 动词统一 were",
    difficulty: 2,
    date: "2024-03-08",
    reviewed: false,
    tags: ["虚拟语气", "语法"],
  },
  {
    id: 6,
    subject: "major",
    subjectName: "专业课",
    topic: "数据结构 · 二叉树还原",
    question: "已知后序遍历 DBEFCA 和中序遍历 DBEACF，还原二叉树结构",
    myAnswer: "后序末尾 A 为根，中序定位后，左右子树内部结构搞错了",
    correctAnswer:
      "根为 A（后序末位）\n左子树：中序 DBE，后序 DBE→根 E，左孩子 D，右孩子 B\n右子树：中序 CF，后序 CF→根 C，右孩子 F\n递归逐层分解即可",
    errorReason:
      "左子树内部后序末位确认局部根节点时混淆了分割方式",
    difficulty: 4,
    date: "2024-03-05",
    reviewed: false,
    tags: ["二叉树", "遍历", "递归"],
  },
  {
    id: 7,
    subject: "physics",
    subjectName: "物理实验",
    topic: "RC电路充放电实验",
    question: "用示波器观测RC串联电路的充放电波形，测量时间常数 τ，实验结果与理论值偏差超过15%，分析原因。",
    myAnswer: "只考虑了电阻R和电容C的标称值，直接用 τ=RC 计算，未做任何修正",
    correctAnswer:
      "偏差来源有三：\n① 示波器探头本身有输入电阻（通常 1MΩ），与电路R并联后改变了等效电阻\n② 电容和电阻实际值与标称值有误差（需用万用表实测）\n③ 接触电阻和导线电感在高频下不可忽略\n正确做法：用万用表实测R、C值，再计算 τ=RC 理论值，并与波形法测得的 τ（63.2%充电电压对应时刻）比对",
    errorReason: "忽略了测量仪器本身对电路的影响，以及元件标称值与实际值的偏差",
    difficulty: 3,
    date: "2024-03-20",
    reviewed: false,
    tags: ["RC电路", "示波器", "时间常数"],
    imageUrl: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&q=80",
    imageAlt: "RC电路实验：电路板与测试仪器",
  },
  {
    id: 8,
    subject: "physics",
    subjectName: "物理实验",
    topic: "单摆测重力加速度",
    question: "用单摆法测定本地重力加速度 g，多次测量后结果为 9.62 m/s²，与标准值 9.80 m/s² 偏差较大，找出误差来源。",
    myAnswer: "记录了30次全振动的时间，用 T=t/30，然后代入 g=4π²L/T² 计算，摆长L用直尺量到悬挂点",
    correctAnswer:
      "误差来源分析：\n① 摆长应从悬点量到摆球质心，而非摆球顶端，若摆球直径 d=2cm，则摆长少算了约1cm\n② 摆角超过5°时，单摆近似公式引入非线性误差（应保持θ<5°）\n③ 计时起点选在摆球运动速度最慢处（端点）更难判断，应在平衡位置计时\n修正后：实测L加上半径修正，g≈9.79 m/s²，与标准值吻合",
    errorReason: "摆长测量从悬点到球顶而非球心，且摆角偏大（约10°），两项误差叠加",
    difficulty: 2,
    date: "2024-03-17",
    reviewed: true,
    tags: ["单摆", "重力加速度", "误差分析"],
    imageUrl: "https://images.unsplash.com/photo-1633493702341-4d04841df53b?w=800&q=80",
    imageAlt: "单摆实验：牛顿摆演示装置",
  },
  {
    id: 9,
    subject: "physics",
    subjectName: "物理实验",
    topic: "光的折射定律验证",
    question: "用激光笔和玻璃砖验证斯涅尔定律 n₁sinθ₁=n₂sinθ₂，测得折射率 n=1.38，但玻璃砖理论值约为1.50，偏差约8%，原因何在？",
    myAnswer: "用量角器直接量了入射角和折射角，取了三组数据求平均，认为操作无误",
    correctAnswer:
      "偏差来源：\n① 量角器分度值1°，读数误差本身就有±0.5°，在入射角30°附近，角度误差对 sinθ 影响约1.5%\n② 激光光斑有一定宽度，光线中心位置判断不准\n③ 玻璃砖表面若有划痕或油脂，会产生漫反射，影响折射光线的方向判定\n正确做法：用插针法多次取点确定光线方向，而非直接量角；并保证玻璃砖表面洁净",
    errorReason: "直接目测激光线方向并用量角器测角，系统误差和读数误差均未控制，应改用插针法",
    difficulty: 3,
    date: "2024-03-12",
    reviewed: false,
    tags: ["折射定律", "斯涅尔定律", "光学"],
    imageUrl: "https://images.unsplash.com/photo-1649290098499-f4148542f2e0?w=800&q=80",
    imageAlt: "光的折射实验：棱镜分光效果",
  },
  {
    id: 10,
    subject: "physics",
    subjectName: "物理实验",
    topic: "狭义相对论 · 质能方程与动质量",
    question: "一个静止质量为 m₀ 的粒子，以速度 v=0.8c 运动时，其总能量 E、动能 Eₖ 和动量 p 各是多少？（c 为光速）",
    myAnswer:
      "直接套经典力学公式：\nE = ½m₀v² = ½m₀(0.8c)² = 0.32m₀c²\np = m₀v = 0.8m₀c\n认为动能就是总能量",
    correctAnswer:
      "需用相对论公式，先求洛伦兹因子：\nγ = 1/√(1−v²/c²) = 1/√(1−0.64) = 1/0.6 ≈ 1.667\n\n相对论动质量：m = γm₀ ≈ 1.667m₀\n\n总能量（含静止能量）：\nE = γm₀c² ≈ 1.667m₀c²\n\n静止能量：E₀ = m₀c²\n\n相对论动能：\nEₖ = E − E₀ = (γ−1)m₀c² ≈ 0.667m₀c²\n\n相对论动量：\np = γm₀v = 1.667×m₀×0.8c ≈ 1.333m₀c\n\n注意：经典动能 0.32m₀c² 与相对论动能 0.667m₀c² 相差超过一倍！",
    errorReason:
      "在 v=0.8c 的高速条件下经典力学完全失效，必须引入洛伦兹因子 γ。忘记区分静止能量与动能，且混淆了相对论动质量 γm₀ 与静止质量 m₀",
    difficulty: 4,
    date: "2024-03-22",
    reviewed: false,
    tags: ["相对论", "质能方程", "洛伦兹因子", "动质量"],
    imageUrl: "https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=800&q=80",
    imageAlt: "E=mc² 质能方程黑板板书",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: number }) {
  const labels = ["", "简单", "较易", "中等", "较难", "困难"];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((dot) => (
          /* using raw <span> for dot indicator: no kit component for difficulty rating exists */
          <span
            key={dot}
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              backgroundColor:
                dot <= level
                  ? level <= 2
                    ? "var(--color\\/text\\/color-text-success-default)"
                    : level === 3
                    ? "var(--color\\/text\\/color-text-warning-default)"
                    : "var(--color\\/text\\/color-text-error-default)"
                  : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
            }}
          />
        ))}
      </div>
      <span
        className="mark-small"
        style={{
          color:
            level <= 2
              ? "var(--color\\/text\\/color-text-success-default)"
              : level === 3
              ? "var(--color\\/text\\/color-text-warning-default)"
              : "var(--color\\/text\\/color-text-error-default)",
        }}
      >
        {labels[level]}
      </span>
    </div>
  );
}

function SubjectTag({ subject }: { subject: Subject }) {
  const cfg = SUBJECT_CONFIG[subject];
  return (
    /* using raw <span> for tag: no kit Tag/Badge component in component catalog */
    <span
      className="mark-small inline-flex items-center gap-1 px-2 rounded"
      style={{
        color: cfg.textColor,
        backgroundColor: cfg.bgColor,
        border: `1px solid ${cfg.borderColor}`,
        paddingTop: 2,
        paddingBottom: 2,
      }}
    >
      {cfg.emoji} {cfg.name}
    </span>
  );
}

function AddQuestionModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (q: Question) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [form, setForm] = useState({
    subject: "math" as Subject,
    topic: "",
    question: "",
    myAnswer: "",
    correctAnswer: "",
    errorReason: "",
    difficulty: 3 as 1 | 2 | 3 | 4 | 5,
    tags: "",
  });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const safeClose = () => {
    stopCamera();
    onClose();
  };

  const inferTopic = (recognizedText: string) => {
    const firstLine = recognizedText
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);
    if (!firstLine) return "";
    return firstLine.slice(0, 20);
  };

  const runOcrAndApply = async (imageDataUrl: string) => {
    setIsRecognizing(true);
    setOcrError("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("chi_sim+eng");
      const result = await worker.recognize(imageDataUrl);
      await worker.terminate();

      const raw = (result?.data?.text ?? "").replace(/\r/g, "").trim();
      if (!raw) {
        setOcrError("没有识别到文字，请换个角度重试");
        return;
      }

      const splitMarker =
        raw.search(/(正确答案|参考答案|答案[:：]|解析[:：]|解[:：])/) ?? -1;
      const questionText =
        splitMarker > 0 ? raw.slice(0, splitMarker).trim() : raw;
      const answerText = splitMarker > 0 ? raw.slice(splitMarker).trim() : "";

      setForm((prev) => ({
        ...prev,
        topic: prev.topic || inferTopic(questionText),
        question: prev.question || questionText,
        correctAnswer: prev.correctAnswer || answerText,
      }));
    } catch {
      setOcrError("文字识别失败，请检查网络后重试");
    } finally {
      setIsRecognizing(false);
    }
  };

  const startCamera = async () => {
    setCameraError("");
    setOcrError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setCapturedImage("");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);
    } catch {
      setCameraError("无法打开摄像头，请允许浏览器摄像头权限");
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(imageData);
    stopCamera();
    await runOcrAndApply(imageData);
  };

  const handleSubmit = () => {
    if (!form.topic || !form.question) return;
    const cfg = SUBJECT_CONFIG[form.subject];
    onAdd({
      id: Date.now(),
      subject: form.subject,
      subjectName: cfg.name,
      topic: form.topic,
      question: form.question,
      myAnswer: form.myAnswer,
      correctAnswer: form.correctAnswer,
      errorReason: form.errorReason,
      difficulty: form.difficulty,
      date: new Date().toISOString().slice(0, 10),
      reviewed: false,
      tags: form.tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
    safeClose();
  };

  const inputStyle = {
    width: "100%",
    backgroundColor: "var(--color\\/bg\\/container\\/color-bg-container-default)",
    border: "1px solid var(--color\\/border\\/color-border-input)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--color\\/text\\/color-text-primary)",
    outline: "none",
    resize: "vertical" as const,
  };

  return (
    /* using raw <div> overlay: no kit Modal/Dialog component in component catalog */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "var(--color\\/mask\\/color-mask-default)" }}
      onClick={(e) => e.target === e.currentTarget && safeClose()}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 560,
          maxHeight: "90vh",
          backgroundColor:
            "var(--color\\/bg\\/container\\/color-bg-container-default)",
          borderRadius: 16,
          border:
            "1px solid var(--color\\/border\\/color-border-default)",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom:
              "1px solid var(--color\\/border\\/color-border-default)",
          }}
        >
          <span
            className="title-large"
            style={{
              color: "var(--color\\/text\\/color-text-primary)",
            }}
          >
            添加错题
          </span>
          {/* using raw <button>: no kit IconButton/CloseButton component */}
          <button
            onClick={safeClose}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color\\/icon\\/color-icon-secondary)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          {/* Camera OCR */}
          <div
            className="flex flex-col gap-2 rounded-xl p-3"
            style={{
              backgroundColor:
                "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
              border: "1px solid var(--color\\/border\\/color-border-brand)",
            }}
          >
            <span
              className="title-small"
              style={{ color: "var(--color\\/text\\/color-text-brand-default)" }}
            >
              拍照识别错题
            </span>
            <span
              className="body-mini-s"
              style={{ color: "var(--color\\/text\\/color-text-secondary)" }}
            >
              点击拍照后自动识别文字，并填充到题目与答案栏
            </span>

            {!cameraOpen && (
              <button
                onClick={startCamera}
                className="body-small flex items-center justify-center gap-1.5 rounded-lg"
                style={{
                  border: "none",
                  backgroundColor: "var(--brand\\/--brand-color)",
                  color: "var(--color\\/text\\/color-text-anti)",
                  cursor: "pointer",
                  padding: "8px 12px",
                }}
              >
                <Camera size={14} />
                打开摄像头
              </button>
            )}

            {cameraOpen && (
              <div className="flex flex-col gap-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid var(--color\\/border\\/color-border-brand)",
                    maxHeight: 240,
                    objectFit: "cover",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={captureAndRecognize}
                    className="body-small flex items-center justify-center gap-1.5 rounded-lg"
                    style={{
                      border: "none",
                      backgroundColor: "var(--brand\\/--brand-color)",
                      color: "var(--color\\/text\\/color-text-anti)",
                      cursor: "pointer",
                      padding: "8px 12px",
                      flex: 1,
                    }}
                  >
                    <ScanText size={14} />
                    拍照并识别
                  </button>
                  <button
                    onClick={stopCamera}
                    className="body-small rounded-lg"
                    style={{
                      border:
                        "1px solid var(--color\\/border\\/color-border-default)",
                      backgroundColor:
                        "var(--color\\/bg\\/container\\/color-bg-container-default)",
                      color: "var(--color\\/text\\/color-text-secondary)",
                      cursor: "pointer",
                      padding: "8px 12px",
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {capturedImage && !cameraOpen && (
              <img
                src={capturedImage}
                alt="拍照识别预览"
                className="w-full rounded-lg object-cover"
                style={{
                  maxHeight: 180,
                  border: "1px solid var(--color\\/border\\/color-border-default)",
                }}
              />
            )}

            {isRecognizing && (
              <span
                className="body-mini-s"
                style={{ color: "var(--color\\/text\\/color-text-brand-default)" }}
              >
                正在识别文字，请稍候...
              </span>
            )}
            {cameraError && (
              <span
                className="body-mini-s"
                style={{ color: "var(--color\\/text\\/color-text-error-default)" }}
              >
                {cameraError}
              </span>
            )}
            {ocrError && (
              <span
                className="body-mini-s"
                style={{ color: "var(--color\\/text\\/color-text-error-default)" }}
              >
                {ocrError}
              </span>
            )}
          </div>

          {/* Subject + Difficulty row */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5" style={{ flex: 1 }}>
              <span
                className="title-small"
                style={{
                  color: "var(--color\\/text\\/color-text-secondary)",
                }}
              >
                科目
              </span>
              {/* using raw <select>: no kit SelectField component in component catalog */}
              <select
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value as Subject }))
                }
                className="body-medium"
                style={{ ...inputStyle, resize: "none" }}
              >
                {(
                  Object.entries(SUBJECT_CONFIG).filter(
                    ([k]) => k !== "all"
                  ) as [Subject, SubjectConfig][]
                ).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.emoji} {cfg.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span
                className="title-small"
                style={{
                  color: "var(--color\\/text\\/color-text-secondary)",
                }}
              >
                难度
              </span>
              <div className="flex gap-1" style={{ paddingTop: 6 }}>
                {([1, 2, 3, 4, 5] as const).map((d) => (
                  /* using raw <button> for difficulty picker: no kit Rating component */
                  <button
                    key={d}
                    onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    <Star
                      size={20}
                      style={{
                        fill:
                          d <= form.difficulty
                            ? "var(--color\\/text\\/color-text-warning-default)"
                            : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                        color:
                          d <= form.difficulty
                            ? "var(--color\\/text\\/color-text-warning-default)"
                            : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Topic */}
          <div className="flex flex-col gap-1.5">
            <span
              className="title-small"
              style={{ color: "var(--color\\/text\\/color-text-secondary)" }}
            >
              题目类型 / 知识点
            </span>
            {/* using raw <input>: no kit TextField component in component catalog */}
            <input
              type="text"
              placeholder="如：多元函数极值、虚拟语气…"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              className="body-medium"
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* Question */}
          <div className="flex flex-col gap-1.5">
            <span
              className="title-small"
              style={{ color: "var(--color\\/text\\/color-text-secondary)" }}
            >
              题目内容
            </span>
            {/* using raw <textarea>: no kit Textarea component in component catalog */}
            <textarea
              rows={3}
              placeholder="粘贴或输入题目原文…"
              value={form.question}
              onChange={(e) =>
                setForm((f) => ({ ...f, question: e.target.value }))
              }
              className="body-medium"
              style={inputStyle}
            />
          </div>

          {/* My Answer */}
          <div className="flex flex-col gap-1.5">
            <span
              className="title-small"
              style={{ color: "var(--color\\/text\\/color-text-error-default)" }}
            >
              我的错误答案
            </span>
            <textarea
              rows={2}
              placeholder="写下你当时的解题过程或答案…"
              value={form.myAnswer}
              onChange={(e) =>
                setForm((f) => ({ ...f, myAnswer: e.target.value }))
              }
              className="body-medium"
              style={{
                ...inputStyle,
                borderColor:
                  "var(--color\\/border\\/color-border-error-subtler)",
              }}
            />
          </div>

          {/* Correct Answer */}
          <div className="flex flex-col gap-1.5">
            <span
              className="title-small"
              style={{
                color: "var(--color\\/text\\/color-text-success-default)",
              }}
            >
              正确答案
            </span>
            <textarea
              rows={3}
              placeholder="写下正确的解题步骤和答案…"
              value={form.correctAnswer}
              onChange={(e) =>
                setForm((f) => ({ ...f, correctAnswer: e.target.value }))
              }
              className="body-medium"
              style={{
                ...inputStyle,
                borderColor:
                  "var(--color\\/border\\/color-border-success-subtler)",
              }}
            />
          </div>

          {/* Error Reason */}
          <div className="flex flex-col gap-1.5">
            <span
              className="title-small"
              style={{ color: "var(--color\\/text\\/color-text-secondary)" }}
            >
              错误原因分析
            </span>
            <textarea
              rows={2}
              placeholder="总结出错的根本原因…"
              value={form.errorReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, errorReason: e.target.value }))
              }
              className="body-medium"
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <span
              className="title-small"
              style={{ color: "var(--color\\/text\\/color-text-secondary)" }}
            >
              标签（用逗号分隔）
            </span>
            <input
              type="text"
              placeholder="如：偏导数, 极值, 多元函数"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="body-medium"
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex justify-end gap-3 px-6 py-4"
          style={{
            borderTop: "1px solid var(--color\\/border\\/color-border-default)",
          }}
        >
          {/* using raw <button>: no kit Button component in component catalog */}
          <button
            onClick={safeClose}
            className="body-medium"
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border:
                "1px solid var(--color\\/border\\/color-border-default)",
              backgroundColor:
                "var(--color\\/bg\\/container\\/color-bg-container-default)",
              color: "var(--color\\/text\\/color-text-secondary)",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="body-medium"
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "var(--brand\\/--brand-color)",
              color: "var(--color\\/text\\/color-text-anti)",
              cursor: "pointer",
            }}
          >
            保存错题
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  onToggleReviewed,
  onDelete,
}: {
  question: Question;
  onToggleReviewed: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showViz, setShowViz] = useState(false);
  const cfg = SUBJECT_CONFIG[question.subject];

  return (
    /* using raw <div> card: no kit Card component in component catalog */
    <div
      className="flex flex-col"
      style={{
        backgroundColor:
          "var(--color\\/bg\\/container\\/color-bg-container-default)",
        border: "1px solid var(--color\\/border\\/color-border-default)",
        borderRadius: 12,
        overflow: "hidden",
        borderLeft: `3px solid ${cfg.borderColor}`,
      }}
    >
      {/* Card header */}
      <div className="flex flex-col gap-3 p-5">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <SubjectTag subject={question.subject} />
            <span
              className="title-small"
              style={{
                color: "var(--color\\/text\\/color-text-secondary)",
              }}
            >
              {question.topic}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DifficultyDots level={question.difficulty} />
            <div
              className="flex items-center gap-1"
              style={{
                color: "var(--color\\/text\\/color-text-placeholder)",
              }}
            >
              <Calendar size={12} />
              <span className="body-mini-s">{question.date}</span>
            </div>
          </div>
        </div>

        {/* Question text */}
        <p
          className="body-medium"
          style={{ color: "var(--color\\/text\\/color-text-primary)" }}
        >
          {question.question}
        </p>

        {/* Question image — shown for questions with visual context */}
        {question.imageUrl && (
          /* using raw <img>: no kit ImageWithFallback needed — URL is remote Unsplash, not a project asset */
          <img
            src={question.imageUrl}
            alt={question.imageAlt ?? "实验参考图"}
            className="w-full rounded-lg object-cover"
            style={{
              height: 180,
              border: `1px solid var(--color\\/border\\/color-border-default)`,
            }}
          />
        )}

        {/* Tags */}
        {question.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {question.tags.map((tag) => (
              /* using raw <span> for tag chip: no kit Chip component */
              <span
                key={tag}
                className="mark-small inline-flex items-center gap-1"
                style={{
                  color: "var(--color\\/text\\/color-text-placeholder)",
                  backgroundColor:
                    "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            {/* Toggle reviewed */}
            <button
              onClick={() => onToggleReviewed(question.id)}
              className="flex items-center gap-1.5"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: question.reviewed
                  ? "var(--color\\/text\\/color-text-success-default)"
                  : "var(--color\\/text\\/color-text-placeholder)",
              }}
            >
              {question.reviewed ? (
                <CheckCircle2 size={16} />
              ) : (
                <Circle size={16} />
              )}
              <span className="body-small">
                {question.reviewed ? "已复习" : "标记复习"}
              </span>
            </button>

            {/* Expand/collapse */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--color\\/text\\/color-text-brand-default)",
              }}
            >
              <span className="body-small">
                {expanded ? "收起" : "查看解析"}
              </span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(question.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              color: "var(--color\\/text\\/color-text-placeholder)",
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded answer section */}
      {expanded && (
        <div
          className="flex flex-col gap-4 px-5 pb-5"
          style={{
            borderTop:
              "1px solid var(--color\\/border\\/color-border-default)",
            paddingTop: 16,
          }}
        >
          {/* My wrong answer */}
          <div className="flex flex-col gap-1.5">
            <span
              className="mark-small"
              style={{
                color: "var(--color\\/text\\/color-text-error-default)",
              }}
            >
              ✗ 我的错误思路
            </span>
            <div
              className="body-small"
              style={{
                backgroundColor:
                  "var(--color\\/bg\\/error\\/color-bg-error-subtlest)",
                border:
                  "1px solid var(--color\\/border\\/color-border-error-subtler)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "var(--color\\/text\\/color-text-primary)",
                whiteSpace: "pre-line",
              }}
            >
              {question.myAnswer}
            </div>
          </div>

          {/* Correct answer */}
          <div className="flex flex-col gap-1.5">
            <span
              className="mark-small"
              style={{
                color: "var(--color\\/text\\/color-text-success-default)",
              }}
            >
              ✓ 正确解法
            </span>
            <div
              className="body-small"
              style={{
                backgroundColor:
                  "var(--color\\/bg\\/success\\/color-bg-success-subtlest)",
                border:
                  "1px solid var(--color\\/border\\/color-border-success-subtler)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "var(--color\\/text\\/color-text-primary)",
                whiteSpace: "pre-line",
              }}
            >
              {question.correctAnswer}
            </div>
          </div>

          {/* Error reason */}
          <div className="flex flex-col gap-1.5">
            <span
              className="mark-small"
              style={{
                color: "var(--color\\/text\\/color-text-warning-default)",
              }}
            >
              ⚠ 出错原因
            </span>
            <div
              className="body-small"
              style={{
                backgroundColor:
                  "var(--color\\/bg\\/warning\\/color-bg-warning-subtlest)",
                border:
                  "1px solid var(--color\\/border\\/color-border-warning-subtler)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "var(--color\\/text\\/color-text-primary)",
              }}
            >
              {question.errorReason}
            </div>
          </div>

          {/* Experiment visualization button — shown only for questions with a viz */}
          {VIZ_SUPPORTED_IDS.has(question.id) && (
            /* raw <button>: no kit button component exists per components.md */
            <button
              onClick={() => setShowViz(true)}
              className="mark-small flex items-center gap-1.5 w-full justify-center py-2.5 rounded-lg"
              style={{
                border: "1px solid var(--color\\/border\\/color-border-brand)",
                backgroundColor:
                  "var(--color\\/bg\\/brand\\/color-bg-brand-subtlest)",
                color: "var(--color\\/text\\/color-text-brand-default)",
                cursor: "pointer",
              }}
            >
              🔬 实验可视化
            </button>
          )}
        </div>
      )}

      {showViz && (
        <ExperimentModal
          questionId={question.id}
          topic={question.topic}
          onClose={() => setShowViz(false)}
        />
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [selectedSubject, setSelectedSubject] = useState<Subject | "all">("all");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const subjectCounts = {
    all: questions.length,
    math: questions.filter((q) => q.subject === "math").length,
    linear: questions.filter((q) => q.subject === "linear").length,
    prob: questions.filter((q) => q.subject === "prob").length,
    english: questions.filter((q) => q.subject === "english").length,
    major: questions.filter((q) => q.subject === "major").length,
    physics: questions.filter((q) => q.subject === "physics").length,
  };

  const reviewedCount = questions.filter((q) => q.reviewed).length;
  const unreviewedCount = questions.length - reviewedCount;

  const filteredQuestions = questions.filter((q) => {
    const subjectMatch =
      selectedSubject === "all" || q.subject === selectedSubject;
    const tabMatch =
      activeTab === "all" ||
      (activeTab === "reviewed" && q.reviewed) ||
      (activeTab === "unreviewed" && !q.reviewed);
    const searchMatch =
      !searchQuery ||
      q.question.includes(searchQuery) ||
      q.topic.includes(searchQuery) ||
      q.subjectName.includes(searchQuery) ||
      q.tags.some((t) => t.includes(searchQuery));
    return subjectMatch && tabMatch && searchMatch;
  });

  const handleAdd = (q: Question) => {
    setQuestions((prev) => [q, ...prev]);
  };

  const handleToggleReviewed = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, reviewed: !q.reviewed } : q))
    );
  };

  const handleDelete = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "全部", count: questions.length },
    { key: "unreviewed", label: "待复习", count: unreviewedCount },
    { key: "reviewed", label: "已复习", count: reviewedCount },
  ];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        backgroundColor: "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
        fontFamily: '"PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* MARKER-MAKE-KIT-INVOKED */}
      {/* MARKER-MAKE-KIT-DISCOVERY-READ */}
      {/* MARKER-MAKE-KIT-TOKENS-READ */}
      {/* MARKER-MAKE-KIT-FINAL-CHECK-READ */}
      {/* ── Sidebar ── */}
      {/* using raw <aside>: no kit SidebarNavigation component in component catalog */}
      <aside
        className="flex flex-col h-full overflow-y-auto flex-shrink-0"
        style={{
          width: 252,
          backgroundColor:
            "var(--color\\/bg\\/container\\/color-bg-container-default)",
          borderRight:
            "1px solid var(--color\\/border\\/color-border-default)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center gap-2.5 px-5 py-5"
          style={{
            borderBottom:
              "1px solid var(--color\\/border\\/color-border-default)",
          }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              backgroundColor: "var(--brand\\/--brand-color)",
            }}
          >
            <BookOpen size={18} color="white" />
          </div>
          <div className="flex flex-col">
            <span
              className="title-medium"
              style={{
                color: "var(--color\\/text\\/color-text-primary)",
              }}
            >
              错题本
            </span>
            <span
              className="body-mini-s"
              style={{
                color: "var(--color\\/text\\/color-text-placeholder)",
              }}
            >
              大学课程错题整理
            </span>
          </div>
        </div>

        {/* Subject nav */}
        <nav className="flex flex-col gap-1 px-3 py-4">
          <span
            className="mark-small px-2 mb-1"
            style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}
          >
            按科目筛选
          </span>
          {(["all", "math", "linear", "prob", "english", "major", "physics"] as const).map(
            (subj) => {
              const cfg = SUBJECT_CONFIG[subj];
              const count = subjectCounts[subj];
              const isActive = selectedSubject === subj;
              return (
                /* using raw <button> for nav item: no kit SidebarButton/NavItem component */
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg w-full text-left"
                  style={{
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? cfg.bgColor
                      : "transparent",
                    transition: "background-color 0.15s",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
                    <span
                      className="body-medium"
                      style={{
                        color: isActive
                          ? cfg.textColor
                          : "var(--color\\/text\\/color-text-secondary)",
                      }}
                    >
                      {cfg.name}
                    </span>
                  </div>
                  <span
                    className="mark-small"
                    style={{
                      color: isActive
                        ? cfg.textColor
                        : "var(--color\\/text\\/color-text-placeholder)",
                      backgroundColor: isActive
                        ? cfg.bgColor
                        : "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
                      padding: "1px 7px",
                      borderRadius: 999,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </nav>

        {/* Sidebar stats */}
        <div
          className="mt-auto mx-3 mb-4 flex flex-col gap-3 p-4 rounded-xl"
          style={{
            backgroundColor:
              "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
          }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: "var(--color\\/icon\\/color-icon-brand-default)" }} />
            <span
              className="title-small"
              style={{
                color: "var(--color\\/text\\/color-text-secondary)",
              }}
            >
              复习进度
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}>
                总错题数
              </span>
              <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-primary)" }}>
                {questions.length} 题
              </span>
            </div>
            <div className="flex justify-between">
              <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}>
                已复习
              </span>
              <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-success-default)" }}>
                {reviewedCount} 题
              </span>
            </div>
            <div className="flex justify-between">
              <span className="body-mini-s" style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}>
                待复习
              </span>
              <span className="mark-small" style={{ color: "var(--color\\/text\\/color-text-error-default)" }}>
                {unreviewedCount} 题
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div
            className="rounded-full overflow-hidden"
            style={{
              height: 6,
              backgroundColor:
                "var(--color\\/bg\\/component\\/color-bg-conponent-secondary-default)",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${questions.length > 0 ? Math.round((reviewedCount / questions.length) * 100) : 0}%`,
                backgroundColor: "var(--color\\/bg\\/success\\/color-bg-success-default)",
                transition: "width 0.3s",
              }}
            />
          </div>
          <span className="body-mini" style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}>
            已完成{" "}
            {questions.length > 0
              ? Math.round((reviewedCount / questions.length) * 100)
              : 0}
            %
          </span>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-8 py-5 flex-shrink-0"
          style={{
            backgroundColor:
              "var(--color\\/bg\\/container\\/color-bg-container-default)",
            borderBottom:
              "1px solid var(--color\\/border\\/color-border-default)",
          }}
        >
          <div className="flex flex-col gap-0.5">
            <span
              className="headline-mini"
              style={{ color: "var(--color\\/text\\/color-text-primary)" }}
            >
              {SUBJECT_CONFIG[selectedSubject].name}
            </span>
            <span
              className="body-small"
              style={{ color: "var(--color\\/text\\/color-text-placeholder)" }}
            >
              共 {subjectCounts[selectedSubject]} 道错题
            </span>
          </div>
          {/* Add button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 title-small"
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "var(--brand\\/--brand-color)",
              color: "var(--color\\/text\\/color-text-anti)",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            添加错题
          </button>
        </div>

        {/* Filters */}
        <div
          className="flex items-center gap-4 px-8 py-4 flex-shrink-0"
          style={{
            backgroundColor:
              "var(--color\\/bg\\/container\\/color-bg-container-default)",
            borderBottom:
              "1px solid var(--color\\/border\\/color-border-default)",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 flex-1"
            style={{
              backgroundColor:
                "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
              border:
                "1px solid var(--color\\/border\\/color-border-input)",
              borderRadius: 8,
              padding: "7px 12px",
              maxWidth: 360,
            }}
          >
            <Search
              size={15}
              style={{
                color: "var(--color\\/icon\\/color-icon-placeholder)",
                flexShrink: 0,
              }}
            />
            {/* using raw <input>: no kit SearchField component in component catalog */}
            <input
              type="text"
              placeholder="搜索题目、知识点、标签…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="body-medium flex-1"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                color: "var(--color\\/text\\/color-text-primary)",
                minWidth: 0,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--color\\/icon\\/color-icon-placeholder)",
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div
            className="flex"
            style={{
              backgroundColor:
                "var(--color\\/bg\\/page\\/color-bg-page-level-2)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                /* using raw <button> for tab: no kit Tabs component in component catalog */
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 title-small"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? "var(--color\\/bg\\/container\\/color-bg-container-default)"
                      : "transparent",
                    color: isActive
                      ? "var(--color\\/text\\/color-text-primary)"
                      : "var(--color\\/text\\/color-text-secondary)",
                    boxShadow: isActive
                      ? "0 1px 3px rgba(2,4,24,0.08)"
                      : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                  <span
                    className="mark-small"
                    style={{
                      color: isActive
                        ? "var(--color\\/text\\/color-text-brand-default)"
                        : "var(--color\\/text\\/color-text-placeholder)",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {filteredQuestions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center"
              style={{ paddingTop: 80, gap: 12 }}
            >
              <GraduationCap
                size={48}
                style={{
                  color: "var(--color\\/icon\\/color-icon-disabled)",
                }}
              />
              <span
                className="title-medium"
                style={{
                  color: "var(--color\\/text\\/color-text-disabled)",
                }}
              >
                暂无错题记录
              </span>
              <span
                className="body-small"
                style={{
                  color: "var(--color\\/text\\/color-text-placeholder)",
                }}
              >
                {searchQuery ? "换个关键词试试" : "点击「添加错题」开始记录"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onToggleReviewed={handleToggleReviewed}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
        />
      )}

      {/* AI Assistant — fixed floating panel + FAB */}
      <AIAssistant />
    </div>
  );
}
