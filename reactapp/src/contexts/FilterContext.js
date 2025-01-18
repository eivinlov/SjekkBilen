import React, { createContext, useContext, useState, useEffect } from 'react';

const FilterContext = createContext();

// Define default values as constants
const DEFAULT_SERVICE_HISTORIES = ['BRA', 'MIDDELS', 'DÅRLIG', 'UKJENT'];
const DEFAULT_CONDITIONS = ['INGENTING Å BEMERKE', 'NOE Å BEMERKE', 'MYE Å BEMERKE'];
const DEFAULT_SELLER_TYPES = ['PRIVAT', 'BILFORHANDLER'];

export function FilterProvider({ children }) {
    const [primaryFilters, setPrimaryFilters] = useState({
        model: 'all',
        modelYear: 'all',
        fuelType: 'all',
        drivetrain: 'all',
        showOnlySold: false,
        serviceHistory: 'all',
        condition: 'all',
        sellerType: 'all',
        transmission: 'all'
    });

    const [comparisonFilters, setComparisonFilters] = useState([]);
    
    // Initialize with default values for the enriched data filters
    const [filterOptions, setFilterOptions] = useState({
        models: [],
        modelYears: [],
        fuelTypes: [],
        drivetrains: [],
        // Initialize with default values
        serviceHistories: DEFAULT_SERVICE_HISTORIES,
        conditions: DEFAULT_CONDITIONS,
        sellerTypes: DEFAULT_SELLER_TYPES,
        transmissions: []
    });

    const MAX_COMPARISONS = 3;

    const [kilometerRange, setKilometerRange] = useState([0, 1000000]);
    const [priceRange, setPriceRange] = useState([0, 10000000]);

    // Shared filter handling functions
    const handlePrimaryFilterChange = (filterName, value) => {
        setPrimaryFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const addComparison = () => {
        if (comparisonFilters.length < MAX_COMPARISONS && filterOptions.models.length > 0) {
            setComparisonFilters(prev => [...prev, {
                model: filterOptions.models[0] || '',
                modelYear: 'all',
                fuelType: 'all',
                drivetrain: 'all',
                showOnlySold: false,
                serviceHistory: 'all',
                condition: 'all',
                sellerType: 'all'
            }]);
        }
    };

    const removeComparison = (index) => {
        setComparisonFilters(prev => prev.filter((_, i) => i !== index));
    };

    const handleComparisonFilterChange = (index, filterName, value) => {
        setComparisonFilters(prev => prev.map((filter, i) => 
            i === index 
                ? { ...filter, [filterName]: value }
                : filter
        ));
    };

    const handleKilometerRangeChange = (event, newValue) => {
        setKilometerRange(newValue);
    };

    const handlePriceRangeChange = (event, newValue) => {
        setPriceRange(newValue);
    };

    // Update the setFilterOptions usage in PriceChart's useEffect
    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/finn_listings_with_metrics.json`)
            .then(response => response.json())
            .then(rawData => {
                const listings = rawData.listings || [];
                
                // Extract unique values for all filters
                const models = [...new Set(listings.map(car => car.data['Modell']).filter(Boolean))];
                const modelYears = [...new Set(listings.map(car => car.data['Modellår']).filter(Boolean))];
                const fuelTypes = [...new Set(listings.map(car => car.data['Drivstoff']).filter(Boolean))];
                const drivetrains = [...new Set(listings.map(car => car.data['Hjuldrift']).filter(Boolean))];
                const serviceHistories = [...new Set(listings.map(car => car.metadata?.service_historie).filter(Boolean))];
                const conditions = [...new Set(listings.map(car => car.metadata?.Bilens_tilstand).filter(Boolean))];
                const sellerTypes = [...new Set(listings.map(car => car.metadata?.Selger).filter(Boolean))];
                const transmissions = [...new Set(listings.map(car => car.data['Girkasse']).filter(Boolean))];

                setFilterOptions(prev => {
                    // Calculate min and max values for kilometers and price with error handling
                    const kilometers = listings
                        .map(car => car.data && car.data['Kilometerstand'] ? parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) : null)
                        .filter(Boolean);
                    const prices = listings
                        .map(car => car.data && car.data['Pris eksl. omreg.'] ? parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) : null)
                        .filter(Boolean);

                    const minKilometer = kilometers.length > 0 ? Math.min(...kilometers) : 0;
                    const maxKilometer = kilometers.length > 0 ? Math.max(...kilometers) : 1000000;
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : 10000000;

                    setKilometerRange([minKilometer, maxKilometer]);
                    setPriceRange([minPrice, maxPrice]);

                    return {
                        ...prev,
                        models: models.sort(),
                        modelYears: modelYears.sort(),
                        fuelTypes: fuelTypes.sort(),
                        drivetrains: drivetrains.sort(),
                        serviceHistories: serviceHistories.length > 0 ? serviceHistories.sort() : prev.serviceHistories,
                        conditions: conditions.length > 0 ? conditions.sort() : prev.conditions,
                        sellerTypes: sellerTypes.length > 0 ? sellerTypes.sort() : prev.sellerTypes,
                        transmissions: transmissions.length > 0 ? transmissions.sort() : prev.transmissions
                    };
                });
            })
            .catch(error => {
                console.error('Error loading filter options:', error);
                // Keep the default values in case of error
            });
    }, []);

    return (
        <FilterContext.Provider value={{
            primaryFilters,
            comparisonFilters,
            filterOptions,
            handlePrimaryFilterChange,
            handleComparisonFilterChange,
            addComparison,
            removeComparison,
            setFilterOptions,
            MAX_COMPARISONS,
            kilometerRange,
            priceRange,
            handleKilometerRangeChange,
            handlePriceRangeChange,
        }}>
            {children}
        </FilterContext.Provider>
    );
}

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
}; 
