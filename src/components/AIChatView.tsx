import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Sparkles,
  MapPin,
  Clock,
  BrainCircuit,
  Bot,
  User,
  ExternalLink,
  Search
} from 'lucide-react';
import { ChatMessage, TrackedObject } from '../types';

interface AIChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (queryText: string) => Promise<void>;
  isThinking: boolean;
  onSelectObject: (object: TrackedObject) => void;
}

const QUICK_PROMPTS = [
  'Where is my laptop?',
  'Where did I last see my phone?',
  'Have you seen my bottle?',
  'Find the chair',
  'How many chairs are in the room?'
];

export const AIChatView: React.FC<AIChatViewProps> = ({
  messages,
  onSendMessage,
  isThinking,
  onSelectObject
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    const query = inputText;
    setInputText('');
    onSendMessage(query);
  };

  // Web Speech API Voice Transcription
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          onSendMessage(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60">
            <Bot className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              AI Natural Language Memory Assistant
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50 font-mono">
                GEMINI 3.6 FLASH
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Query visual memory bank using spoken or typed natural language questions
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[560px]">
        {/* Chat History Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-tr-none'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none shadow-xl'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Grounding Memory Card if assistant found a matching object */}
                {msg.referencedObject && (
                  <div
                    onClick={() => onSelectObject(msg.referencedObject!)}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex items-start space-x-3 text-slate-200 mt-2"
                  >
                    <img
                      src={msg.referencedObject.thumbnailPath}
                      alt={msg.referencedObject.className}
                      className="w-14 h-14 rounded-lg object-cover bg-slate-900 border border-slate-700 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300 uppercase">
                          {msg.referencedObject.className}
                        </span>
                        <span className="text-slate-500">
                          #OBJ-{msg.referencedObject.id}
                        </span>
                      </div>
                      <div className="text-slate-400 truncate mt-0.5">
                        {msg.referencedObject.description}
                      </div>
                      <div className="flex items-center space-x-3 text-slate-400 mt-2">
                        <span className="flex items-center space-x-1 text-cyan-400">
                          <MapPin className="w-3 h-3" />
                          <span>
                            ({msg.referencedObject.lastLocationX}m, {msg.referencedObject.lastLocationY}m)
                          </span>
                        </span>
                        <span className="flex items-center space-x-1 text-emerald-400">
                          <Clock className="w-3 h-3" />
                          <span>{msg.referencedObject.status.toUpperCase()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800/80 flex items-center justify-center text-purple-400 animate-pulse">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400 flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                <span>Searching vector memory bank & reasoning spatial locations...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Question Pills */}
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Quick Queries:</span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(prompt)}
              className="px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 text-[11px] whitespace-nowrap transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="Spoken Voice Input"
          >
            {isListening ? <Mic className="w-4 h-4 text-rose-400" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything (e.g. 'Where is my laptop?', 'Find the chair', 'How many chairs?')..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 shadow-md shadow-cyan-900/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
