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
import { useFilters } from '../contexts/FilterContext';
import { FilterPanel } from './FilterPanel';

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
  const [listings, setListings] = useState(null);
  const { 
    primaryFilters, 
    setFilterOptions 
  } = useFilters();

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

        setListings(validListings);

        // Extract unique values for filters
        const models = [...new Set(validListings.map(car => car.data['Modell']).filter(Boolean))];
        const modelYears = [...new Set(validListings.map(car => car.data['Modellår']).filter(Boolean))];
        const fuelTypes = [...new Set(validListings.map(car => car.data['Drivstoff']).filter(Boolean))];
        const drivetrains = [...new Set(validListings.map(car => car.data['Hjuldrift']).filter(Boolean))];

        setFilterOptions({
          models: models.sort(),
          modelYears: modelYears.sort(),
          fuelTypes: fuelTypes.sort(),
          drivetrains: drivetrains.sort()
        });
      });
  }, [setFilterOptions]);

  useEffect(() => {
    if (listings) {
      const filteredListings = listings.filter(car => {
        return (primaryFilters.model === 'all' || car.data['Modell'] === primaryFilters.model) &&
               (primaryFilters.modelYear === 'all' || car.data['Modellår'] === primaryFilters.modelYear) &&
               (primaryFilters.fuelType === 'all' || car.data['Drivstoff'] === primaryFilters.fuelType) &&
               (primaryFilters.drivetrain === 'all' || car.data['Hjuldrift'] === primaryFilters.drivetrain) &&
               (!primaryFilters.showOnlySold || car.status === 'SOLGT');
      });

      updateChartData(filteredListings);
    }
  }, [listings, primaryFilters]);

  const updateChartData = (listings) => {
    const processedData = listings.map(car => ({
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
          label: primaryFilters.model === 'all' ? 'Verditap over tid (alle modeller)' : `Verditap over tid (${primaryFilters.model})`,
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
      <FilterPanel />
      <Line options={options} data={chartData} />
    </div>
  );
}

export default DepreciationChart; 