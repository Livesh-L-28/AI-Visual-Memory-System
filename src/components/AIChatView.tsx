import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  MapPin,
  Clock,
  Bot,
  User,
  Volume2,
  VolumeX,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ChatMessage, TrackedObject } from '../types';
import { getDefaultThumbnailForClass } from '../lib/thumbnail_utils';

interface AIChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (queryText: string) => Promise<void>;
  isThinking: boolean;
  onSelectObject: (object: TrackedObject) => void;
}

const QUICK_PROMPTS = [
  'Where is my laptop?',
  'What objects disappeared?',
  'What is in the Workstation Desk?',
  'Have you seen my bottle?',
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
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Read latest assistant response aloud if TTS is enabled
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender === 'assistant' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Strip markdown asterisks for cleaner pronunciation
      const cleanText = lastMsg.text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, ttsEnabled]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    const query = inputText;
    setInputText('');
    stopSpeaking();
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
                GEMINI MULTIMODAL
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Query spatial memory bank, trace missing objects, and inspect zone occupancies with speech or text
            </p>
          </div>
        </div>

        {/* TTS Toggle Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (ttsEnabled) stopSpeaking();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              ttsEnabled
                ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {ttsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Voice Output ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Voice Output Muted</span>
              </>
            )}
          </button>
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

                {/* Referenced Object Interactive Card */}
                {msg.referencedObject && (
                  <div
                    onClick={() => onSelectObject(msg.referencedObject!)}
                    className="cursor-pointer bg-slate-950/90 rounded-xl border border-slate-800 p-2.5 flex items-center space-x-3 hover:border-cyan-500 transition-colors"
                  >
                    <img
                      src={msg.referencedObject.thumbnailPath}
                      alt={msg.referencedObject.className}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getDefaultThumbnailForClass(msg.referencedObject!.className);
                      }}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                        <span>#OBJ-{msg.referencedObject.id} {msg.referencedObject.className.toUpperCase()}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            msg.referencedObject.status === 'visible'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {msg.referencedObject.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-1">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>
                            ({msg.referencedObject.lastLocationX}m, {msg.referencedObject.lastLocationY}m) in {msg.referencedObject.zone || 'Room'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Search Results Pills */}
                {msg.searchResults && msg.searchResults.length > 1 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">Matched Objects in Memory:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.searchResults.slice(0, 4).map((res, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectObject(res.object)}
                          className="bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-lg border border-slate-800 flex items-center space-x-1 transition-colors"
                        >
                          <span className="text-cyan-400 font-bold">#OBJ-{res.object.id}</span>
                          <span>{res.object.className}</span>
                          <span className="text-slate-500 font-mono text-[9px]">({res.object.zone || 'Room'})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 text-right font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center flex-shrink-0 border border-slate-700">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 max-w-xs animate-pulse">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
              <span>Synthesizing visual spatial memory...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Query Pills */}
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">Suggested:</span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(prompt)}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap border border-slate-700/60 transition-colors flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-2"
        >
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-xl border transition-colors ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Voice query"
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about any physical object ('Where is my laptop?', 'What disappeared?')..."
            className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
