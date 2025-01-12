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
import Grid2 from '@mui/material/Grid2';
import { Select, MenuItem, Typography, Box, Checkbox, FormControlLabel, Button } from '@mui/material';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

function PriceChart() {
  const [chartData, setChartData] = useState(null);
  const [listings, setListings] = useState(null);
  const [primaryFilters, setFilters] = useState({
    model: 'all',
    modelYear: 'all',
    fuelType: 'all',
    drivetrain: 'all',
    showOnlySold: false
  });
  const [comparisonFilters, setComparisonFilters] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    models: [],
    modelYears: [],
    fuelTypes: [],
    drivetrains: []
  });

  const MAX_COMPARISONS = 3;

  const comparisonColors = [
    { base: 'rgba(255, 99, 132, 0.5)', sold: 'rgba(255, 99, 132, 0.7)', trend: 'rgba(255, 99, 132, 1)' },
    { base: 'rgba(54, 162, 235, 0.5)', sold: 'rgba(54, 162, 235, 0.7)', trend: 'rgba(54, 162, 235, 1)' },
    { base: 'rgba(153, 102, 255, 0.5)', sold: 'rgba(153, 102, 255, 0.7)', trend: 'rgba(153, 102, 255, 1)' },
  ];

  const addComparison = () => {
    if (comparisonFilters.length < MAX_COMPARISONS) {
      setComparisonFilters(prev => [...prev, {
        model: filterOptions.models[0],
        modelYear: 'all',
        fuelType: 'all',
        drivetrain: 'all',
        showOnlySold: false
      }]);
    }
  };

  const removeComparison = (index) => {
    setComparisonFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handleComparisonFilterChange = (index, filterName) => (event) => {
    setComparisonFilters(prev => prev.map((filter, i) => 
      i === index 
        ? { ...filter, [filterName]: event.target.value }
        : filter
    ));
  };

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/finn_listings_with_metrics.json`)
      .then(response => response.json())
      .then(rawData => {
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
      })
      .catch(error => {
        console.error('Error loading data:', error);
      });
  }, []);

  useEffect(() => {
    if (listings) {
      updateChart(listings, primaryFilters, comparisonFilters);
    }
  }, [listings, primaryFilters.model, primaryFilters.modelYear, primaryFilters.fuelType, primaryFilters.drivetrain, primaryFilters.showOnlySold, comparisonFilters]);

  const calculateTrendLine = (points) => {
    if (points.length < 2) return [];

    // Sort points by x (kilometers)
    points.sort((a, b) => a.x - b.x);
    
    // Prepare data for polynomial regression
    const X = points.map(p => p.x);
    const y = points.map(p => p.y);

    try {
      const n = X.length;
      const sum_x = X.reduce((a, b) => a + b, 0);
      const sum_y = y.reduce((a, b) => a + b, 0);
      const sum_xx = X.reduce((a, b) => a + b * b, 0);
      const sum_xxx = X.reduce((a, b) => a + b * b * b, 0);
      const sum_xxxx = X.reduce((a, b) => a + b * b * b * b, 0);
      const sum_xy = X.reduce((a, b, i) => a + b * y[i], 0);
      const sum_xxy = X.reduce((a, b, i) => a + b * b * y[i], 0);

      // Solve system of equations for quadratic regression (y = ax² + bx + c)
      const matrix_a = [
        [sum_xxxx, sum_xxx, sum_xx],
        [sum_xxx, sum_xx, sum_x],
        [sum_xx, sum_x, n]
      ];
      const matrix_b = [sum_xxy, sum_xy, sum_y];

      // Solve using Cramer's rule
      const det = (m) => 
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

      const det_main = det(matrix_a);

      // Replace each column with matrix_b and calculate determinant
      const det_a = det([
        [matrix_b[0], matrix_a[0][1], matrix_a[0][2]],
        [matrix_b[1], matrix_a[1][1], matrix_a[1][2]],
        [matrix_b[2], matrix_a[2][1], matrix_a[2][2]]
      ]);

      const det_b = det([
        [matrix_a[0][0], matrix_b[0], matrix_a[0][2]],
        [matrix_a[1][0], matrix_b[1], matrix_a[1][2]],
        [matrix_a[2][0], matrix_b[2], matrix_a[2][2]]
      ]);

      const det_c = det([
        [matrix_a[0][0], matrix_a[0][1], matrix_b[0]],
        [matrix_a[1][0], matrix_a[1][1], matrix_b[1]],
        [matrix_a[2][0], matrix_a[2][1], matrix_b[2]]
      ]);

      const a = det_a / det_main;
      const b = det_b / det_main;
      const c = det_c / det_main;

      // Generate points for the trend line
      const trendPoints = [];
      const minX = Math.min(...X);
      const maxX = Math.max(...X);
      const step = (maxX - minX) / 100;

      for (let x = minX; x <= maxX; x += step) {
        trendPoints.push({
          x: x,
          y: a * x * x + b * x + c
        });
      }

      return trendPoints;
    } catch (error) {
      console.error('Error calculating trend line:', error);
      return [];
    }
  };

  const updateChart = (listings, primaryFilters, comparisonFilters) => {
    // Filter listings for primary model
    const primaryListings = listings.filter(car => {
      const baseConditions = 
        (primaryFilters.modelYear === 'all' || car.data['Modellår'] === primaryFilters.modelYear) &&
        (primaryFilters.fuelType === 'all' || car.data['Drivstoff'] === primaryFilters.fuelType) &&
        (primaryFilters.drivetrain === 'all' || car.data['Hjuldrift'] === primaryFilters.drivetrain) &&
        (!primaryFilters.showOnlySold || car.status === 'SOLGT');

      return baseConditions && (
        primaryFilters.model === 'all' || car.data['Modell'] === primaryFilters.model
      );
    });

    const createDataPoints = (carList) => carList.map(car => ({
      x: parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')),
      y: parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')),
      url: car.url,
      title: `${car.data['Modellår']} ${car.data['Merke']} ${car.data['Modell']}`,
      fuelType: car.data['Drivstoff'],
      drivetrain: car.data['Hjuldrift'],
      status: car.status
    }));

    const primaryPoints = createDataPoints(primaryListings);

    // Calculate trend lines
    const primaryTrendLine = calculateTrendLine(primaryPoints);

    const datasets = [
      {
        label: primaryFilters.model === 'all' ? 'Alle modeller' : primaryFilters.model,
        data: primaryPoints,
        backgroundColor: primaryPoints.map(point => 
          point.status === 'SOLGT' ? 
            'rgba(75, 192, 192, 0.7)' : 
            'rgba(75, 192, 192, 0.5)'
        ),
        pointRadius: 5,
        showLine: false
      },
      {
        label: `${primaryFilters.model === 'all' ? 'Alle modeller' : primaryFilters.model} (trendlinje)`,
        data: primaryTrendLine,
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderColor: 'rgba(75, 192, 192, 1)',
        pointRadius: 0,
        showLine: true,
        fill: false,
        borderWidth: 2,
        borderDash: [5, 5]
      }
    ];

    // Add datasets for each comparison
    comparisonFilters.forEach((comparison, index) => {
      const comparisonListings = listings.filter(car => {
        const baseConditions = 
          (comparison.modelYear === 'all' || car.data['Modellår'] === comparison.modelYear) &&
          (comparison.fuelType === 'all' || car.data['Drivstoff'] === comparison.fuelType) &&
          (comparison.drivetrain === 'all' || car.data['Hjuldrift'] === comparison.drivetrain) &&
          (!comparison.showOnlySold || car.status === 'SOLGT');

        return baseConditions && car.data['Modell'] === comparison.model;
      });

      const comparisonPoints = createDataPoints(comparisonListings);
      const comparisonTrendLine = calculateTrendLine(comparisonPoints);
      const colors = comparisonColors[index % comparisonColors.length];

      datasets.push({
        label: comparison.model,
        data: comparisonPoints,
        backgroundColor: comparisonPoints.map(point => 
          point.status === 'SOLGT' ? colors.sold : colors.base
        ),
        pointRadius: 5,
        showLine: false
      });

      if (comparisonTrendLine.length > 0) {
        datasets.push({
          label: `${comparison.model} (trendlinje)`,
          data: comparisonTrendLine,
          backgroundColor: colors.base.replace('0.5', '0.1'),
          borderColor: colors.trend,
          pointRadius: 0,
          showLine: true,
          fill: false,
          borderWidth: 2,
          borderDash: [5, 5]
        });
      }
    });

    setChartData({ datasets });
  };

  const handlePrimaryFilterChange = (filterName) => (event) => {
    const newFilters = {
      ...primaryFilters,
      [filterName]: event.target.value
    };
    setFilters(newFilters);
  };

  const handleCheckboxChange = (event) => {
    setFilters(prev => ({
      ...prev,
      showOnlySold: event.target.checked
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
              `Kilometer: ${point.x.toLocaleString()}`,
              `Drivstoff: ${point.fuelType}`,
              `Hjuldrift: ${point.drivetrain}`,
              `Status: ${point.status === 'SOLGT' ? 'Solgt' : 'Aktiv'}`,
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

  return (
    <div>
      <Box sx={{ mb: 3 }}>
        <Grid2 container spacing={2}>
          <Grid2 xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={primaryFilters.showOnlySold}
                  onChange={handleCheckboxChange}
                  color="primary"
                />
              }
              label="Vis kun solgte biler"
            />
          </Grid2>

          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Modell
            </Typography>
            <Select
              fullWidth
              value={primaryFilters.model}
              onChange={handlePrimaryFilterChange('model')}
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
              Årsmodell
            </Typography>
            <Select
              fullWidth
              value={primaryFilters.modelYear}
              onChange={handlePrimaryFilterChange('modelYear')}
              size="small"
            >
              <MenuItem value="all">Alle år</MenuItem>
              {filterOptions.modelYears.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </Grid2>

          <Grid2 xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>
              Drivstoff
            </Typography>
            <Select
              fullWidth
              value={primaryFilters.fuelType}
              onChange={handlePrimaryFilterChange('fuelType')}
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
              value={primaryFilters.drivetrain}
              onChange={handlePrimaryFilterChange('drivetrain')}
              size="small"
            >
              <MenuItem value="all">Alle typer</MenuItem>
              {filterOptions.drivetrains.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </Grid2>

          {comparisonFilters.map((comparison, index) => (
            <Grid2 container spacing={2} key={index}>
              <Grid2 xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Sammenligning {index + 1}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => removeComparison(index)}
                  >
                    Fjern sammenligning
                  </Button>
                </Box>
              </Grid2>
              
              <Grid2 xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Modell
                </Typography>
                <Select
                  fullWidth
                  value={comparison.model}
                  onChange={handleComparisonFilterChange(index, 'model')}
                  size="small"
                >
                  {filterOptions.models.map(model => (
                    <MenuItem key={model} value={model}>{model}</MenuItem>
                  ))}
                </Select>
              </Grid2>

              <Grid2 xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Årsmodell
                </Typography>
                <Select
                  fullWidth
                  value={comparison.modelYear}
                  onChange={handleComparisonFilterChange(index, 'modelYear')}
                  size="small"
                >
                  <MenuItem value="all">Alle år</MenuItem>
                  {filterOptions.modelYears.map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </Grid2>

              <Grid2 xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Drivstoff
                </Typography>
                <Select
                  fullWidth
                  value={comparison.fuelType}
                  onChange={handleComparisonFilterChange(index, 'fuelType')}
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
                  value={comparison.drivetrain}
                  onChange={handleComparisonFilterChange(index, 'drivetrain')}
                  size="small"
                >
                  <MenuItem value="all">Alle typer</MenuItem>
                  {filterOptions.drivetrains.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </Grid2>
            </Grid2>
          ))}

          {comparisonFilters.length < MAX_COMPARISONS && (
            <Grid2 xs={12}>
              <Button 
                variant="outlined" 
                onClick={addComparison}
                sx={{ mt: 2 }}
              >
                Legg til sammenligning
              </Button>
            </Grid2>
          )}
        </Grid2>
      </Box>

      <Scatter options={options} data={chartData} />
    </div>
  );
}

export default PriceChart; 