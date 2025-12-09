'use client';

import { useState, useRef, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredPin = pin.join('');
    if (enteredPin === '5656') {
      onLogin();
    } else {
      setError(true);
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden selection:bg-black selection:text-white">
      
      {/* --- VISIBLE ANIMATED BACKGROUND --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Layer 1: Moving Dots (Increased opacity to be visible) */}
        <div 
          className="absolute inset-0 opacity-[0.1]" 
          style={{
            backgroundImage: 'radial-gradient(#000000 2px, transparent 2px)',
            backgroundSize: '40px 40px',
            animation: 'pan 40s linear infinite'
          }}
        />
        
        {/* Layer 2: Vignette (Darker edges to focus center) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.05)_100%)]" />
      </div>

      <style jsx>{`
        @keyframes pan {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
      `}</style>
      {/* ----------------------------------- */}

      <div className="w-full max-w-md px-8 relative z-10">
        <div className="flex flex-col items-center mb-12">
          {/* Lock Icon with Hopping Animation */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 border-black bg-white shadow-xl animate-[bounce_2s_infinite]">
            <Lock className="w-10 h-10 text-black" strokeWidth={2.5} />
          </div>
          
          <h1 className="text-4xl font-black text-black mb-2 tracking-tight">LKO Job Work</h1>
          <p className="text-gray-500 font-medium">Enter Crodal 4-digit PIN</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="flex gap-4 justify-center mb-8">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="password" 
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className={`w-16 h-20 text-center text-4xl font-bold bg-white border-2 rounded-2xl focus:outline-none transition-all duration-200 shadow-sm
                  ${error 
                    ? 'border-red-500 text-red-600 animate-[shake_0.5s]' 
                    : 'border-gray-300 focus:border-black focus:shadow-xl focus:-translate-y-1 text-black'
                  }`}
              />
            ))}
          </div>
          
          {error && (
            <p className="text-red-600 text-center text-sm mb-6 font-bold animate-in fade-in slide-in-from-top-1">
              Incorrect PIN
            </p>
          )}
          
          <button
            type="submit"
            disabled={pin.some(d => !d)}
            className="w-full py-4 bg-black text-white text-lg font-bold rounded-2xl hover:bg-gray-900 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-2xl"
          >
            UNLOCK
          </button>
        </form>
      </div>
    </div>
  );
}