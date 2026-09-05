import { useCallback, useEffect, useMemo, useState } from 'react';
import { listDeviceMeasurements } from '../api/fiware.js';
import { parseEntity } from '../lib/measurements.js';
import MeasurementPicker from './MeasurementPicker.jsx';
import MeasurementChart from './MeasurementChart.jsx';

const LASTN_OPTIONS = [20, 50, 100, 500, 1000];
const AUTO_REFRESH_MS = 15000;

export default function Dashboard() {
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [lastN, setLastN] = useState(50);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadEntities = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await listDeviceMeasurements();
            // Keep only entities that carry a recognized typed attribute.
            setEntities(list.map(parseEntity).filter((m) => m.attr));
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntities();
    }, [loadEntities]);

    // Auto-refresh re-queries the charts (via refreshKey), not the entity list.
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const timer = setInterval(() => setRefreshKey((k) => k + 1), AUTO_REFRESH_MS);
        return () => clearInterval(timer);
    }, [autoRefresh]);

    const measurementsById = useMemo(() => {
        const map = new Map();
        for (const e of entities) map.set(e.id, e);
        return map;
    }, [entities]);

    const selected = selectedIds.map((id) => measurementsById.get(id)).filter(Boolean);

    const toggle = (id) =>
        setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

    return (
        <div className="dashboard">
            <MeasurementPicker
                measurements={entities}
                selectedIds={selectedIds}
                onToggle={toggle}
                onClear={() => setSelectedIds([])}
            />

            <main className="content">
                <div className="toolbar">
                    <div className="toolbar-left">
                        <label className="ctl">
                            <span>Points</span>
                            <select value={lastN} onChange={(e) => setLastN(Number(e.target.value))}>
                                {LASTN_OPTIONS.map((n) => (
                                    <option key={n} value={n}>
                                        Last {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="ctl ctl-check">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                            />
                            <span>Auto-refresh (15s)</span>
                        </label>
                    </div>
                    <div className="toolbar-right">
                        <button className="btn" onClick={() => setRefreshKey((k) => k + 1)}>
                            Refresh
                        </button>
                    </div>
                </div>

                {loading && <p className="muted center pad">Loading measurements from Orion…</p>}

                {error && (
                    <div className="banner banner-error">
                        <strong>Couldn’t reach Orion.</strong> {error}
                        <div className="muted small">
                            Is the cluster up and <code>minikube tunnel</code> running?
                        </div>
                        <button className="btn" onClick={loadEntities}>
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && entities.length === 0 && (
                    <p className="muted center pad">No DeviceMeasurements found in Orion for this tenant.</p>
                )}

                {!loading && !error && entities.length > 0 && selected.length === 0 && (
                    <div className="empty">
                        <p>Select one or more measurements on the left to chart them.</p>
                    </div>
                )}

                <div className="chart-grid">
                    {selected.map((m) => (
                        <MeasurementChart key={m.id} measurement={m} lastN={lastN} refreshKey={refreshKey} />
                    ))}
                </div>
            </main>
        </div>
    );
}
