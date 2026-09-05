import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The browser cannot call Orion (:1026) or QuantumLeap (:8668) directly: neither
// emits CORS headers and there is no gateway in front of them. So the Vite
// dev-server proxies same-origin `/api/*` paths to those services AND injects the
// FIWARE headers each one requires — keeping the React data layer free of hosts
// and headers. When auth arrives later, this proxy is the single place a real
// BFF / token injection replaces (the frontend keeps calling `/api/*` unchanged).
const DEFAULT_CONTEXT =
    'https://raw.githubusercontent.com/smart-data-models/dataModel.Device/master/context.jsonld';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const orionUrl = env.VITE_ORION_URL || 'http://localhost:1026';
    const qlUrl = env.VITE_QL_URL || 'http://localhost:8668';
    // Tenant for Orion-LD reads. Defaults to the BioPC feed; set VITE_ORION_TENANT=
    // (empty) to target the zest-cloud mock data in the default tenant.
    const orionTenant = env.VITE_ORION_TENANT ?? '/';
    const ngsiContext = env.VITE_NGSILD_CONTEXT || DEFAULT_CONTEXT;

    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                // Orion-LD (NGSI-LD): needs the @context Link header on every request,
                // and the NGSILD-Tenant header when a tenant is configured.
                '/api/orion': {
                    target: orionUrl,
                    changeOrigin: true,
                    rewrite: (p) => p.replace(/^\/api\/orion/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq) => {
                            proxyReq.setHeader(
                                'Link',
                                `<${ngsiContext}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`
                            );
                            if (orionTenant) {
                                proxyReq.setHeader('NGSILD-Tenant', orionTenant);
                            }
                        });
                    }
                },
                // QuantumLeap (NGSI-v2): Fiware-ServicePath is mandatory. We do NOT set
                // Fiware-Service — biopc history lands in QuantumLeap's default tenant.
                '/api/quantumleap': {
                    target: qlUrl,
                    changeOrigin: true,
                    rewrite: (p) => p.replace(/^\/api\/quantumleap/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq) => {
                            proxyReq.setHeader('Fiware-ServicePath', '/');
                        });
                    }
                }
            }
        }
    };
});
