import { useState } from 'react';
import './App.css';
import DepreciationChart from './components/DepreciationChart';
import PriceChart from './components/PriceChart';
import MarketChart from './components/MarketChart';
import MultifactorScoreChart from './components/MultifactorScoreChart';
import ResaleCalculator from './components/ResaleCalculator';
import PricePerYearChart from './components/PricePerYearChart';
import { FilterProvider } from './contexts/FilterContext';

function App() {
  const [activeTab, setActiveTab] = useState('depreciation');

  const tabs = [
    { id: 'depreciation', label: 'Verditap' },
    { id: 'price', label: 'Prisutvikling' },
    { id: 'market', label: 'Markedsanalyse' },
    { id: 'multifactor', label: 'Multifaktorscore' },
    { id: 'resale', label: 'Verdikalkulator' },
    { id: 'price-per-year', label: 'Pris per km' }
  ];

  return (
    <FilterProvider>
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
          {activeTab === 'multifactor' && <MultifactorScoreChart />}
          {activeTab === 'resale' && <ResaleCalculator />}
          {activeTab === 'price-per-year' && <PricePerYearChart />}
        </div>
      </div>
    </FilterProvider>
  );
}

export default App;