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
import { useEffect, useState, useMemo } from 'react';
import Grid2 from '@mui/material/Grid2';
import { Select, MenuItem, Typography, Box, TextField } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function PricePerYearChart() {
  const [chartData, setChartData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('price_per_10k');
  const [filters, setFilters] = useState({
    model: 'all',
    minMileage: '',
    maxMileage: '',
    fuelType: 'all',
    drivetrain: 'all'
  });
  const [filterOptions, setFilterOptions] = useState({
    models: [],
    fuelTypes: [],
    drivetrains: []
  });
  const [listings, setListings] = useState(null);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings_with_metrics.json`)
      .then(response => response.json())
      .then(rawData => {
        const allListings = rawData.listings || [];
        console.log('Number of listings:', allListings.length);
        
        // Validate listings like in PriceChart
        const validListings = allListings.filter(car => {
          return car && 
                 car.data && 
                 car.data['Kilometerstand'] && 
                 car.data['Pris eksl. omreg.'] && 
                 car.data['Modellår'] && 
                 car.data['Merke'] && 
                 car.data['Modell'] &&
                 car.metrics['metrics']['price_per_10k'];  // Additional check specific to this chart
        });
        
        console.log('Valid listings:', validListings.length);
        setListings(validListings);
        
        // Extract unique values for filters from valid listings only
        const models = [...new Set(validListings.map(car => car.data['Modell']).filter(Boolean))];
        const fuelTypes = [...new Set(validListings.map(car => car.data['Drivstoff']).filter(Boolean))];
        const drivetrains = [...new Set(validListings.map(car => car.data['Hjuldrift']).filter(Boolean))];
        
        setFilterOptions({
          models: models.sort(),
          fuelTypes: fuelTypes.sort(),
          drivetrains: drivetrains.sort()
        });
      })
      .catch(error => {
        console.error('Error loading data:', error);
      });
  }, []);

  useEffect(() => {
    if (listings) {
      updateChart(listings, filters);
    }
  }, [listings, filters.model, filters.minMileage, filters.maxMileage, filters.fuelType, filters.drivetrain, selectedMetric]);

  const calculateValueScore = (price, kilometers) => {
    return (1 / price) * (1 / kilometers) * 1_000_000_000;
  };

  const updateChart = (listings, currentFilters) => {
    const filteredListings = listings.filter(listing => {
      if (!listing?.data || !listing?.metrics?.metrics?.price_per_10k) return false;
      
      const mileage = parseInt(listing.data['Kilometerstand']?.replace(/[^0-9]/g, '') || '0');
      
      return (
        (currentFilters.model === 'all' || listing.data['Modell'] === currentFilters.model) &&
        (currentFilters.fuelType === 'all' || listing.data['Drivstoff'] === currentFilters.fuelType) &&
        (currentFilters.drivetrain === 'all' || listing.data['Hjuldrift'] === currentFilters.drivetrain) &&
        (!currentFilters.minMileage || mileage >= parseInt(currentFilters.minMileage)) &&
        (!currentFilters.maxMileage || mileage <= parseInt(currentFilters.maxMileage))
      );
    });

    const dataPoints = filteredListings.map(listing => {
      const price = parseInt(listing.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''));
      const kilometers = parseInt(listing.data['Kilometerstand'].replace(/[^0-9]/g, ''));
      const valueScore = calculateValueScore(price, kilometers);

      return {
        x: parseInt(listing.data['Modellår']),
        y: selectedMetric === 'price_per_10k' ? listing.metrics.metrics.price_per_10k : valueScore,
        url: listing.url,
        title: `${listing.data['Modellår']} ${listing.data['Merke']} ${listing.data['Modell']}`,
        km: kilometers.toLocaleString(),
        price: price.toLocaleString()
      };
    });

    dataPoints.sort((a, b) => a.x - b.x);

    setChartData({
      datasets: [{
        label: selectedMetric === 'price_per_10k' ? 'Pris per 10.000 km' : 'Verdi score (høyere er bedre)',
        data: dataPoints,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        pointRadius: 5,
        showLine: false
      }]
    });
  };

  const handleFilterChange = (filterName) => (event) => {
    const newFilters = {
      ...filters,
      [filterName]: event.target.value
    };
    setFilters(newFilters);
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: selectedMetric === 'price_per_10k' ? 'Pris per 10.000 km over årsmodeller' : 'Verdi score over årsmodeller'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const point = context.raw;
            return [
              `${point.title}`,
              `Pris: ${point.price} kr`,
              `Kilometer: ${point.km}`,
              selectedMetric === 'price_per_10k' 
                ? `Pris per 10k km: ${Math.round(point.y).toLocaleString()} kr`
                : `Verdi score: ${point.y.toFixed(2)}`,
              `Klikk for å se annonsen`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: selectedMetric === 'price_per_10k' ? 'Pris per 10.000 km (NOK)' : 'Verdi score'
        },
        beginAtZero: true
      },
      x: {
        title: {
          display: true,
          text: 'Årsmodell'
        },
        type: 'linear',
        min: 2013,
        max: 2024
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
      <Box sx={{ mb: 3 }}>
        <Grid2 container spacing={2}>
          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Metrikk
            </Typography>
            <Select
              fullWidth
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              size="small"
            >
              <MenuItem value="price_per_10k">Pris per 10.000 km</MenuItem>
              <MenuItem value="value_score">Verdi score</MenuItem>
            </Select>
          </Grid2>
          
          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Modell
            </Typography>
            <Select
              fullWidth
              value={filters.model}
              onChange={handleFilterChange('model')}
              size="small"
            >
              <MenuItem value="all">Alle modeller</MenuItem>
              {filterOptions.models.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))}
            </Select>
          </Grid2>
          
          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Drivstoff
            </Typography>
            <Select
              fullWidth
              value={filters.fuelType}
              onChange={handleFilterChange('fuelType')}
              size="small"
            >
              <MenuItem value="all">Alle typer</MenuItem>
              {filterOptions.fuelTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </Grid2>
          
          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Hjuldrift
            </Typography>
            <Select
              fullWidth
              value={filters.drivetrain}
              onChange={handleFilterChange('drivetrain')}
              size="small"
            >
              <MenuItem value="all">Alle typer</MenuItem>
              {filterOptions.drivetrains.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </Grid2>
          
          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Kilometerstand
            </Typography>
            <Grid2 container spacing={1}>
              <Grid2 xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Min"
                  value={filters.minMileage}
                  onChange={handleFilterChange('minMileage')}
                  type="number"
                />
              </Grid2>
              <Grid2 xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Max"
                  value={filters.maxMileage}
                  onChange={handleFilterChange('maxMileage')}
                  type="number"
                />
              </Grid2>
            </Grid2>
          </Grid2>
        </Grid2>
      </Box>
      
      <Line options={options} data={chartData} />
    </div>
  );
}

export default PricePerYearChart; 