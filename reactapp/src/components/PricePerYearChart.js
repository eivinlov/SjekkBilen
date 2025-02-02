import React, { useState, useEffect, useCallback } from 'react';
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
import Grid2 from '@mui/material/Grid2';
import { Select, MenuItem, Typography, Box, TextField } from '@mui/material';
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

const PricePerYearChart = () => {
  const [chartData, setChartData] = useState(null);
  const [listings, setListings] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('price_per_10k');
  const { 
    primaryFilters, 
    setFilterOptions 
  } = useFilters();

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings_with_metrics.json`)
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

      updateChart(filteredListings);
    }
  }, [listings, primaryFilters, selectedMetric, updateChart]);

  const calculateValueScore = useCallback((price, kilometers) => {
    return (1 / price) * (1 / kilometers) * 1_000_000_000;
  }, []);

  const updateChart = useCallback((listings) => {
    const validListings = listings.filter(listing => 
      listing?.data?.['Pris eksl. omreg.'] &&
      listing?.data?.['Kilometerstand'] &&
      listing?.data?.['Modellår'] &&
      listing?.data?.['Merke'] &&
      listing?.data?.['Modell'] &&
      listing?.metrics?.metrics?.price_per_10k
    );

    const dataPoints = validListings.map(listing => {
      try {
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
      } catch (error) {
        console.warn('Error processing listing:', error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries from failed processing

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
  }, [selectedMetric, calculateValueScore]);

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
      <FilterPanel />
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
        </Grid2>
      </Box>
      <Line options={options} data={chartData} />
    </div>
  );
}

export default PricePerYearChart; 