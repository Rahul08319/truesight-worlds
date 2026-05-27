import React, { useState, useMemo } from 'react';
import { EMOJI_DATA, EMOJI_CATEGORIES } from '@/lib/emojiData';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Smileys');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return EMOJI_DATA.filter(e => e.keywords.includes(q) || e.char === q).slice(0, 120);
    }
    return EMOJI_DATA.filter(e => e.category === category);
  }, [query, category]);

  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl w-64 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-border">
        <input
          autoFocus
          type="text"
          placeholder="Search emoji..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {!query && (
        <div className="flex border-b border-border bg-muted/30">
          {EMOJI_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-1 text-[10px] py-1 transition-colors ${
                category === c ? 'bg-card text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-8 gap-0.5 p-1.5 max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="col-span-8 text-center text-xs text-muted-foreground py-4">
            No emoji found
          </div>
        )}
        {filtered.map((e, i) => (
          <button
            key={`${e.char}-${i}`}
            onClick={() => { onSelect(e.char); onClose?.(); }}
            title={e.keywords.split(' ')[0]}
            className="text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors"
          >
            {e.char}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;