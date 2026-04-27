import { useEffect, useState } from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => {
    const t = setTimeout(() => onChange(local), 200);
    return () => clearTimeout(t);
  }, [local, onChange]);

  return (
    <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full">
      <span className="material-symbols-outlined text-slate-400 text-sm">
        search
      </span>
      <input
        className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-64 pl-2"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        type="text"
      />
      {local && (
        <button
          onClick={() => setLocal('')}
          className="ml-2 text-slate-400 hover:text-slate-600"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}
