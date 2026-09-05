# ZEST Dashboard

A simple React dashboard for the ZEST FIWARE pipeline. It lists the live
`DeviceMeasurement` entities from **Orion-LD**, lets you pick which ones to view,
and charts each one's history from **QuantumLeap**.

- **Numeric** measurements (`numValue`) → line chart
- **Boolean** measurements (`boolValue`, e.g. alarms) → step chart (0/1)
- **Text** measurements (`textValue`) → latest-values table

![Dashboard example image](./docs/dashboard_example.png)

## Prerequisites

The dashboard talks to the ZEST cluster (`../zest-cloud-k8s`). Because neither
Orion nor QuantumLeap emit CORS headers, the Vite dev server proxies to them and
injects the required FIWARE headers. You just need the services reachable on
`localhost`:

```bash
# in ../zest-cloud-k8s
./manage.sh start
minikube tunnel        # maps the LoadBalancer services to localhost:1026 / :8668
```

Make sure there is data to show — either the BioPC OPC-UA agent
(`../biopc-client`) is running, or seed the mock feed:

```bash
# in ../zest-cloud-k8s  (mock data lands in the DEFAULT tenant — see config note below)
python3 scripts/send_mock_measurements.py
```

You can sanity-check the raw APIs the dashboard mirrors:

```bash
# in ../biopc-client
./check-orion.sh                                   # live entity list (Orion)
./query-quantumleap.sh BioPC.ProcessVariables.T3_PV  # history (QuantumLeap)
```

## Run

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173).

## Configuration

Config lives in `.env` (copied from `.env.example`) and is consumed by
`vite.config.js` — restart `npm run dev` after changing it.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_ORION_URL` | `http://localhost:1026` | Orion-LD base URL |
| `VITE_ORION_TENANT` | `opcua_biopc` | Orion tenant. **Set empty** to target the zest-cloud mock data (default tenant). |
| `VITE_QL_URL` | `http://localhost:8668` | QuantumLeap base URL |
| `VITE_NGSILD_CONTEXT` | smart-data-models Device context | `@context` for the Orion `Link` header |

**To view the mock data** (`send_mock_measurements.py`), set:

```
VITE_ORION_TENANT=
```

QuantumLeap is queried with `Fiware-ServicePath: /` and **no** `Fiware-Service`
header, so biopc/mock history in QuantumLeap's default tenant is read the same way
in both cases.

## How it works

```
Browser ──/api/orion/*──▶  Vite proxy ──▶ Orion-LD :1026   (adds Link + NGSILD-Tenant)
        ──/api/quantumleap/*─▶ Vite proxy ──▶ QuantumLeap :8668 (adds Fiware-ServicePath)
```

- `src/api/fiware.js` — `listDeviceMeasurements()` (Orion) and
  `getAttrHistory(id, attr, lastN)` (QuantumLeap).
- `src/lib/measurements.js` — parses each entity's id into a label/category and
  detects its attribute type (`numValue`/`boolValue`/`textValue`).
- `src/components/` — `Header`, `MeasurementPicker` (search + grouped multi-select),
  `Dashboard` (state + toolbar), `MeasurementChart` (one card, Recharts).

## Notes / future work

- `public/zest-logo.svg` is a **placeholder** — swap it for the real ZEST logo.
- Not yet built: authentication (Keycloak/OAuth2), a production reverse-proxy/BFF,
  date-range (`fromDate`/`toDate`) selection, friendly labels from
  `biopc_tag_list.csv`, overlaying multiple series on shared axes.
