import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getAttrHistory } from '../api/fiware.js';
import { useThemeColors } from '../lib/useThemeColors.js';

function fmtTime(t) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return String(t);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDateTime(t) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return String(t);
    return d.toLocaleString();
}

// One card per selected measurement. Fetches its history from QuantumLeap and
// renders it according to type: numeric -> line, boolean -> step, text -> table.
export default function MeasurementChart({ measurement, lastN, refreshKey }) {
    const { id, attr, kind, label, category, unit, fullName } = measurement;
    const [state, setState] = useState({ status: 'loading', points: [], message: null });
    const c = useThemeColors();

    useEffect(() => {
        let cancelled = false;
        setState((s) => ({ ...s, status: 'loading' }));
        getAttrHistory(id, attr, lastN)
            .then((res) => {
                if (cancelled) return;
                if (res.noData) setState({ status: 'nodata', points: [], message: res.message });
                else setState({ status: 'ready', points: res.points, message: null });
            })
            .catch((e) => {
                if (cancelled) return;
                setState({ status: 'error', points: [], message: e.message || String(e) });
            });
        return () => {
            cancelled = true;
        };
    }, [id, attr, lastN, refreshKey]);

    const data = useMemo(() => {
        return state.points.map((p) => {
            let v = p.v;
            if (kind === 'boolean') v = p.v === true || p.v === 'true' || p.v === 1 ? 1 : 0;
            else if (kind === 'number') v = typeof p.v === 'number' ? p.v : Number(p.v);
            return { t: p.t, label: fmtTime(p.t), v };
        });
    }, [state.points, kind]);

    const latest = data.length ? data[data.length - 1] : null;

    // Concrete colors (see useThemeColors: Recharts can't resolve CSS var() in SVG attrs).
    const seriesColor = kind === 'boolean' ? c['--series-2'] || '#1baf7a' : c['--series-1'] || '#2a78d6';
    const grid = c['--grid'] || '#e1e0d9';
    const axis = c['--axis'] || '#c3c2b7';
    const muted = c['--muted'] || '#898781';
    const surface = c['--surface-1'] || '#fcfcfb';

    return (
        <section className="card">
            <div className="card-head">
                <div className="card-heading">
                    <h3 className="card-title" title={fullName}>
                        {label}
                    </h3>
                    <span className="card-sub">
                        {category}
                        {unit ? ` · ${unit}` : ''} · <span className={`badge badge-${kind}`}>{kind}</span>
                    </span>
                </div>
                {latest && kind !== 'text' && (
                    <div className="card-latest">
                        <span className="card-latest-value">
                            {kind === 'boolean' ? (latest.v ? 'true' : 'false') : latest.v}
                        </span>
                        <span className="card-latest-label">latest</span>
                    </div>
                )}
            </div>

            <div className="card-body">
                {state.status === 'loading' && <p className="muted center">Loading…</p>}
                {state.status === 'error' && <p className="error center">Error: {state.message}</p>}
                {state.status === 'nodata' && (
                    <p className="muted center">No history in QuantumLeap yet.</p>
                )}

                {state.status === 'ready' && kind === 'text' && (
                    <table className="text-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...data]
                                .reverse()
                                .slice(0, 12)
                                .map((p, i) => (
                                    <tr key={i}>
                                        <td>{fmtDateTime(p.t)}</td>
                                        <td>{String(p.v)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}

                {state.status === 'ready' && kind !== 'text' && data.length > 0 && (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data} margin={{ top: 8, right: 18, bottom: 4, left: 4 }}>
                            <CartesianGrid stroke={grid} vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fill: muted, fontSize: 11 }}
                                stroke={axis}
                                minTickGap={28}
                                tickMargin={6}
                            />
                            <YAxis
                                tick={{ fill: muted, fontSize: 11 }}
                                stroke={axis}
                                width={44}
                                domain={kind === 'boolean' ? [-0.1, 1.1] : ['auto', 'auto']}
                                ticks={kind === 'boolean' ? [0, 1] : undefined}
                                allowDecimals={kind !== 'boolean'}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--surface-1)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    color: 'var(--text-primary)',
                                    fontSize: 12
                                }}
                                labelFormatter={(l, payload) =>
                                    payload && payload[0] ? fmtDateTime(payload[0].payload.t) : l
                                }
                                formatter={(v) => [kind === 'boolean' ? (v ? 'true' : 'false') : v, label]}
                            />
                            <Line
                                type={kind === 'boolean' ? 'stepAfter' : 'monotone'}
                                dataKey="v"
                                stroke={seriesColor}
                                strokeWidth={2}
                                dot={data.length <= 60 ? { r: 2.5, fill: seriesColor, strokeWidth: 0 } : false}
                                activeDot={{ r: 5, stroke: surface, strokeWidth: 2, fill: seriesColor }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {state.status === 'ready' && kind !== 'text' && data.length === 0 && (
                    <p className="muted center">No points.</p>
                )}
            </div>
        </section>
    );
}
