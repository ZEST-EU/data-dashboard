import { useEffect, useState } from 'react';

// Recharts sets stroke/fill as SVG *presentation attributes*, where CSS `var(...)`
// does not resolve. So we read the resolved hex of the CSS custom properties from
// :root and re-read them whenever the color scheme flips — giving charts concrete
// colors that still track light/dark mode.

const VARS = ['--series-1', '--series-2', '--grid', '--axis', '--muted', '--surface-1', '--border', '--text-primary'];

function read() {
    if (typeof window === 'undefined') return {};
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const v of VARS) out[v] = cs.getPropertyValue(v).trim();
    return out;
}

export function useThemeColors() {
    const [colors, setColors] = useState(read);

    useEffect(() => {
        const update = () => setColors(read());
        update();
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return colors;
}
