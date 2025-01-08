import { useState } from 'react';
import './App.css';
import DepreciationChart from './components/DepreciationChart';
import PriceChart from './components/PriceChart';
import MarketChart from './components/MarketChart';

function App() {
  const [activeTab, setActiveTab] = useState('depreciation');

  const tabs = [
    { id: 'depreciation', label: 'Verditap' },
    { id: 'price', label: 'Prisutvikling' },
    { id: 'market', label: 'Markedsanalyse' }
  ];

  return (
    <div className="App">
      <header className="header">
        <h1>SjekkBilen</h1>
      </header>
      
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'tab-active' : 'tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'depreciation' && <DepreciationChart />}
        {activeTab === 'price' && <PriceChart />}
        {activeTab === 'market' && <MarketChart />}
      </div>
    </div>
  );
}

export default App;