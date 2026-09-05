import { useMemo, useState } from 'react';
import { groupByCategory } from '../lib/measurements.js';

// Left sidebar: search + category-grouped, checkbox multi-select of measurements.
export default function MeasurementPicker({ measurements, selectedIds, onToggle, onClear }) {
    const [query, setQuery] = useState('');

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? measurements.filter(
                  (m) =>
                      m.label.toLowerCase().includes(q) ||
                      m.fullName.toLowerCase().includes(q) ||
                      m.category.toLowerCase().includes(q)
              )
            : measurements;
        return groupByCategory(filtered);
    }, [measurements, query]);

    return (
        <aside className="picker">
            <div className="picker-head">
                <span className="picker-title">Measurements</span>
                <span className="picker-count">{selectedIds.length} selected</span>
            </div>

            <input
                className="picker-search"
                type="search"
                placeholder="Search measurements…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {selectedIds.length > 0 && (
                <button className="btn-link" onClick={onClear}>
                    Clear selection
                </button>
            )}

            <div className="picker-list">
                {groups.length === 0 && <p className="muted small">No matches.</p>}
                {groups.map((g) => (
                    <div className="picker-group" key={g.category}>
                        <div className="picker-group-title">
                            {g.category} <span className="muted">({g.items.length})</span>
                        </div>
                        {g.items.map((m) => (
                            <label className="picker-item" key={m.id} title={m.fullName}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(m.id)}
                                    onChange={() => onToggle(m.id)}
                                />
                                <span className="picker-item-label">{m.label}</span>
                                <span className={`badge badge-${m.kind || 'unknown'}`}>{m.kind || '—'}</span>
                            </label>
                        ))}
                    </div>
                ))}
            </div>
        </aside>
    );
}
