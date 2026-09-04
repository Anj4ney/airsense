import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * ReadAloudButton — accessibility + demo moment.
 * Uses the native browser SpeechSynthesis API (zero dependencies, zero cost).
 * Reads the advisory in a natural voice; toggling stops playback.
 */
export default function ReadAloudButton({ text, disabled = false }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Always stop playback when the component unmounts or the text changes.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported, text]);

  const toggle = () => {
    if (!supported || disabled || !text) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const clean = text
      .replace(/[•*#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => /en[-_]/i.test(v.lang) && /google|natural|neural|online/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button
      onClick={toggle}
      disabled={disabled || !text}
      title={supported ? (speaking ? 'Stop reading' : 'Read advisory aloud') : 'Speech not supported in this browser'}
      aria-label={speaking ? 'Stop reading advisory aloud' : 'Read advisory aloud'}
      aria-pressed={speaking}
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors',
        speaking
          ? 'bg-accent/20 border-accent/50 text-accent-soft'
          : 'bg-white/[0.04] border-white/[0.08] text-muted hover:text-accent-soft hover:border-accent/40',
        (disabled || !text) && 'opacity-40 cursor-not-allowed'
      )}
    >
      {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      <span>{speaking ? 'Stop' : 'Listen'}</span>
      {speaking && (
        <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
          <span className="eq-bar" style={{ animationDelay: '0ms' }} />
          <span className="eq-bar" style={{ animationDelay: '150ms' }} />
          <span className="eq-bar" style={{ animationDelay: '300ms' }} />
        </span>
      )}
    </button>
  );
}
