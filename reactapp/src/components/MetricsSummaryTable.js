import React from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper,
    Typography
} from '@mui/material';
import { useFilters } from '../contexts/FilterContext';

const calculateMetrics = (listings, filter) => {
    const filteredListings = listings.filter(car => {
        return (filter.model === 'all' || car.data['Modell'] === filter.model) &&
               (filter.modelYear === 'all' || car.data['Modellår'] === filter.modelYear) &&
               (filter.fuelType === 'all' || car.data['Drivstoff'] === filter.fuelType) &&
               (filter.drivetrain === 'all' || car.data['Hjuldrift'] === filter.drivetrain);
    });

    if (filteredListings.length === 0) return null;

    // Calculate average price
    const prices = filteredListings.map(car => 
        parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''))
    ).filter(price => !isNaN(price));
    
    const averagePrice = prices.length > 0 
        ? prices.reduce((a, b) => a + b, 0) / prices.length 
        : 0;

    // Calculate price per 1000km
    const pricePerKm = filteredListings.map(car => {
        const price = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''));
        const km = parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, ''));
        const year = parseInt(car.data['Modellår']);
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        
        // Calculate average kilometers per year
        const kmPerYear = km / age;
        
        // Calculate depreciation per year (assuming linear depreciation)
        const yearlyDepreciation = price / age;
        
        // Calculate cost per 1000km
        return (yearlyDepreciation / (kmPerYear / 1000));
    }).filter(ratio => !isNaN(ratio) && isFinite(ratio));

    const averagePricePerKm = pricePerKm.length > 0
        ? pricePerKm.reduce((a, b) => a + b, 0) / pricePerKm.length
        : 0;

    // Calculate yearly depreciation
    const yearlyDepreciation = filteredListings.map(car => {
        const currentPrice = parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, ''));
        const year = parseInt(car.data['Modellår']);
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        
        if (age <= 0) return null;

        // Estimate initial price (assuming 15% depreciation per year)
        const estimatedInitialPrice = currentPrice * Math.pow(1.15, age);
        
        // Calculate total depreciation
        const totalDepreciation = estimatedInitialPrice - currentPrice;
        
        // Calculate average yearly depreciation
        return totalDepreciation / age;
    }).filter(dep => dep !== null && isFinite(dep));

    const averageYearlyDepreciation = yearlyDepreciation.length > 0
        ? yearlyDepreciation.reduce((a, b) => a + b, 0) / yearlyDepreciation.length
        : 0;

    // Calculate average time on market (for sold listings)
    const timeOnMarket = filteredListings
        .filter(car => car.status === 'SOLGT' && car.sold_date)
        .map(car => {
            const soldDate = new Date(car.sold_date);
            const listedDate = new Date(car.last_checked); // This might need adjustment based on your data
            return Math.floor((soldDate - listedDate) / (1000 * 60 * 60 * 24)); // Days
        }).filter(days => days >= 0);

    const averageTimeOnMarket = timeOnMarket.length > 0
        ? timeOnMarket.reduce((a, b) => a + b, 0) / timeOnMarket.length
        : null;

    return {
        averagePrice,
        averagePricePerKm,
        averageYearlyDepreciation,
        averageTimeOnMarket,
        sampleSize: filteredListings.length
    };
};

const MetricsSummaryTable = ({ listings }) => {
    const { primaryFilters, comparisonFilters } = useFilters();

    // Calculate metrics for primary filter
    const primaryMetrics = calculateMetrics(listings, primaryFilters);

    // Calculate metrics for comparison filters
    const comparisonMetrics = comparisonFilters.map(filter => 
        calculateMetrics(listings, filter)
    );

    const formatNumber = (num) => {
        if (num === null || isNaN(num)) return '-';
        return num.toLocaleString('no-NO', { 
            maximumFractionDigits: 0 
        });
    };

    const formatDays = (days) => {
        if (days === null || isNaN(days)) return '-';
        return `${Math.round(days)} dager`;
    };

    const getColorForValue = (value, values, metric) => {
        if (values.length <= 1 || value === null || isNaN(value)) return {};
        
        const validValues = values.filter(v => v !== null && !isNaN(v));
        const max = Math.max(...validValues);
        const min = Math.min(...validValues);
        
        // For these metrics, lower is better
        const lowerIsBetter = ['averagePricePerKm', 'averageYearlyDepreciation', 'averageTimeOnMarket'];
        
        if (lowerIsBetter.includes(metric)) {
            if (value === min) return { color: 'green' };
            if (value === max) return { color: 'red' };
        } else {
            // For other metrics (like averagePrice), higher is better
            if (value === max) return { color: 'green' };
            if (value === min) return { color: 'red' };
        }
        return {};
    };

    const renderMetricRow = (label, metric, format = formatNumber, suffix = 'kr') => {
        const values = [
            primaryMetrics?.[metric],
            ...comparisonMetrics.map(m => m?.[metric])
        ].filter(v => v !== null && !isNaN(v));

        return (
            <TableRow>
                <TableCell>{label}</TableCell>
                <TableCell sx={getColorForValue(primaryMetrics?.[metric], values, metric)}>
                    {format(primaryMetrics?.[metric])} {suffix}
                </TableCell>
                {comparisonMetrics.map((metrics, index) => (
                    <TableCell 
                        key={index}
                        sx={getColorForValue(metrics?.[metric], values, metric)}
                    >
                        {format(metrics?.[metric])} {suffix}
                    </TableCell>
                ))}
            </TableRow>
        );
    };

    return (
        <TableContainer component={Paper} sx={{ mt: 4 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Metrikk</TableCell>
                        <TableCell>Hovedfilter</TableCell>
                        {comparisonFilters.map((_, index) => (
                            <TableCell key={index}>Sammenligning {index + 1}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {renderMetricRow('Antall annonser', 'sampleSize', formatNumber, '')}
                    {renderMetricRow('Gjennomsnittspris', 'averagePrice')}
                    {renderMetricRow('Pris per 1000 km', 'averagePricePerKm')}
                    {renderMetricRow('Årlig verditap', 'averageYearlyDepreciation')}
                    {renderMetricRow('Gjennomsnittlig tid på markedet', 'averageTimeOnMarket', formatDays, '')}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MetricsSummaryTable; 