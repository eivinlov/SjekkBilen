import { Line } from 'react-chartjs-2';
import { useState, useEffect, useCallback } from 'react';
import { Grid, Select, MenuItem, Typography, Box, TextField } from '@mui/material';
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

function ResaleCalculator() {
  const [models, setModels] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [inputData, setInputData] = useState({
    model: '',
    age: 0,
    mileage: 0,
    price: 0,
    fuelType: '',
    expectedMileagePerYear: 15000
  });
  const [chartData, setChartData] = useState(null);
  const { primaryFilters, setFilterOptions } = useFilters();

  // Load initial data
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
      .then(response => response.json())
      .then(data => {
        const listings = data.listings || [];
        
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
    fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
      .then(response => response.json())
      .then(data => {
        const listings = data.listings || [];
        // Get unique models
        const uniqueModels = [...new Set(listings.map(car => 
          car.data['Modell']
        ))].sort();
        // Get unique fuel types
        const uniqueFuelTypes = [...new Set(listings.map(car => 
          car.data['Drivstoff']
        ))].sort();
        
        setModels(uniqueModels);
        setFuelTypes(uniqueFuelTypes);
      });
  }, []);

  const calculateDepreciation = useCallback((listings, model, fuelType) => {
    // Filter comparable listings with better error handling
    const comparables = listings.filter(car => 
      car?.data?.['Modell'] === model &&
      car?.data?.['Drivstoff'] === fuelType &&
      car?.data?.['Pris eksl. omreg.'] &&
      car?.data?.['Modellår'] &&
      car?.data?.['Kilometerstand']
    );

    console.log(`Found ${comparables.length} comparable listings`);

    // Group by age and calculate average prices
    const pricesByAge = {};
    comparables.forEach(car => {
      try {
        const age = new Date().getFullYear() - parseInt(car.data['Modellår']);
        const price = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''));
        const mileage = parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, ''));
        
        // Validate the parsed values
        if (!isNaN(age) && !isNaN(price) && !isNaN(mileage)) {
          if (!pricesByAge[age]) {
            pricesByAge[age] = [];
          }
          pricesByAge[age].push({ price, mileage });
        }
      } catch (error) {
        console.warn('Error processing car listing:', error);
      }
    });

    // Calculate average price for each age
    const averagePrices = Object.entries(pricesByAge)
      .map(([age, data]) => ({
        age: parseInt(age),
        price: data.reduce((a, b) => a + b.price, 0) / data.length,
        avgMileage: data.reduce((a, b) => a + b.mileage, 0) / data.length
      }))
      .filter(entry => !isNaN(entry.price) && !isNaN(entry.avgMileage));

    return averagePrices.sort((a, b) => a.age - b.age);
  }, []);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setInputData(prev => ({
      ...prev,
      [field]: value
    }));

    // Recalculate predictions when inputs change
    if (inputData.model && inputData.fuelType) {
      updatePredictions({
        ...inputData,
        [field]: value
      });
    }
  };

  const updatePredictions = useCallback((inputs) => {
    if (!inputs.model || !inputs.fuelType || !inputs.price || inputs.price <= 0) {
      console.log('Missing required inputs');
      return;
    }

    fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
      .then(response => response.json())
      .then(data => {
        const depreciation = calculateDepreciation(data.listings || [], inputs.model, inputs.fuelType);
        
        if (depreciation.length === 0) {
          console.log('No depreciation data available for this model/fuel type combination');
          return;
        }

        // Calculate predictions for next 10 years
        const predictions = [];
        let currentPrice = parseFloat(inputs.price);
        let currentMileage = parseFloat(inputs.mileage) || 0;

        for (let year = 0; year <= 10; year++) {
          predictions.push({
            year: year,
            price: currentPrice,
            mileage: currentMileage
          });

          // Update for next year
          const yearlyDepreciation = depreciation.find(d => d.age === (parseFloat(inputs.age) || 0) + year + 1);
          if (yearlyDepreciation && yearlyDepreciation.price > 0) {
            const prevYear = depreciation.find(d => d.age === (parseFloat(inputs.age) || 0) + year);
            if (prevYear && prevYear.price > 0) {
              const depreciationRate = 1 - (yearlyDepreciation.price / prevYear.price);
              currentPrice = currentPrice * (1 - depreciationRate);
            } else {
              currentPrice = currentPrice * 0.85; // fallback
            }
          } else {
            currentPrice = currentPrice * 0.85; // 15% depreciation as fallback
          }

          currentMileage += parseFloat(inputs.expectedMileagePerYear) || 15000;
        }

        setChartData({
          labels: predictions.map(p => `År ${p.year}`),
          datasets: [{
            label: 'Estimert verdi',
            data: predictions.map(p => Math.max(0, Math.round(p.price))), // Ensure no negative values
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
          }]
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [calculateDepreciation]);

  const options = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return [
              `Verdi: ${Math.round(value).toLocaleString()} kr`,
              `Kilometerstand: ${(parseInt(inputData.mileage) + context.dataIndex * parseInt(inputData.expectedMileagePerYear)).toLocaleString()} km`
            ];
          }
        }
      },
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Verdiestimat over tid'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Verdi (NOK)'
        }
      }
    }
  };

  return (
    <div>
      <FilterPanel />
      <Box sx={{ width: '100%', mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Modell
            </Typography>
            <Select
              fullWidth
              value={inputData.model}
              onChange={handleInputChange('model')}
              size="small"
            >
              {models.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Drivstoff
            </Typography>
            <Select
              fullWidth
              value={inputData.fuelType}
              onChange={handleInputChange('fuelType')}
              size="small"
            >
              {fuelTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Alder (år)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={inputData.age}
              onChange={handleInputChange('age')}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Kilometerstand
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={inputData.mileage}
              onChange={handleInputChange('mileage')}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Pris (NOK)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={inputData.price}
              onChange={handleInputChange('price')}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" gutterBottom>
              Forventet årlig kjørelengde
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={inputData.expectedMileagePerYear}
              onChange={handleInputChange('expectedMileagePerYear')}
              size="small"
            />
          </Grid>
        </Grid>
      </Box>
      {chartData && <Line options={options} data={chartData} />}
    </div>
  );
}

export default ResaleCalculator; 