import { useState } from 'react';
import { legalGlossary } from '../lib/legalGlossary';

/**
 * Renders text with legal terms highlighted and tooltips on hover.
 */
export default function GlossaryText({ text }) {
  const [tooltip, setTooltip] = useState(null); // { term, definition, x, y }

  if (!text) return null;

  // Build a regex that matches any glossary term (whole word, case-insensitive)
  const terms = Object.keys(legalGlossary);
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  // Split text into lines first to preserve line breaks
  const lines = text.split('\n');

  return (
    <span>
      {lines.map((line, lineIdx) => {
        const parts = [];
        let lastIndex = 0;
        let match;
        regex.lastIndex = 0;

        while ((match = regex.exec(line)) !== null) {
          // Push plain text before the match
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
          }
          // Find the canonical key (original case from glossary)
          const matchedTerm = match[0];
          const canonicalKey = terms.find(t => t.toLowerCase() === matchedTerm.toLowerCase()) || matchedTerm;
          const definition = legalGlossary[canonicalKey];

          parts.push(
            <span
              key={`${lineIdx}-${match.index}`}
              className="border-b border-dotted border-indigo-400 text-indigo-300 cursor-help relative"
              onMouseEnter={(e) => {
                const rect = e.target.getBoundingClientRect();
                setTooltip({ term: canonicalKey, definition, rect });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {matchedTerm}
            </span>
          );
          lastIndex = regex.lastIndex;
        }

        // Push remaining plain text
        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }

        return (
          <span key={lineIdx}>
            {parts}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      })}

      {/* Tooltip Portal */}
      {tooltip && (
        <span
          className="fixed z-[200] max-w-xs bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 shadow-2xl pointer-events-none"
          style={{
            top: tooltip.rect.bottom + 8 + window.scrollY,
            left: Math.min(tooltip.rect.left, window.innerWidth - 300),
          }}
        >
          <span className="block text-indigo-300 font-semibold text-xs mb-1">{tooltip.term}</span>
          <span className="block text-slate-300 text-xs leading-relaxed">{tooltip.definition}</span>
        </span>
      )}
    </span>
  );
}
