import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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
  BarElement,
  Title,
  Tooltip,
  Legend
);

function MarketChart() {
  const [chartData, setChartData] = useState(null);
  const [listings, setListings] = useState(null);
  const { 
    primaryFilters, 
    setFilterOptions 
  } = useFilters();

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
      .then(response => response.json())
      .then(rawData => {
        const listings = rawData.listings || [];
        setListings(listings);

        // Extract unique values for filters
        const models = [...new Set(listings.map(car => car.data['Modell']).filter(Boolean))];
        const modelYears = [...new Set(listings.map(car => car.data['Modellår']).filter(Boolean))];
        const fuelTypes = [...new Set(listings.map(car => car.data['Drivstoff']).filter(Boolean))];
        const drivetrains = [...new Set(listings.map(car => car.data['Hjuldrift']).filter(Boolean))];

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
    const carsByYear = listings.reduce((acc, car) => {
      if (car?.data?.['Modellår']) {
        const year = car.data['Modellår'];
        if (!acc[year]) {
          acc[year] = {
            count: 0,
            cars: []
          };
        }
        acc[year].count += 1;
        
        if (car?.url && car?.data?.['Merke'] && car?.data?.['Modell'] && car?.data?.['Pris eksl. omreg.']) {
          acc[year].cars.push({
            url: car.url,
            title: `${car.data['Modellår']} ${car.data['Merke']} ${car.data['Modell']}`,
            price: parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''))
          });
        }
      }
      return acc;
    }, {});

    const years = Object.keys(carsByYear).sort();

    setChartData({
      labels: years,
      datasets: [{
        label: 'Antall biler per årsmodell',
        data: years.map(year => carsByYear[year].count),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        cars: years.map(year => carsByYear[year].cars)
      }]
    });
  };

  const options = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const count = context.raw;
            return [
              `Antall biler: ${count}`,
              '-------------------',
              'Klikk for å se alle annonser'
            ];
          }
        }
      },
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Markedsfordeling per årsmodell'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Antall biler'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Årsmodell'
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const cars = element.dataset.cars[element.index];
        // Open first 5 listings in new tabs
        cars.slice(0, 5).forEach(car => {
          window.open(car.url, '_blank');
        });
      }
    }
  };

  if (!chartData) return <div>Loading...</div>;

  return (
    <div>
      <FilterPanel />
      <Bar options={options} data={chartData} />
    </div>
  );
}

export default MarketChart; 