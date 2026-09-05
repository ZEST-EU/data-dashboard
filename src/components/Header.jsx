export default function Header() {
    return (
        <header className="app-header">
            <div className="brand">
                <img src="/zest-logo.svg" alt="ZEST" className="brand-logo" width="34" height="34" />
                <div className="brand-text">
                    <span className="brand-title">ZEST Dashboard</span>
                    <span className="brand-subtitle">Device Measurements</span>
                </div>
            </div>
        </header>
    );
}
