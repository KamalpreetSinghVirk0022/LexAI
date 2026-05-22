import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, BookOpen, FileText, FolderOpen, LineChart, Loader2, MessageSquare, Scale, ShieldCheck, Sparkles, TrendingUp, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const fallbackRightsTopics = [
  {
    id: 'fundamental-rights',
    title: 'Fundamental Rights',
    subtitle: 'Constitutional protections',
    summary: 'Understand equality, freedom, freedom of religion, and constitutional remedies in simple language.',
    sample_questions: ['What are the six fundamental rights in India?']
  },
  {
    id: 'rights-after-arrest',
    title: 'Rights After Arrest',
    subtitle: 'Protections during police action',
    summary: 'Learn what police must tell you, how long detention can last before court production, and your right to a lawyer.',
    sample_questions: ['What are my rights after arrest in India?']
  },
  {
    id: 'consumer-rights',
    title: 'Consumer Rights',
    subtitle: 'Protection against unfair practices',
    summary: 'See how to complain about defective products, poor services, and misleading advertisements.',
    sample_questions: ['What are my consumer rights in India?']
  }
];

const quickActions = [
  { label: 'Teach me my fundamental rights', query: 'Teach me about fundamental rights in India in simple language.', icon: ShieldCheck },
  { label: 'What are my rights after arrest?', query: 'What are my rights after arrest in India?', icon: Scale },
  { label: 'How can I get free legal aid?', query: 'How can I get free legal aid in India?', icon: Sparkles },
  { label: 'Help me prepare before uploading a legal document', query: 'Help me understand what legal points I should look for before uploading a document.', icon: Upload }
];

const topicBucketsConfig = [
  {
    label: 'Rights',
    terms: ['right', 'rights', 'article', 'constitution', 'legal aid', 'fundamental']
  },
  {
    label: 'Arrest',
    terms: ['arrest', 'bail', 'fir', 'police', 'custody']
  },
  {
    label: 'Consumer',
    terms: ['consumer', 'refund', 'defective', 'complaint', 'warranty']
  },
  {
    label: 'Cyber',
    terms: ['cyber', 'fraud', 'online', 'scam', 'hacking']
  }
];

const topicInsightContent = {
  Rights: {
    title: 'Rights learning is leading your activity',
    description: 'Users are spending the most time exploring constitutional protections and legal awareness topics.'
  },
  Arrest: {
    title: 'Arrest-related questions are trending',
    description: 'Police procedure, bail, and arrest safeguards are the most active topic in the current history.'
  },
  Consumer: {
    title: 'Consumer complaint issues stand out',
    description: 'Refunds, defective products, and service grievances are showing up most often in recent usage.'
  },
  Cyber: {
    title: 'Cyber legal help is most active',
    description: 'Fraud, scams, and online complaint guidance are driving the strongest recent activity.'
  }
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-bg-panel border border-border-color rounded-2xl p-4 min-h-[132px] flex flex-col justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
      </div>
    </div>
  );
}

