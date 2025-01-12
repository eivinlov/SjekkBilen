import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function calculateTrendLine(points) {
  const n = points.length;
  if (n < 2) return null;  // Need at least 2 points for a trend line

  // Calculate means
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  });

  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Get min and max x values
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));

  // Return points for trend line
  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];
}

function DepreciationChart() {
  const [chartData, setChartData] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('all');
  const [allListings, setAllListings] = useState([]);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings_with_metrics.json`)
      .then(response => response.json())
      .then(rawData => {
        const listings = rawData.listings || [];
        
        const validListings = listings.filter(car => 
          car && 
          car.data && 
          car.data['Pris eksl. omreg.'] && 
          car.data['Modellår'] && 
          car.data['Merke'] && 
          car.data['Modell']
        );

        // Store all valid listings
        setAllListings(validListings);

        // Get unique models
        const models = [...new Set(validListings.map(car => 
          `${car.data['Merke']} ${car.data['Modell']}`
        ))].sort();
        
        setAvailableModels(models);
        updateChartData(validListings, 'all');
      });
  }, []);

  const updateChartData = (listings, model) => {
    const filteredListings = model === 'all' 
      ? listings 
      : listings.filter(car => `${car.data['Merke']} ${car.data['Modell']}` === model);

    const processedData = filteredListings.map(car => ({
      age: new Date().getFullYear() - parseInt(car.data['Modellår']),
      price: parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')),
      url: car.url,
      title: `${car.data['Modellår']} ${car.data['Merke']} ${car.data['Modell']}`
    }));

    processedData.sort((a, b) => a.age - b.age);

    // Calculate trend line
    const points = processedData.map(d => ({ x: d.age, y: d.price }));
    const trendLine = calculateTrendLine(points);

    setChartData({
      labels: processedData.map(d => d.age),
      datasets: [
        {
          label: model === 'all' ? 'Verditap over tid (alle modeller)' : `Verditap over tid (${model})`,
          data: processedData.map(d => ({
            x: d.age,
            y: d.price,
            url: d.url,
            title: d.title
          })),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          pointRadius: 5,
          tension: 0.1
        },
        {
          label: 'Trend',
          data: trendLine,
          borderColor: 'rgba(255, 99, 132, 0.8)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    });
  };

  const handleModelChange = (event) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    updateChartData(allListings, newModel);
  };

  const options = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {  // Original data points
              const point = context.raw;
              return [
                `${point.title}`,
                `Pris: ${point.y.toLocaleString()} kr`,
                `Klikk for å se annonsen`
              ];
            } else {  // Trend line
              return `Trend: ${Math.round(context.raw.y).toLocaleString()} kr`;
            }
          }
        }
      },
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Verditap over tid'
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Pris (NOK)'
        },
        beginAtZero: true
      },
      x: {
        title: {
          display: true,
          text: 'Alder (år)'
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && elements[0].datasetIndex === 0) {  // Only for data points, not trend line
        const point = elements[0];
        const url = point.element.$context.raw.url;
        window.open(url, '_blank');
      }
    }
  };

  if (!chartData) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <select 
          value={selectedModel} 
          onChange={handleModelChange}
          style={{
            padding: '8px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '300px',
            maxWidth: '100%'
          }}
        >
          <option value="all">Alle modeller</option>
          {availableModels.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
      <Line options={options} data={chartData} />
    </div>
  );
}

export default DepreciationChart; 