import { useState, useEffect } from 'react';
import { Plus, MessageSquare, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentChatId, setCurrentChatId, setExternalQuery }) {
  const [expandedTopic, setExpandedTopic] = useState('Cyber Law');
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      setLoadingChats(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
      } else {
        setChats(data || []);
      }
      setLoadingChats(false);
    };

    fetchChats();

    // Set up realtime subscription for new chats
    const subscription = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${user.id}` }, payload => {
        fetchChats(); // Refresh on changes
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Group chats by date
  const groupChats = () => {
    const today = [];
    const yesterday = [];
    const older = [];
    
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    chats.forEach(chat => {
      const chatDate = new Date(chat.created_at);
      if (chatDate >= todayStart) {
        today.push(chat);
      } else if (chatDate >= yesterdayStart) {
        yesterday.push(chat);
      } else {
        older.push(chat);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupChats();

  const legalTopics = [
    { name: 'Criminal Law', subtopics: [] },
    { 
      name: 'Cyber Law', 
      subtopics: ['Online fraud and cybercrime', 'Data protection laws in India', 'Cyber harassment provisions', 'IT Act Section 66 - Hacking'] 
    },
    { name: 'Constitution', subtopics: [] },
    { name: 'Consumer Rights', subtopics: [] },
    { name: 'Family Law', subtopics: ['Divorce process and grounds', 'Child custody laws', 'Dowry prohibition laws', 'Succession and inheritance'] }
  ];

  const renderChatGroup = (title, group) => {
    if (group.length === 0) return null;
    return (
      <div className="space-y-1">
        <h4 className="text-xs text-slate-400 mb-2 px-2">{title}</h4>
        {group.map((chat) => (
          <button 
            key={chat.id} 
            onClick={() => setCurrentChatId(chat.id)}
            className={`w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg transition-colors text-left truncate ${
              currentChatId === chat.id ? 'bg-bg-hover text-primary' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <MessageSquare size={16} className={`flex-shrink-0 ${currentChatId === chat.id ? 'text-primary' : 'text-text-secondary'}`} />
            <span className="truncate">{chat.title}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-[280px] h-full bg-bg-panel border-r border-border-color flex flex-col flex-shrink-0 transition-colors duration-300">
      <div className="p-4 border-b border-border-color">
        <button 
          onClick={() => setCurrentChatId(null)}
          className="w-full bg-primary hover:bg-indigo-500 text-white rounded-xl py-3 px-4 font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          New Query
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 flex flex-col gap-6">
        {/* Chat History */}
        <div className="px-4 space-y-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Chat History</h3>
          
          {loadingChats ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-slate-500" size={20} />
            </div>
          ) : chats.length === 0 ? (
            <p className="text-sm text-slate-500 italic px-2">No previous chats.</p>
          ) : (
            <>
              {renderChatGroup('Today', today)}
              {renderChatGroup('Yesterday', yesterday)}
              {renderChatGroup('Older', older)}
            </>
          )}
        </div>

        {/* Legal Topics */}
        <div className="px-4 space-y-2 mt-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Legal Topics</h3>
          
          {legalTopics.map((topic, i) => (
            <div key={i} className="space-y-1">
              <button 
                onClick={() => setExpandedTopic(expandedTopic === topic.name ? null : topic.name)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  expandedTopic === topic.name ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {topic.name}
                {topic.subtopics.length > 0 && (
                  expandedTopic === topic.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                )}
              </button>
              
              {expandedTopic === topic.name && topic.subtopics.length > 0 && (
                <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-border-color ml-4 animate-fade-in">
                  {topic.subtopics.map((sub, j) => (
                    <button 
                      key={j} 
                      onClick={() => {
                        setExternalQuery(`Tell me about ${sub}`);
                      }}
                      className="w-full text-left text-xs text-text-secondary hover:text-primary py-1.5 transition-colors truncate"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border-color text-center">
        <p className="text-[10px] text-text-secondary font-medium">Educational Tool</p>
        <p className="text-[10px] text-text-secondary">Not a substitute for legal advice</p>
      </div>
    </div>
  );
}