function ActivityLineChart({ data }) {
  const width = 560;
  const height = 180;
  const padding = 18;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);

  const points = data.map((item, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((item.value / maxValue) * (height - padding * 2));
    return { ...item, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="bg-bg-panel border border-border-color rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Activity Trend</h3>
          <p className="text-sm text-text-secondary">Real question activity over the past 7 days</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
          Animated
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px] overflow-visible">
        {[0.25, 0.5, 0.75].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={padding + (height - padding * 2) * line}
            y2={padding + (height - padding * 2) * line}
            stroke="rgba(148, 163, 184, 0.14)"
            strokeWidth="1"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: 0,
            animation: 'dashReveal 1.2s ease-out'
          }}
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#6D5EF6" />
            <text x={point.x} y={height + 2} textAnchor="middle" fill="#8FA0C7" fontSize="11">
              {point.label}
            </text>
          </g>
        ))}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2DD4BF" />
            <stop offset="1" stopColor="#6D5EF6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function TopicBarChart({ data }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bg-bg-panel border border-border-color rounded-2xl p-5 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Topic Interest</h3>
        <p className="text-sm text-text-secondary">Derived from the user’s actual question history</p>
      </div>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{item.label}</span>
              <span className="text-text-secondary">{item.value}</span>
            </div>
            <div className="h-3 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  transformOrigin: 'left',
                  animation: `growBar 0.8s ease-out ${index * 0.08}s both`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RightsCard({ topic, onAsk }) {
  return (
    <div className="bg-bg-panel border border-border-color rounded-2xl p-4 flex flex-col min-h-[190px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{topic.title}</h3>
          <p className="text-xs text-text-secondary mt-1">{topic.subtitle}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} />
        </div>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed mt-4 flex-1">{topic.summary}</p>
      <button
        onClick={() => onAsk(topic.sample_questions?.[0] || `Teach me about ${topic.title} in simple language.`)}
        className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-primary hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
      >
        Learn This Right
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

function extractFileName(content) {
  if (!content?.startsWith('[FILE: ')) return null;
  return content.slice(7, -1);
}

export default function DashboardHome({ setCurrentChatId, setExternalQuery }) {
  const { user } = useAuth();
  const savedDocsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [rightsTopics, setRightsTopics] = useState(fallbackRightsTopics);
  const [recentChats, setRecentChats] = useState([]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [chatCount, setChatCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [activityData, setActivityData] = useState([]);
  const [topicData, setTopicData] = useState(topicBucketsConfig.map((bucket) => ({ label: bucket.label, value: 0 })));
  const [trendingQueries, setTrendingQueries] = useState([]);
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const rightsPromise = fetch(`${API_BASE_URL}/rights`)
          .then((response) => response.ok ? response.json() : [])
          .catch(() => []);

        const chatsPromise = supabase
          .from('chats')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const [rightsData, chatsResult] = await Promise.all([rightsPromise, chatsPromise]);
        const chats = chatsResult.data || [];

        setChatCount(chats.length);
        setRecentChats(chats.slice(0, 4));

        if (Array.isArray(rightsData) && rightsData.length > 0) {
          setRightsTopics(rightsData);
        }

        const chatIds = chats.map((chat) => chat.id);
        let messageList = [];

        if (chatIds.length > 0) {
          const { data: messages } = await supabase
            .from('messages')
            .select('chat_id, role, content, created_at')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false });

          messageList = messages || [];
        }

        const fileMessages = messageList
          .filter((message) => message.role === 'user' && message.content?.startsWith('[FILE: '))
          .map((message) => ({
            fileName: extractFileName(message.content),
            chatId: message.chat_id,
            createdAt: message.created_at
          }));

        setDocumentCount(fileMessages.length);
        setSavedDocs(fileMessages.slice(0, 6));

        const userQuestions = messageList.filter(
          (message) => message.role === 'user' && message.content && !message.content.startsWith('[FILE: ')
        );

        const now = new Date();
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dailyCounts = Array.from({ length: 7 }, (_, offset) => {
          const date = new Date(now);
          date.setDate(now.getDate() - (6 - offset));
          const label = dayLabels[date.getDay()];
          const key = date.toISOString().slice(0, 10);
          const value = userQuestions.filter((message) => message.created_at?.slice(0, 10) === key).length;
          return { label, value };
        });
        setActivityData(dailyCounts);

        const computedTopicData = topicBucketsConfig.map((bucket) => ({
          label: bucket.label,
          value: userQuestions.filter((message) => {
            const content = message.content.toLowerCase();
            return bucket.terms.some((term) => content.includes(term));
          }).length
        }));
        setTopicData(computedTopicData);

        const uniqueRecentQueries = [];
        const seenQueries = new Set();
        for (const message of userQuestions) {
          const normalized = message.content.trim().toLowerCase();
          if (!seenQueries.has(normalized)) {
            seenQueries.add(normalized);
            uniqueRecentQueries.push(message.content.trim());
          }
          if (uniqueRecentQueries.length === 4) break;
        }
        setTrendingQueries(uniqueRecentQueries);

        const dominantTopic = [...computedTopicData].sort((a, b) => b.value - a.value)[0];
        if (dominantTopic && dominantTopic.value > 0) {
          setInsight({
            label: dominantTopic.label,
            ...topicInsightContent[dominantTopic.label]
          });
        } else {
          setInsight(null);
        }
      } catch (error) {
        console.error('Dashboard loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const primaryRights = useMemo(() => rightsTopics.slice(0, 3), [rightsTopics]);

  const launchQuery = (query) => {
    setCurrentChatId(null);
    setExternalQuery(query);
  };

  const openSavedDocs = () => {
    savedDocsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-bg-primary px-5 py-5 sm:px-6 lg:px-8">
      <style>{`
        @keyframes dashReveal {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes growBar {
          from { transform: scaleX(0); opacity: 0.35; }
          to { transform: scaleX(1); opacity: 1; }
        }
        @keyframes fadeLift {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        <section
          className="rounded-[24px] border border-border-color bg-bg-panel px-6 py-7 lg:px-8"
          style={{ animation: 'fadeLift 0.45s ease-out both' }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles size={14} />
                Dashboard Home
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">Welcome back to LexAI</h1>
              <p className="mt-3 text-base sm:text-lg text-text-secondary leading-relaxed">
                Start with a rights explainer, review recent legal questions, inspect saved documents, or jump into a fresh chat. This dashboard now reflects actual usage instead of placeholder analytics.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => launchQuery('Help me with a new legal question.')}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  <MessageSquare size={16} />
                  Start New Chat
                </button>
                <button
                  onClick={() => launchQuery('Teach me about fundamental rights in India in simple language.')}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-color bg-bg-primary px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <ShieldCheck size={16} />
                  Know Your Rights
                </button>
                <button
                  onClick={openSavedDocs}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-color bg-bg-primary px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <FolderOpen size={16} />
                  See Saved Docs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0 lg:w-[420px]">
              <StatCard icon={BookOpen} label="Rights Topics" value={rightsTopics.length} accent="bg-emerald-500/10 text-emerald-400" />
              <StatCard icon={MessageSquare} label="Recent Chats" value={chatCount} accent="bg-primary/10 text-primary" />
              <StatCard icon={FileText} label="Saved Docs" value={documentCount} accent="bg-cyan-500/10 text-cyan-400" />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-border-color bg-bg-panel px-6 py-10 flex items-center justify-center gap-3 text-text-secondary">
            <Loader2 size={20} className="animate-spin" />
            Loading dashboard...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-6">
              <div style={{ animation: 'fadeLift 0.55s ease-out both' }}>
                <ActivityLineChart data={activityData} />
              </div>
              <div style={{ animation: 'fadeLift 0.65s ease-out both' }}>
                <TopicBarChart data={topicData} />
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="bg-bg-panel border border-border-color rounded-2xl p-5" style={{ animation: 'fadeLift 0.75s ease-out both' }}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">Rights Guide</h2>
                    <p className="text-sm text-text-secondary mt-1">Make the dashboard educational from the first click.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                    <ShieldCheck size={14} />
                    Learnable
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {primaryRights.map((topic) => (
                    <RightsCard key={topic.id} topic={topic} onAsk={launchQuery} />
                  ))}
                </div>
              </div>

              <div className="space-y-6" style={{ animation: 'fadeLift 0.85s ease-out both' }}>
                <div className="bg-bg-panel border border-border-color rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={18} className="text-primary" />
                    <h2 className="text-xl font-semibold text-text-primary">Recent Activity</h2>
                  </div>
                  <div className="space-y-3">
                    {recentChats.length > 0 ? recentChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setCurrentChatId(chat.id)}
                        className="w-full text-left rounded-xl border border-border-color bg-bg-primary px-4 py-3 hover:bg-bg-hover transition-colors"
                      >
                        <p className="text-sm font-medium text-text-primary truncate">{chat.title}</p>
                        <p className="text-xs text-text-secondary mt-1">{new Date(chat.created_at).toLocaleDateString()}</p>
                      </button>
                    )) : (
                      <div className="rounded-xl border border-border-color bg-bg-primary px-4 py-4 text-sm text-text-secondary">
                        No chats yet. Start with a rights guide or ask LexAI your first question.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-bg-panel border border-border-color rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-cyan-400" />
                    <h2 className="text-xl font-semibold text-text-primary">Quick Actions</h2>
                  </div>
                  <div className="space-y-3">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => launchQuery(action.query)}
                          className="w-full flex items-center gap-3 rounded-xl border border-border-color bg-bg-primary px-4 py-3 hover:bg-bg-hover transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary">{action.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="bg-bg-panel border border-border-color rounded-2xl p-5" style={{ animation: 'fadeLift 0.95s ease-out both' }}>
                <div className="flex items-center gap-2 mb-4">
                  <LineChart size={18} className="text-primary" />
                  <h2 className="text-xl font-semibold text-text-primary">Recent Question Signals</h2>
                </div>
                <div className="space-y-3">
                  {trendingQueries.length > 0 ? trendingQueries.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => launchQuery(topic)}
                      className="w-full flex items-center justify-between rounded-xl border border-border-color bg-bg-primary px-4 py-3 text-left hover:bg-bg-hover transition-colors"
                    >
                      <span className="text-sm text-text-primary truncate pr-4">{topic}</span>
                      <ArrowRight size={15} className="text-text-secondary flex-shrink-0" />
                    </button>
                  )) : (
                    <div className="rounded-xl border border-border-color bg-bg-primary px-4 py-4 text-sm text-text-secondary">
                      Ask a few legal questions and your recent question signals will appear here.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/20 via-bg-panel to-cyan-500/10 border border-border-color rounded-2xl p-6" style={{ animation: 'fadeLift 1.05s ease-out both' }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Scale size={14} />
                  Real Insight
                </div>
                {insight ? (
                  <>
                    <h2 className="mt-4 text-2xl font-bold text-text-primary">{insight.title}</h2>
                    <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-2xl">
                      {insight.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => launchQuery(`Teach me more about ${insight.label.toLowerCase()} law in India.`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                      >
                        Explore This Topic
                      </button>
                      <button
                        onClick={() => launchQuery('What legal rights should I know in simple language?')}
                        className="inline-flex items-center gap-2 rounded-xl border border-border-color bg-bg-primary px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
                      >
                        Learn Related Rights
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="mt-4 text-2xl font-bold text-text-primary">Your insights will build as you use LexAI</h2>
                    <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-2xl">
                      Once the user asks a few questions, this panel will summarize the strongest topic pattern from real history instead of showing placeholder content.
                    </p>
                  </>
                )}
              </div>
            </section>

            <section
              ref={savedDocsRef}
              className="bg-bg-panel border border-border-color rounded-2xl p-5"
              style={{ animation: 'fadeLift 1.15s ease-out both' }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">Saved Documents</h2>
                  <p className="text-sm text-text-secondary mt-1">Open the chats where uploaded PDFs and images were analyzed.</p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
                  <FolderOpen size={14} />
                  {documentCount} saved
                </div>
              </div>
              {savedDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {savedDocs.map((doc, index) => (
                    <button
                      key={`${doc.chatId}-${doc.createdAt}-${index}`}
                      onClick={() => setCurrentChatId(doc.chatId)}
                      className="rounded-xl border border-border-color bg-bg-primary p-4 text-left hover:bg-bg-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} />
                        </div>
                        <ArrowRight size={15} className="text-text-secondary flex-shrink-0 mt-1" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-text-primary break-words">{doc.fileName || 'Saved document'}</p>
                      <p className="mt-2 text-xs text-text-secondary">{new Date(doc.createdAt).toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border-color bg-bg-primary px-4 py-4 text-sm text-text-secondary">
                  No saved documents yet. Upload a PDF or image in chat and it will appear here.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
