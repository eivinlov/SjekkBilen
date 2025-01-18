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
import { useFilters } from '../contexts/FilterContext';
import { FilterPanel } from './FilterPanel';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

function PriceChart() {
  const [chartData, setChartData] = useState(null);
  const [listings, setListings] = useState(null);
  const { 
    primaryFilters, 
    comparisonFilters, 
    setFilterOptions,
    kilometerRange,
    priceRange
  } = useFilters();

  const calculateTrendLine = useCallback((points) => {
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
  }, []);

  const updateChart = useCallback((filteredListings) => {
    if (!filteredListings) return;
    
    // Move comparisonColors inside the callback
    const comparisonColors = [
      { base: 'rgba(255, 99, 132, 0.5)', sold: 'rgba(255, 99, 132, 0.7)', trend: 'rgba(255, 99, 132, 1)' },
      { base: 'rgba(54, 162, 235, 0.5)', sold: 'rgba(54, 162, 235, 0.7)', trend: 'rgba(54, 162, 235, 1)' },
      { base: 'rgba(153, 102, 255, 0.5)', sold: 'rgba(153, 102, 255, 0.7)', trend: 'rgba(153, 102, 255, 1)' },
    ];

    // Helper function to check metadata fields that might be missing
    const checkMetadataField = (filterValue, metadataField, car) => {
        if (filterValue === 'all') return true;
        if (!car.metadata || !car.metadata[metadataField]) {
            return filterValue === 'UKJENT';
        }
        return car.metadata[metadataField] === filterValue;
    };
    
    // Get all valid listings first (before any filtering)
    const allValidListings = listings.filter(car => 
        car && car.data && 
        car.data['Kilometerstand'] && 
        car.data['Pris eksl. omreg.'] && 
        car.data['Modellår'] && 
        car.data['Merke'] && 
        car.data['Modell']
    );
    
    // Filter listings for primary model
    const primaryListings = allValidListings.filter(car => {
        const basicFilters = (primaryFilters.model === 'all' || car.data['Modell'] === primaryFilters.model) &&
                           (primaryFilters.modelYear === 'all' || car.data['Modellår'] === primaryFilters.modelYear) &&
                           (primaryFilters.fuelType === 'all' || car.data['Drivstoff'] === primaryFilters.fuelType) &&
                           (primaryFilters.drivetrain === 'all' || car.data['Hjuldrift'] === primaryFilters.drivetrain) &&
                           (primaryFilters.transmission === 'all' || car.data['Girkasse'] === primaryFilters.transmission) &&
                           (!primaryFilters.showOnlySold || car.status === 'SOLGT');

        const enrichedFilters = checkMetadataField(primaryFilters.serviceHistory, 'service_historie', car) &&
                              checkMetadataField(primaryFilters.condition, 'Bilens_tilstand', car) &&
                              checkMetadataField(primaryFilters.sellerType, 'Selger', car);

        const kilometerFilter = parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) >= kilometerRange[0] && 
                                parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) <= kilometerRange[1];
        const priceFilter = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) >= priceRange[0] && 
                            parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) <= priceRange[1];

        return basicFilters && enrichedFilters && kilometerFilter && priceFilter;
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
    const primaryTrendLine = calculateTrendLine(primaryPoints);

    const datasets = [
      {
            label: primaryFilters.model === 'all' ? 'Alle modeller' : primaryFilters.model,
        data: primaryPoints,
            backgroundColor: primaryPoints.map(point => 
                point.status === 'SOLGT' ? 'rgba(75, 192, 192, 0.7)' : 'rgba(75, 192, 192, 0.5)'
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
        if (!comparison) return;

        // Filter from all valid listings for comparison
        const comparisonListings = allValidListings.filter(car => {
            if (car.data['Modell'] !== comparison.model) return false;

            const basicFilters = (comparison.modelYear === 'all' || car.data['Modellår'] === comparison.modelYear) &&
                               (comparison.fuelType === 'all' || car.data['Drivstoff'] === comparison.fuelType) &&
                               (comparison.drivetrain === 'all' || car.data['Hjuldrift'] === comparison.drivetrain) &&
                               (comparison.transmission === 'all' || car.data['Girkasse'] === comparison.transmission) &&
                               (!comparison.showOnlySold || car.status === 'SOLGT');

            const enrichedFilters = checkMetadataField(comparison.serviceHistory, 'service_historie', car) &&
                                  checkMetadataField(comparison.condition, 'Bilens_tilstand', car) &&
                                  checkMetadataField(comparison.sellerType, 'Selger', car);

            const kilometerFilter = parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) >= kilometerRange[0] && 
                                    parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) <= kilometerRange[1];
            const priceFilter = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) >= priceRange[0] && 
                                parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) <= priceRange[1];

            return basicFilters && enrichedFilters && kilometerFilter && priceFilter;
        });

        console.log('Comparison filter:', comparison);
        console.log('Filtered comparison listings:', comparisonListings.length);
        console.log('Sample listing:', comparisonListings[0]);

        const comparisonPoints = createDataPoints(comparisonListings);
        const comparisonTrendLine = calculateTrendLine(comparisonPoints);
        const colors = comparisonColors[index % comparisonColors.length];

        if (comparisonPoints.length > 0) {
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
    }
    });

    setChartData({ datasets });

    // Calculate min and max values for x and y axes based on filtered data and range sliders
    const allPoints = [
        ...primaryPoints,
        ...comparisonFilters.flatMap((comparison, index) => {
            // Filter comparison listings using the same logic as above
            const comparisonListings = allValidListings.filter(car => {
                if (car.data['Modell'] !== comparison.model) return false;

                const basicFilters = (comparison.modelYear === 'all' || car.data['Modellår'] === comparison.modelYear) &&
                                   (comparison.fuelType === 'all' || car.data['Drivstoff'] === comparison.fuelType) &&
                                   (comparison.drivetrain === 'all' || car.data['Hjuldrift'] === comparison.drivetrain) &&
                                   (comparison.transmission === 'all' || car.data['Girkasse'] === comparison.transmission) &&
                                   (!comparison.showOnlySold || car.status === 'SOLGT');

                const enrichedFilters = checkMetadataField(comparison.serviceHistory, 'service_historie', car) &&
                                      checkMetadataField(comparison.condition, 'Bilens_tilstand', car) &&
                                      checkMetadataField(comparison.sellerType, 'Selger', car);

                const kilometerFilter = parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) >= kilometerRange[0] && 
                                      parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) <= kilometerRange[1];
                const priceFilter = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) >= priceRange[0] && 
                                  parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) <= priceRange[1];

                return basicFilters && enrichedFilters && kilometerFilter && priceFilter;
            });
            return createDataPoints(comparisonListings);
        })
    ];

    const xValues = allPoints.map(point => point.x).filter(Boolean);
    const yValues = allPoints.map(point => point.y).filter(Boolean);

    const minX = Math.min(kilometerRange[0], ...(xValues.length > 0 ? xValues : [kilometerRange[0]]));
    const maxX = Math.max(kilometerRange[1], ...(xValues.length > 0 ? xValues : [kilometerRange[1]]));
    const minY = Math.min(priceRange[0], ...(yValues.length > 0 ? yValues : [priceRange[0]]));
    const maxY = Math.max(priceRange[1], ...(yValues.length > 0 ? yValues : [priceRange[1]]));

    setOptions(prev => ({
        ...prev,
        scales: {
            ...prev.scales,
            x: {
                ...prev.scales.x,
                min: minX,
                max: maxX,
                ticks: {
                    stepSize: (maxX - minX) / 10,
                    callback: (value, index, values) => value.toLocaleString()
                }
            },
            y: {
                ...prev.scales.y,
                min: minY,
                max: maxY,
                ticks: {
                    stepSize: (maxY - minY) / 10,
                    callback: (value, index, values) => value.toLocaleString()
                }
            }
        }
    }));
  }, [calculateTrendLine, primaryFilters, comparisonFilters, listings, kilometerRange, priceRange]);

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
        const transmissions = [...new Set(validListings.map(car => car.data['Girkasse']).filter(Boolean))];

        setFilterOptions({
          models: models.sort(),
          modelYears: modelYears.sort(),
          fuelTypes: fuelTypes.sort(),
          drivetrains: drivetrains.sort(),
          transmissions: transmissions.sort()
        });
      })
      .catch(error => {
        console.error('Error loading data:', error);
      });
  }, [setFilterOptions]);

  useEffect(() => {
    if (listings) {
        const filteredListings = listings.filter(car => {
            // Helper function to check metadata fields that might be missing
            const checkMetadataField = (filterValue, metadataField) => {
                if (filterValue === 'all') return true;
                if (!car.metadata || !car.metadata[metadataField]) {
                    return filterValue === 'UKJENT';
                }
                return car.metadata[metadataField] === filterValue;
            };

            // Basic filters
            const basicFilters = (primaryFilters.model === 'all' || car.data['Modell'] === primaryFilters.model) &&
                               (primaryFilters.modelYear === 'all' || car.data['Modellår'] === primaryFilters.modelYear) &&
                               (primaryFilters.transmission === 'all' || car.data['Girkasse'] === primaryFilters.transmission) &&
                               (primaryFilters.fuelType === 'all' || car.data['Drivstoff'] === primaryFilters.fuelType) &&
                               (primaryFilters.drivetrain === 'all' || car.data['Hjuldrift'] === primaryFilters.drivetrain) &&
                               (primaryFilters.transmission === 'all' || car.data['Girkasse'] === primaryFilters.transmission) &&
                               (!primaryFilters.showOnlySold || car.status === 'SOLGT');

            // Enriched data filters with null/missing field handling
            const enrichedFilters = checkMetadataField(primaryFilters.serviceHistory, 'service_historie') &&
                                  checkMetadataField(primaryFilters.condition, 'Bilens_tilstand') &&
                                  checkMetadataField(primaryFilters.sellerType, 'Selger');

            return basicFilters && enrichedFilters;
        });

        updateChart(filteredListings);
    }
  }, [listings, primaryFilters, comparisonFilters, updateChart]);

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
              point.status === 'SOLGT' ? 'Status: SOLGT' : 'Status: Til salgs'
            ];
          }
        }
      },
      legend: {
        position: 'top',
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Kilometer'
        },
        ticks: {
          callback: (value) => value.toLocaleString()
        }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Pris (kr)'
        },
        ticks: {
          callback: (value) => value.toLocaleString()
        }
      }
    }
  };

  const [chartOptions, setOptions] = useState(options);

  if (!chartData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <FilterPanel />
      <Scatter options={chartOptions} data={chartData} />
    </div>
  );
}

export default PriceChart;