import { Fragment, useEffect, useState } from 'react';
import {
    listDatasets,
    getDataset,
    uploadDataset,
    deleteDataset,
    downloadAllUrl,
    downloadFileUrl
} from '../api/datasets.js';

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function fmtSize(bytes) {
    if (typeof bytes !== 'number') return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Upload form ------------------------------------------------------------
function UploadCard({ onUploaded }) {
    const [files, setFiles] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    function pickFiles(e) {
        setFiles(Array.from(e.target.files || []));
        setResult(null);
        setError(null);
    }

    const canSubmit = files.length > 0 && !busy;

    async function submit(e) {
        e.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        setResult(null);
        try {
            const res = await uploadDataset(files, { name, description });
            setResult(res);
            setFiles([]);
            setName('');
            setDescription('');
            e.target.reset();
            onUploaded();
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="card upload-card" onSubmit={submit}>
            <div className="card-head">
                <div className="card-heading">
                    <h3 className="card-title">Upload a dataset</h3>
                    <span className="card-sub">
                        Select one or more files — they are stored together as one dataset.
                    </span>
                </div>
            </div>

            <div className="upload-grid">
                <label className="file-field">
                    <span className="file-label">
                        Files <span className="req">required</span>
                    </span>
                    <input type="file" multiple onChange={pickFiles} />
                    <span className="file-name">
                        {files.length ? `${files.length} file(s) selected` : 'No files selected'}
                    </span>
                </label>
                <label className="file-field">
                    <span className="file-label">Name</span>
                    <input
                        type="text"
                        className="text-input"
                        placeholder="e.g. SIM-01"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <span className="file-name">Defaults to the first filename.</span>
                </label>
                <label className="file-field">
                    <span className="file-label">Description</span>
                    <input
                        type="text"
                        className="text-input"
                        placeholder="Optional"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <span className="file-name">&nbsp;</span>
                </label>
            </div>

            {files.length > 0 && (
                <div className="file-chips">
                    {files.map((f) => (
                        <span key={f.name} className="badge">
                            {f.name} <span className="muted">({fmtSize(f.size)})</span>
                        </span>
                    ))}
                </div>
            )}

            <div className="toolbar">
                <span className="muted small">Files are uploaded to MinIO object storage.</span>
                <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
                    {busy ? 'Uploading…' : 'Upload'}
                </button>
            </div>

            {error && (
                <div className="banner banner-error">
                    <strong>Upload failed</strong>
                    <span className="small">{error}</span>
                </div>
            )}
            {result && (
                <div className="banner banner-ok">
                    <strong>Uploaded “{result.name || result.dataset_id}”</strong>
                    <span className="small">
                        {result.file_count} file(s), {fmtSize(result.total_size)}.
                    </span>
                </div>
            )}
        </form>
    );
}

// --- Expandable detail (per-file download links) ----------------------------
function DatasetDetail({ datasetId }) {
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        getDataset(datasetId)
            .then((d) => alive && setDetail(d))
            .catch((e) => alive && setError(e.message || String(e)));
        return () => {
            alive = false;
        };
    }, [datasetId]);

    if (error) return <div className="detail-panel error small">{error}</div>;
    if (!detail) return <div className="detail-panel muted small">Loading…</div>;

    return (
        <div className="detail-panel">
            {detail.description && <p className="muted small detail-note">{detail.description}</p>}
            <div className="detail-files">
                <span className="detail-label">Files</span>
                <div className="file-links">
                    {detail.files.map((f) => (
                        <a key={f.id} className="btn btn-sm" href={downloadFileUrl(datasetId, f.id)}>
                            ↓ {f.filename} <span className="muted">({fmtSize(f.size_bytes)})</span>
                        </a>
                    ))}
                    <a className="btn btn-sm" href={downloadAllUrl(datasetId)}>
                        ↓ All (zip)
                    </a>
                </div>
            </div>
        </div>
    );
}

// --- Page -------------------------------------------------------------------
export default function DatasetsPage() {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);

    async function reload() {
        setLoading(true);
        setError(null);
        try {
            setPage(await listDatasets({ limit: 200 }));
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        reload();
    }, []);

    async function remove(datasetId, label) {
        if (!window.confirm(`Delete dataset “${label}” and all of its files?`)) return;
        try {
            await deleteDataset(datasetId);
            if (expanded === datasetId) setExpanded(null);
            reload();
        } catch (err) {
            setError(err.message || String(err));
        }
    }

    const items = page ? page.items : [];

    return (
        <div className="content">
            <UploadCard onUploaded={reload} />

            <div className="toolbar">
                <div className="toolbar-left">
                    <h3 className="card-title" style={{ whiteSpace: 'normal' }}>
                        Datasets{page ? ` (${page.total})` : ''}
                    </h3>
                </div>
                <button className="btn" type="button" onClick={reload} disabled={loading}>
                    {loading ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="banner banner-error">
                    <strong>Could not reach the data API</strong>
                    <span className="small">{error}</span>
                    <span className="small muted">
                        Is <code>zest-data-api</code> running and proxied at <code>/api/data</code>?
                    </span>
                </div>
            )}

            {!error && !loading && items.length === 0 && (
                <div className="empty">No datasets yet — upload one above to get started.</div>
            )}

            {items.length > 0 && (
                <div className="table-wrap">
                    <table className="dataset-table">
                        <thead>
                            <tr>
                                <th />
                                <th>Name</th>
                                <th>Dataset ID</th>
                                <th>Files</th>
                                <th>Size</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((d) => {
                                const open = expanded === d.dataset_id;
                                const label = d.name || d.dataset_id;
                                return (
                                    <Fragment key={d.dataset_id}>
                                        <tr
                                            className={`dataset-row${open ? ' is-open' : ''}`}
                                            onClick={() =>
                                                setExpanded(open ? null : d.dataset_id)
                                            }
                                        >
                                            <td className="chevron">{open ? '▾' : '▸'}</td>
                                            <td>
                                                <div className="ds-name">{label}</div>
                                            </td>
                                            <td className="muted small">{d.dataset_id}</td>
                                            <td>{d.file_count}</td>
                                            <td>{fmtSize(d.total_size)}</td>
                                            <td className="muted small">{fmtDate(d.created_at)}</td>
                                            <td
                                                className="row-actions"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <a
                                                    className="btn btn-sm"
                                                    href={downloadAllUrl(d.dataset_id)}
                                                >
                                                    Download
                                                </a>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    type="button"
                                                    onClick={() => remove(d.dataset_id, label)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                        {open && (
                                            <tr className="detail-row">
                                                <td colSpan={7}>
                                                    <DatasetDetail datasetId={d.dataset_id} />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
