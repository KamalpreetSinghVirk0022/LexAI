import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export default function RightPanel({ setExternalQuery }) {
  const [expandedRef, setExpandedRef] = useState('IPC 420');

  const references = [
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

  return (
    <div className="w-[300px] h-full bg-bg-panel border-l border-border-color flex flex-col flex-shrink-0 transition-colors duration-300">
      <div className="p-5 border-b border-border-color flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
          <BookOpen size={20} />
        </div>
        <h2 className="text-base font-bold text-text-primary transition-colors">Legal Reference</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        {references.map((ref) => {
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
      </div>

      <div className="p-4 border-t border-border-color bg-bg-panel transition-colors duration-300">
        <div className="flex gap-2">
          <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-text-primary mb-1 transition-colors">Quick Reference</h4>
            <p className="text-[11px] text-text-secondary leading-relaxed transition-colors">Click sections for details. Consult a lawyer for advice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
