import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MainChat from '../components/MainChat';
import RightPanel from '../components/RightPanel';
import { Scale, HelpCircle, Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ChatApp() {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [externalQuery, setExternalQuery] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-bg-primary text-text-primary overflow-hidden font-sans transition-colors duration-300">
      
      {/* Sidebar Panel (Left) */}
      <Sidebar 
        currentChatId={currentChatId} 
        setCurrentChatId={setCurrentChatId} 
        setExternalQuery={setExternalQuery} 
      />

      {/* Main Content Area (Center + Right) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-14 border-b border-border-color bg-bg-panel flex items-center justify-between px-4 sm:px-6 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
              <Scale size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">LexAI</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="text-text-secondary hover:text-primary p-2 rounded-lg hover:bg-bg-hover transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="h-5 w-px bg-border-color mx-1"></div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-text-secondary hover:text-primary px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Workspace Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center Chat Panel */}
          <MainChat 
            currentChatId={currentChatId} 
            setCurrentChatId={setCurrentChatId} 
            externalQuery={externalQuery}
            setExternalQuery={setExternalQuery}
          />

          {/* Right Reference Panel */}
          <RightPanel setExternalQuery={setExternalQuery} />
        </div>
      </div>
    </div>
  );
}
