import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Scale, Loader2, Paperclip, FileText, ShieldAlert, Pin, AlertTriangle, Volume2, VolumeX, X, Image as ImageIcon, Download, BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import GlossaryText from './GlossaryText';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function MainChat({ currentChatId, setCurrentChatId, externalQuery, setExternalQuery }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const { user } = useAuth();

  // Initialize SpeechRecognition if available
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (currentChatId) {
      const fetchMessages = async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', currentChatId)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          const parsedData = data.map(msg => {
            if (msg.content.startsWith('[FILE: ')) {
               const fileName = msg.content.substring(7, msg.content.length - 1);
               const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
               return { ...msg, type: 'file', content: fileName, fileType, fileUrl: null };
            }
            return msg;
          });
          setMessages(parsedData);
        }
      };
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (externalQuery) {
      handleSend(externalQuery);
      setExternalQuery(null);
    }
  }, [externalQuery]);

  const handleSend = async (forcedMessage = null) => {
    const userMessage = forcedMessage || input.trim();
    if (!userMessage || isLoading || !user) return;

    if (!forcedMessage) setInput('');
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }

    setMessages(prev => [...prev, { role: 'user', content: userMessage, type: 'text' }]);
    setIsLoading(true);

    try {
      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .insert({ user_id: user.id, title: userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage })
          .select().single();
        if (chatError) throw chatError;
        chatIdToUse = chatData.id;
        setCurrentChatId(chatIdToUse);
      }

      await supabase.from('messages').insert({ chat_id: chatIdToUse, role: 'user', content: userMessage });

      const historyToSent = messages.map(m => ({ role: m.role, content: m.content }));

      // --- STREAMING via SSE ---
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage, history: historyToSent })
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let sources = [];
      const streamingMsgIdx = messages.length + 1; // index of new AI message

      // Add empty AI message placeholder for streaming
      setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'text', sources: [] }]);
      setIsLoading(false);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: sources')) continue;
          if (line.startsWith('event: done')) continue;
          if (line.startsWith('data: [DONE]')) continue;
          if (line.startsWith('data: ') && line.includes('"name"')) {
            // sources JSON array
            try { sources = JSON.parse(line.slice(6)); } catch {}
            continue;
          }
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6).replace(/\\n/g, '\n');
            fullText += chunk;
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: fullText, sources } : m
            ));
          }
        }
      }

      // Save completed message to DB
      await supabase.from('messages').insert({ chat_id: chatIdToUse, role: 'assistant', content: fullText });

      // --- Parallel: fetch follow-ups ---
      let followUps = [];

      try {
        const fuResult = await fetch(`${API_BASE_URL}/followup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userMessage, last_answer: fullText })
        }).then(r => r.json());
        followUps = fuResult?.questions || [];
      } catch (e) {
        console.error("Error fetching followups:", e);
      }

      // Update last message with follow-ups
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: fullText, followUps } : m
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to the server.', type: 'error' }]);
      setIsLoading(false);
    }
  };

  const exportChatAsPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;
    const maxW = pageW - margin * 2;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text('LexAI — Consultation Export', margin, y);
    y += 28;

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 140);
    doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, y);
    y += 20;

    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    messages.forEach(msg => {
      if (msg.type === 'file') return;
      const isUser = msg.role === 'user';
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isUser ? 79 : 100, isUser ? 70 : 100, isUser ? 229 : 120);
      doc.text(isUser ? 'YOU' : 'LEXAI', margin, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 50);
      const lines = doc.splitTextToSize(msg.content.replace(/\*\*/g, '').replace(/\*/g, ''), maxW);
      lines.forEach(line => {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 14;
      });

      if (msg.sources?.length) {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 180);
        const srcText = 'Sources: ' + msg.sources.map(s => s.name + (s.page ? ` p.${s.page}` : '')).join(', ');
        const srcLines = doc.splitTextToSize(srcText, maxW);
        srcLines.forEach(line => { doc.text(line, margin, y); y += 12; });
      }
      y += 10;
    });

    doc.save(`legal-consultation-${Date.now()}.pdf`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: file.name, 
      type: 'file',
      fileUrl: fileUrl,
      fileType: file.type
    }]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      let chatIdToUse = currentChatId;

      if (!chatIdToUse) {
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .insert({
            user_id: user.id,
            title: `Document: ${file.name}`
          })
          .select()
          .single();
        
        if (chatError) throw chatError;
        chatIdToUse = chatData.id;
        setCurrentChatId(chatIdToUse);
      }

      await supabase.from('messages').insert({
        chat_id: chatIdToUse,
        role: 'user',
        content: `[FILE: ${file.name}]`
      });

      // Route based on file type
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const endpoint = isPDF ? '/document' : '/image';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      await supabase.from('messages').insert({
        chat_id: chatIdToUse,
        role: 'assistant',
        content: data.answer
      });

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, type: 'text' }]);
    } catch (error) {
      console.error("File processing error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error processing document.', type: 'error' }]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!SpeechRecognition) {
        alert("Your browser does not support Speech Recognition. Please use Chrome or Edge.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English

      let finalTranscript = input ? input + ' ' : '';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setInput(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  const toggleSpeakMessage = (text, idx) => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking && speakingIdx === idx) {
        // If clicking the currently playing message, stop it
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
      } else {
        // Play new message
        window.speechSynthesis.cancel(); // Stop any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.onend = () => setSpeakingIdx(null);
        utterance.onerror = () => setSpeakingIdx(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingIdx(idx);
      }
    } else {
      alert("Text-to-speech is not supported in your browser.");
    }
  };

  const suggestedQuestions = [
    { text: "What is IPC 420?", icon: <Scale size={18} /> },
    { text: "How to file an FIR?", icon: <FileText size={18} /> },
    { text: "What are my rights after arrest?", icon: <ShieldAlert size={18} /> },
    { text: "Cybercrime punishment in India", icon: <AlertTriangle size={18} /> }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg-primary relative transition-colors duration-300">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-8 py-6 pb-32">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full animate-fade-in mt-10">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(79,70,229,0.2)]">
              <Scale size={40} className="text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary mb-4 text-center transition-colors">
              Welcome to <span className="text-primary">LexAI</span>
            </h1>
            <p className="text-text-secondary text-center text-lg max-w-xl mb-12 transition-colors">
              Your intelligent guide to Indian legal information. Ask questions about laws, rights, procedures, and more.
            </p>

            <div className="w-full">
              <div className="flex items-center gap-2 mb-4 text-text-secondary">
                <LightbulbIcon size={16} />
                <span className="text-sm font-medium">Try these questions:</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                {suggestedQuestions.map((q, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(q.text)}
                    className="flex items-center gap-3 p-4 bg-bg-panel border border-border-color rounded-xl hover:bg-bg-hover transition-all text-left group"
                  >
                    <div className="text-primary/70 group-hover:text-primary transition-colors">
                      {q.icon}
                    </div>
                    <span className="text-text-primary text-sm font-medium transition-colors">{q.text}</span>
                  </button>
                ))}
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3 text-indigo-400">
                  <Pin size={18} />
                  <h3 className="font-semibold">Quick Tips</h3>
                </div>
                <ul className="space-y-2 text-sm text-text-secondary pl-6 list-disc marker:text-indigo-500 transition-colors">
                  <li>Ask about specific sections, laws, or legal procedures</li>
                  <li>Upload PDF documents or images for quick legal analysis</li>
                  <li>Use the microphone for real-time voice dictation</li>
                </ul>
              </div>
            </div>
            
            {/* Disclaimer */}
            <div className="mt-12 flex items-start gap-2 text-amber-500/80 bg-amber-500/10 px-4 py-3 rounded-lg border border-amber-500/20 max-w-2xl">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                This AI provides legal information for educational purposes only and is not a substitute for professional legal advice.
              </p>
            </div>
          </div>
        ) : (
          /* Chat Thread */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={exportChatAsPdf}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary/10 border border-border-color rounded-lg transition-all"
                title="Export consultation as PDF"
              >
                <Download size={13} />
                Export PDF
              </button>
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl relative group ${
                  msg.type === 'file'
                    ? 'bg-transparent'
                    : msg.role === 'user'
                      ? 'px-5 py-4 bg-primary text-white rounded-tr-sm shadow-md shadow-primary/20'
                      : msg.type === 'error'
                        ? 'px-5 py-4 bg-red-500/10 text-red-300 rounded-tl-sm border border-red-500/20'
                        : 'px-5 py-4 bg-bg-panel text-text-primary rounded-tl-sm shadow-sm transition-colors'
                }`}>
                  {msg.type === 'file' ? (
                    <button
                      onClick={() => msg.fileUrl && setPreviewFile({ url: msg.fileUrl, type: msg.fileType, name: msg.content })}
                      disabled={!msg.fileUrl}
                      className={`flex items-center gap-4 p-4 bg-bg-panel border border-border-color rounded-2xl text-left shadow-sm max-w-sm w-full ${msg.fileUrl ? 'hover:border-primary/50 transition-all cursor-pointer' : 'opacity-60 cursor-default'}`}
                    >
                      <div className={`p-3 rounded-xl ${msg.fileType?.includes('pdf') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {msg.fileType?.includes('pdf') ? <FileText size={24} /> : <ImageIcon size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{msg.content}</p>
                        <p className="text-xs text-text-secondary mt-0.5 uppercase tracking-wide">
                          {msg.fileType?.includes('pdf') ? 'PDF Document' : 'Image File'}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <>
                      {/* Use GlossaryText for AI messages, plain text for user */}
                      {msg.role === 'assistant'
                        ? <GlossaryText text={msg.content} />
                        : msg.content.split('\n').map((line, i) => (
                            <span key={i}>{line}<br/></span>
                          ))
                      }
                      {/* Streaming cursor */}
                      {msg.role === 'assistant' && !isLoading && msg.content === '' && (
                        <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse rounded-sm ml-0.5" />
                      )}
                      {/* Source Citations */}
                      {msg.role === 'assistant' && msg.sources?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border-color flex flex-wrap gap-2">
                          <BookOpen size={13} className="text-primary/60 mt-0.5 flex-shrink-0" />
                          {msg.sources.map((src, si) => (
                            <span key={si} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full border border-primary/20">
                              {src.name}{src.page ? ` · p.${src.page}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Follow-up Question Chips */}
                      {msg.role === 'assistant' && msg.followUps?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border-color">
                          <p className="text-[10px] text-text-secondary mb-2 font-medium uppercase tracking-wider">Follow-up questions</p>
                          <div className="flex flex-col gap-1.5">
                            {msg.followUps.map((q, qi) => (
                              <button
                                key={qi}
                                onClick={() => handleSend(q)}
                                className="text-left text-xs px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-primary hover:bg-primary/15 transition-all"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Read Aloud Toggle */}
                  {msg.role === 'assistant' && msg.type !== 'error' && msg.content && (
                    <button
                      onClick={() => toggleSpeakMessage(msg.content.replace(/\*/g, ''), idx)}
                      className={`absolute -right-10 bottom-0 p-2 transition-all rounded-full hover:bg-primary/10 ${
                        speakingIdx === idx ? 'text-primary opacity-100' : 'text-slate-500 hover:text-primary opacity-0 group-hover:opacity-100'
                      }`}
                      title={speakingIdx === idx ? 'Stop Audio' : 'Read Aloud'}
                    >
                      {speakingIdx === idx ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-bg-panel rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3 transition-colors">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <span className="text-text-secondary text-sm transition-colors">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-10 pb-6 px-4 sm:px-8 transition-colors">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-bg-panel rounded-2xl border border-border-color p-2 shadow-2xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          
          <input 
            type="file" 
            accept="image/*,.pdf" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
            title="Upload Document (PDF/Image)"
          >
            <Paperclip size={20} />
          </button>

          <button 
            onClick={toggleRecording}
            className={`p-3 rounded-xl transition-colors ${
              isRecording 
                ? 'bg-red-500/20 text-red-500 animate-pulse' 
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
            title="Real-time Voice Dictation"
          >
            <Mic size={20} />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal question or dictate with microphone..."
            className="flex-1 bg-transparent border-none focus:outline-none resize-none py-3 px-2 text-text-primary placeholder-slate-500 min-h-[44px] max-h-[200px] scrollbar-hide transition-colors"
            rows={1}
          />

          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-primary hover:bg-indigo-500 disabled:bg-bg-hover disabled:text-text-secondary text-white rounded-xl transition-colors shadow-sm disabled:shadow-none"
          >
            <Send size={20} />
          </button>
        </div>
        
        <div className="text-center mt-3 hidden sm:block">
           <span className="text-[11px] text-text-secondary transition-colors">
             Shift + Enter for new line • Enter to send
           </span>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-panel border border-border-color rounded-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-border-color bg-bg-primary">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${previewFile.type?.includes('pdf') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {previewFile.type?.includes('pdf') ? <FileText size={18} /> : <ImageIcon size={18} />}
                </div>
                <h3 className="font-semibold text-text-primary truncate pr-4">{previewFile.name}</h3>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-xl transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-black/20 p-4 sm:p-6 overflow-hidden flex items-center justify-center">
              {previewFile.type?.includes('pdf') ? (
                <iframe src={previewFile.url} className="w-full h-full rounded-xl bg-white" title="PDF Preview" />
              ) : (
                <img src={previewFile.url} className="max-w-full max-h-full rounded-xl object-contain shadow-md" alt="Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LightbulbIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  )
}
