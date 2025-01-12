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

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings_with_metrics.json`)
      .then(response => response.json())
      .then(rawData => {
        const listings = rawData.listings || [];
        console.log('Number of listings:', listings.length);
        
        const validListings = listings.filter(car => 
          car && 
          car.data && 
          car.data['Pris eksl. omreg.'] &&
          car.data['Modellår'] &&
          car.data['Merke'] &&
          car.data['Modell']
        );
        console.log('Valid listings:', validListings.length);
        
        const carsByYear = validListings.reduce((acc, car) => {
          const year = car.data['Modellår'];
          if (!acc[year]) {
            acc[year] = {
              count: 0,
              cars: []
            };
          }
          acc[year].count += 1;
          acc[year].cars.push({
            url: car.url,
            title: `${car.data['Modellår']} ${car.data['Merke']} ${car.data['Modell']}`,
            price: parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''))
          });
          return acc;
        }, {});

        const years = Object.keys(carsByYear).sort();
        console.log('Years found:', years);

        setChartData({
          labels: years,
          datasets: [{
            label: 'Antall biler per årsmodell',
            data: years.map(year => carsByYear[year].count),
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            cars: years.map(year => carsByYear[year].cars)
          }]
        });
      })
      .catch(error => {
        console.error('Error loading data:', error);
      });
  }, []);

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

  return <Bar options={options} data={chartData} />;
}

export default MarketChart; 