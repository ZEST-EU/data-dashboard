// Thin wrappers over the two FIWARE APIs, hitting the same-origin `/api/*` paths
// that vite.config.js proxies (and where the required FIWARE headers are added).
// Nothing here knows about hosts, tenants, or auth — that all lives in the proxy.

const ORION_BASE = '/api/orion';
const QL_BASE = '/api/quantumleap';

/**
 * List the live DeviceMeasurement entities from Orion-LD (keyValues form).
 * Each returned entity looks like { id, type, numValue|boolValue|textValue, ... }.
 */
export async function listDeviceMeasurements() {
    // limit=1000 is Orion's max page size; the BioPC feed has ~198 entities.
    const url = `${ORION_BASE}/ngsi-ld/v1/entities?type=DeviceMeasurement&options=keyValues&limit=1000`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw new Error(`Orion returned ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Fetch the time-series history of one attribute of one entity from QuantumLeap.
 * Returns { points: [{ t, v }], noData: boolean, message?: string }.
 * QuantumLeap answers { error, description } (usually 404) when it has no history.
 */
export async function getAttrHistory(entityId, attr, lastN = 50) {
    const url = `${QL_BASE}/v2/entities/${encodeURIComponent(entityId)}/attrs/${encodeURIComponent(
        attr
    )}?lastN=${lastN}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => ({}));

    if (body && body.error) {
        return { points: [], noData: true, message: body.description || body.error };
    }
    if (!res.ok) {
        throw new Error(`QuantumLeap returned ${res.status} ${res.statusText}`);
    }

    // Response may be { data: { index, values } } or a flat { index, values }.
    const d = body.data || body;
    const index = Array.isArray(d.index) ? d.index : [];
    const values = Array.isArray(d.values) ? d.values : [];
    const points = index.map((t, i) => ({ t, v: values[i] }));
    return { points, noData: points.length === 0 };
}
