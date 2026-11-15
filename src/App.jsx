import { useState } from 'react';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import DatasetsPage from './components/DatasetsPage.jsx';

export default function App() {
    // Lightweight view switch (the app has no router). 'live' is the existing
    // Orion/QuantumLeap feed; 'datasets' is the PostgreSQL experimental-data store.
    const [view, setView] = useState('live');
    return (
        <div className="app">
            <Header view={view} onNavigate={setView} />
            {view === 'datasets' ? <DatasetsPage /> : <Dashboard />}
        </div>
    );
}
