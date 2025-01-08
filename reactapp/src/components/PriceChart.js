import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

function PriceChart() {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetch('/finn_listings_with_metrics.json')
      .then(response => response.json())
      .then(rawData => {
        // Get the listings array
        const listings = rawData.listings || [];
        console.log('Number of listings:', listings.length);

        const validListings = listings.filter(car => {
          return car && 
                 car.data && 
                 car.data['Kilometerstand'] && 
                 car.data['Pris eksl. omreg.'] && 
                 car.data['Modellår'] && 
                 car.data['Merke'] && 
                 car.data['Modell'];
        });

        console.log('Valid listings:', validListings.length);

        const chartDataPoints = validListings.map(car => ({
          x: parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')),
          y: parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')),
          url: car.url,
          title: `${car.data['Modellår']} ${car.data['Merke']} ${car.data['Modell']}`
        }));

        console.log('Data points created:', chartDataPoints.length);

        setChartData({
          datasets: [{
            label: 'Pris vs. Kilometer',
            data: chartDataPoints,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            pointRadius: 5,
            showLine: false  // Make sure it's a scatter plot
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
            const point = context.raw;
            return [
              `${point.title}`,
              `Pris: ${point.y.toLocaleString()} kr`,
              `Kilometer: ${point.x.toLocaleString()}`,
              `Klikk for å se annonsen`
            ];
          }
        }
      },
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Pris vs. Kilometer'
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Pris (NOK)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Kilometer'
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const point = elements[0];
        const url = point.element.$context.raw.url;
        window.open(url, '_blank');
      }
    }
  };

  if (!chartData) return <div>Loading...</div>;

  return <Scatter options={options} data={chartData} />;
}

export default PriceChart; 