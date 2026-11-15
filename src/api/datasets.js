// Thin wrappers over zest-data-api, the dataset store for experimental fermentation
// data. Dataset files live in MinIO (object storage) behind the API; this client
// hits the same-origin `/api/data/*` path that the dev Vite proxy and the prod nginx
// config forward to the API. This is a SEPARATE flow from the Orion/QuantumLeap live
// DeviceMeasurement feed in fiware.js — the two never mix.

const DATA_BASE = '/api/data';

async function parseError(res) {
    // The API answers errors as { error: { code, message, detail } }.
    const body = await res.json().catch(() => null);
    if (body && body.error && body.error.message) {
        return body.error.message;
    }
    return `${res.status} ${res.statusText}`;
}

/** List datasets (newest first). Returns { items, total, limit, offset }. */
export async function listDatasets({ limit = 100, offset = 0 } = {}) {
    const res = await fetch(`${DATA_BASE}/datasets?limit=${limit}&offset=${offset}`, {
        headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

/** Fetch one dataset's detail (file list). */
export async function getDataset(datasetId) {
    const res = await fetch(`${DATA_BASE}/datasets/${encodeURIComponent(datasetId)}`, {
        headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

/**
 * Upload one or more files as a single dataset. `fileList` is a FileList or an array
 * of File objects; `name`/`description` are optional. Returns the dataset detail.
 */
export async function uploadDataset(fileList, { name = '', description = '' } = {}) {
    const form = new FormData();
    for (const file of fileList) {
        form.append('files', file, file.name);
    }
    if (name) form.append('name', name);
    if (description) form.append('description', description);

    const res = await fetch(`${DATA_BASE}/datasets`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

/** Delete a dataset and its objects. */
export async function deleteDataset(datasetId) {
    const res = await fetch(`${DATA_BASE}/datasets/${encodeURIComponent(datasetId)}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

/** Same-origin URL for the zip of a dataset's files (use in a download link). */
export function downloadAllUrl(datasetId) {
    return `${DATA_BASE}/datasets/${encodeURIComponent(datasetId)}/download`;
}

/** Same-origin URL for one file (by its numeric id from the dataset detail). */
export function downloadFileUrl(datasetId, fileId) {
    return `${DATA_BASE}/datasets/${encodeURIComponent(datasetId)}/files/${fileId}`;
}
