import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useEffect, useState, useCallback } from 'react';
import { Grid, Slider, Typography, Box } from '@mui/material';
import { useFilters } from '../contexts/FilterContext';
import { FilterPanel } from './FilterPanel';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

function MultifactorScoreChart() {
  const [chartData, setChartData] = useState(null);
  const [listings, setListings] = useState(null);
  const [weights, setWeights] = useState({
    price_per_10k: 1,
    age: 1,
    mileage: 1,
    power: 1
  });
  const { 
    primaryFilters, 
    setFilterOptions 
  } = useFilters();

  const calculateScore = useCallback((car, weights) => {
    const price = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''));
    const km = parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, ''));
    const age = new Date().getFullYear() - parseInt(car.data['Modellår']);
    const power = parseInt(car.data['Effekt']?.replace(/[^0-9]/g, '') || '0');
    
    // Improved score calculation
    return (
      weights.price_per_10k * (1 / (price / (km / 10000))) + // Higher km/price is better
      weights.age * (1 / Math.pow(age, 1.5)) * 10 + // Newer cars score higher, exponential decay
      weights.mileage * (1 - (km / 500000)) + // Lower km is better, normalized to 500k km
      weights.power * (power / 300) // Power normalized to 300hp
    );
  }, []);

  const updateChart = useCallback((listings, currentWeights) => {
    const validListings = listings.filter(car =>
      car?.data?.['Pris eksl. omreg.'] &&
      car?.data?.['Kilometerstand'] &&
      car?.data?.['Modellår'] &&
      car?.data?.['Effekt']
    );

    const chartPoints = validListings.map(car => ({
      x: calculateScore(car, currentWeights),
      y: parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')),
      url: car.url,
      title: `${car.data['Modellår']} ${car.data['Merke']} ${car.data['Modell']}`,
      km: parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')).toLocaleString(),
      power: car.data['Effekt'],
      age: new Date().getFullYear() - parseInt(car.data['Modellår'])
    }));

    setChartData({
      datasets: [{
        label: 'Multifaktorscore vs. Pris',
        data: chartPoints,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        pointRadius: 5
      }]
    });
  }, [calculateScore]);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
      .then(response => response.json())
      .then(rawData => {
        setListings(rawData.listings || []);

        // Extract unique values for filters
        const models = [...new Set(rawData.listings.map(car => car.data['Modell']).filter(Boolean))];
        const modelYears = [...new Set(rawData.listings.map(car => car.data['Modellår']).filter(Boolean))];
        const fuelTypes = [...new Set(rawData.listings.map(car => car.data['Drivstoff']).filter(Boolean))];
        const drivetrains = [...new Set(rawData.listings.map(car => car.data['Hjuldrift']).filter(Boolean))];

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

      updateChart(filteredListings, weights);
    }
  }, [listings, primaryFilters, weights, updateChart]);

  const handleWeightChange = (name) => (event, value) => {
    setWeights(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
              `Kilometer: ${point.km}`,
              `Effekt: ${point.power}`,
              `Alder: ${point.age} år`,
              `Score: ${point.x.toFixed(2)}`,
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
        text: 'Multifaktorscore vs. Pris'
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
          text: 'Multifaktorscore (høyere er bedre)'
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

  return (
    <div>
      <FilterPanel />
      <Box sx={{ width: '100%', mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ px: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Pris/km vekt: {weights.price_per_10k}
              </Typography>
              <Slider
                value={weights.price_per_10k}
                onChange={handleWeightChange('price_per_10k')}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                size="small"
              />
              <Typography variant="subtitle2" gutterBottom>
                Alder vekt: {weights.age}
              </Typography>
              <Slider
                value={weights.age}
                onChange={handleWeightChange('age')}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ px: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Kilometerstand vekt: {weights.mileage}
              </Typography>
              <Slider
                value={weights.mileage}
                onChange={handleWeightChange('mileage')}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                size="small"
              />
              <Typography variant="subtitle2" gutterBottom>
                Effekt vekt: {weights.power}
              </Typography>
              <Slider
                value={weights.power}
                onChange={handleWeightChange('power')}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
      <Scatter options={options} data={chartData} />
    </div>
  );
}

export default MultifactorScoreChart;
