import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb, ShieldCheck, Scale, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const referenceCards = [
  {
    id: 'IPC 420',
    title: 'IPC 420',
    subtitle: 'Cheating',
    description: 'Cheating and dishonestly inducing delivery of property',
    punishment: 'Up to 1 year imprisonment or fine up to Rs. 1,000'
  },
  {
    id: 'IPC 406',
    title: 'IPC 406',
    subtitle: 'Criminal Breach of Trust',
    description: 'Punishment for criminal breach of trust',
    punishment: 'Up to 3 years imprisonment or fine up to Rs. 1,000'
  },
  {
    id: 'CrPC 41',
    title: 'CrPC 41',
    subtitle: 'Arrest without warrant',
    description: 'When police may arrest without warrant',
    punishment: 'N/A'
  }
];

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

export default function RightPanel({ setExternalQuery }) {
  const [expandedRef, setExpandedRef] = useState('IPC 420');
  const [expandedRight, setExpandedRight] = useState('fundamental-rights');
  const [rightsTopics, setRightsTopics] = useState(fallbackRightsTopics);
  const [loadingRights, setLoadingRights] = useState(true);

  useEffect(() => {
    const fetchRightsTopics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/rights`);
        if (!response.ok) {
          throw new Error('Rights fetch failed');
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setRightsTopics(data);
        }
      } catch (error) {
        console.error('Error fetching rights topics:', error);
      } finally {
        setLoadingRights(false);
      }
    };

    fetchRightsTopics();
  }, []);

  return (
    <div className="w-[320px] h-full bg-bg-panel border-l border-border-color flex flex-col flex-shrink-0 transition-colors duration-300">
      <div className="p-5 border-b border-border-color flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
          <BookOpen size={20} />
        </div>
        <h2 className="text-base font-bold text-text-primary transition-colors">Legal Reference</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-5">
        <section className="space-y-3">
          {referenceCards.map((ref) => {
            const isExpanded = expandedRef === ref.id;
            return (
              <div key={ref.id} className="bg-bg-primary border border-border-color rounded-xl overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setExpandedRef(isExpanded ? null : ref.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-hover transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm transition-colors">{ref.title}</h3>
                    <p className="text-xs text-text-secondary mt-0.5 transition-colors">{ref.subtitle}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-border-color bg-bg-panel animate-fade-in transition-colors duration-300">
                    <div className="mt-3 space-y-3">
                      <div>
                        <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 transition-colors">Description:</h4>
                        <p className="text-xs text-text-secondary leading-relaxed transition-colors">{ref.description}</p>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 transition-colors">Punishment:</h4>
                        <p className="text-xs text-orange-400/90 leading-relaxed transition-colors">{ref.punishment}</p>
                      </div>
                      <button
                        onClick={() => setExternalQuery(`Tell me more about ${ref.title}`)}
                        className="w-full mt-2 bg-primary hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-medium transition-colors shadow-md shadow-primary/10"
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="bg-bg-primary border border-border-color rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border-color flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm">Rights Guide</h3>
              <p className="text-xs text-text-secondary mt-0.5">Learn your constitutional and legal protections</p>
            </div>
          </div>

          <div className="p-3 space-y-3">
            {loadingRights ? (
              <div className="flex items-center gap-2 px-2 py-3 text-text-secondary text-xs">
                <Loader2 size={14} className="animate-spin" />
                Loading rights topics...
              </div>
            ) : (
              rightsTopics.map((topic) => {
                const isExpanded = expandedRight === topic.id;
                return (
                  <div key={topic.id} className="border border-border-color rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedRight(isExpanded ? null : topic.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-bg-hover transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-text-primary">{topic.title}</h4>
                        <p className="text-[11px] text-text-secondary mt-0.5 truncate">{topic.subtitle}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-text-secondary flex-shrink-0" /> : <ChevronDown size={16} className="text-text-secondary flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-border-color bg-bg-panel animate-fade-in">
                        <p className="text-xs text-text-secondary leading-relaxed">{topic.summary}</p>
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            onClick={() => setExternalQuery(`Teach me about ${topic.title} in simple language.`)}
                            className="inline-flex items-center justify-center gap-2 w-full bg-primary hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-medium transition-colors shadow-md shadow-primary/10"
                          >
                            <Scale size={14} />
                            Learn This Right
                          </button>
                          {topic.sample_questions?.slice(0, 2).map((question, index) => (
                            <button
                              key={index}
                              onClick={() => setExternalQuery(question)}
                              className="w-full text-left text-xs px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-primary hover:bg-primary/15 transition-all"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-border-color bg-bg-panel transition-colors duration-300">
        <div className="flex gap-2">
          <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-text-primary mb-1 transition-colors">Quick Reference</h4>
            <p className="text-[11px] text-text-secondary leading-relaxed transition-colors">Use the Rights Guide to learn about your protections, then ask LexAI for details or next steps.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
