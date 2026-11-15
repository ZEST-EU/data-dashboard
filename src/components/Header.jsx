const TABS = [
    { id: 'live', label: 'Live feed', subtitle: 'Device Measurements' },
    { id: 'datasets', label: 'Datasets', subtitle: 'Experimental datasets' }
];

export default function Header({ view, onNavigate }) {
    const active = TABS.find((t) => t.id === view) || TABS[0];
    return (
        <header className="app-header">
            <div className="brand">
                <img src="/zest-logo.svg" alt="ZEST" className="brand-logo" width="34" height="34" />
                <div className="brand-text">
                    <span className="brand-title">ZEST Dashboard</span>
                    <span className="brand-subtitle">{active.subtitle}</span>
                </div>
            </div>
            <nav className="nav">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`nav-tab${tab.id === active.id ? ' is-active' : ''}`}
                        onClick={() => onNavigate(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </header>
    );
}
