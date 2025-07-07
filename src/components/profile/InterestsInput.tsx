import React, { useEffect, useState, useRef } from 'react';

interface Interest {
  id: number;
  name: string;
}

interface InterestsInputProps {
  value: Interest[];
  onChange: (interests: Interest[]) => void;
  disabled?: boolean;
}

const InterestsInput: React.FC<InterestsInputProps> = ({ value, onChange, disabled }) => {
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/interests')
      .then(res => res.json())
      .then(data => setAllInterests(data.interests || []));
  }, []);

  useEffect(() => {
    if (input.trim() === '') {
      setSuggestions([]);
      return;
    }
    const lower = input.toLowerCase();
    setSuggestions(
      allInterests
        .filter(i => i.name.toLowerCase().includes(lower) && !value.some(v => v.id === i.id))
        .slice(0, 5)
    );
  }, [input, allInterests, value]);

  const handleAdd = async (interest: Interest | string) => {
    if (typeof interest === 'string') {
      setAdding(true);
      const res = await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: interest })
      });
      const data = await res.json();
      setAdding(false);
      if (data.interest) {
        onChange([...value, data.interest]);
        setAllInterests(prev => [...prev, data.interest]);
        setInput('');
      }
    } else {
      onChange([...value, interest]);
      setInput('');
    }
  };

  const handleRemove = (id: number) => {
    onChange(value.filter(i => i.id !== id));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      // Add as new if not in suggestions
      const match = allInterests.find(i => i.name.toLowerCase() === input.trim().toLowerCase());
      if (match) {
        handleAdd(match);
      } else {
        handleAdd(input.trim());
      }
      e.preventDefault();
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      handleRemove(value[value.length - 1].id);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(interest => (
          <span key={interest.id} className="bg-white/20 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
            {interest.name}
            {!disabled && (
              <button type="button" className="ml-1 text-white/70 hover:text-red-400" onClick={() => handleRemove(interest.id)}>&times;</button>
            )}
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-white/10 text-white px-3 py-2 rounded-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-accent-teal-light"
          placeholder="Add interest..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={disabled || adding}
        />
        {input && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-background-main rounded-md shadow-lg z-10 border border-white/20">
            {suggestions.map(s => (
              <button
                key={s.id}
                type="button"
                className="block w-full text-left px-4 py-2 text-white hover:bg-accent-teal-light/20"
                onClick={() => handleAdd(s)}
                disabled={disabled}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {input && suggestions.length === 0 && !adding && (
          <div className="absolute left-0 right-0 mt-1 bg-background-main rounded-md shadow-lg z-10 border border-white/20 px-4 py-2 text-white/70">
            Press Enter to add "{input}"
          </div>
        )}
        {adding && (
          <div className="absolute left-0 right-0 mt-1 bg-background-main rounded-md shadow-lg z-10 border border-white/20 px-4 py-2 text-white/70">
            Adding...
          </div>
        )}
      </div>
    </div>
  );
};

export default InterestsInput; 