export const Brand = ({ onClick, compact, light }: { onClick?: () => void; compact?: boolean; light?: boolean }) => (
  <button className="brand" onClick={onClick} style={light ? { color: '#fff' } : undefined} aria-label="Resumint home">
    <span className="brand-mark">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 3h8l4 4v14H6z" fill="#fff" opacity=".95" />
        <path d="M9 12h6M9 15h6M9 18h3.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
    <span className={compact ? 'hide-sm' : undefined}>
      Resu<span className={light ? undefined : 'grad-text'} style={light ? { color: '#6ee7b7' } : undefined}>mint</span>
    </span>
  </button>
);
