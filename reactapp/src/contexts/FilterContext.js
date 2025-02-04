import React, { createContext, useContext, useState, useEffect } from 'react';

export const FilterContext = createContext();

// Define default values as constants
const DEFAULT_SERVICE_HISTORIES = ['BRA', 'MIDDELS', 'DÅRLIG', 'UKJENT'];
const DEFAULT_CONDITIONS = ['INGENTING Å BEMERKE', 'NOE Å BEMERKE', 'MYE Å BEMERKE'];
const DEFAULT_SELLER_TYPES = ['PRIVAT', 'BILFORHANDLER'];

export const FilterProvider = ({ children }) => {
    const [primaryFilters, setPrimaryFilters] = useState({
        model: 'all',
        modelYear: 'all',
        fuelType: 'all',
        drivetrain: 'all',
        showOnlySold: false,
        serviceHistory: 'all',
        condition: 'all',
        sellerType: 'all',
        transmission: 'all',
        batteryCapacity: 'all'
    });

    const [comparisonFilters, setComparisonFilters] = useState([]);
    
    const [filterOptions, setFilterOptions] = useState({
        models: [],
        modelYears: [],
        fuelTypes: [],
        drivetrains: [],
        serviceHistories: DEFAULT_SERVICE_HISTORIES,
        conditions: DEFAULT_CONDITIONS,
        sellerTypes: DEFAULT_SELLER_TYPES,
        transmissions: [],
        batteryCapacities: [],
        kilometerRange: {
            min: 0,
            max: 1000000,
            label: 'Kilometerstand'
        },
        priceRange: {
            min: 0,
            max: 10000000,
            label: 'Pris (NOK)'
        }
    });

    const MAX_COMPARISONS = 3;

    const [kilometerRange, setKilometerRange] = useState([0, 1000000]);
    const [priceRange, setPriceRange] = useState([0, 10000000]);
    const [currentRanges, setCurrentRanges] = useState({
        kilometer: { min: 0, max: 1000000 },
        price: { min: 0, max: 10000000 }
    });

    // Function to calculate ranges from filtered data
    const calculateRangesFromData = (listings) => {
        const kilometers = listings
            .map(car => car.data && car.data['Kilometerstand'] ? 
                parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) : null)
            .filter(Boolean);
        const prices = listings
            .map(car => car.data && car.data['Pris eksl. omreg.'] ? 
                parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) : null)
            .filter(Boolean);

        const minKilometer = kilometers.length > 0 ? Math.min(...kilometers) : 0;
        const maxKilometer = kilometers.length > 0 ? Math.max(...kilometers) : 1000000;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 10000000;

        setCurrentRanges({
            kilometer: { min: minKilometer, max: maxKilometer },
            price: { min: minPrice, max: maxPrice }
        });

        // Reset the slider values to the new min/max
        setKilometerRange([minKilometer, maxKilometer]);
        setPriceRange([minPrice, maxPrice]);

        return {
            kilometerRange: {
                min: minKilometer,
                max: maxKilometer,
                label: 'Kilometerstand'
            },
            priceRange: {
                min: minPrice,
                max: maxPrice,
                label: 'Pris (NOK)'
            }
        };
    };

    // Load initial data and set up ranges
    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
            .then(response => response.json())
            .then(rawData => {
                const listings = rawData.listings || [];
                
                // Extract unique values for all filters
                const models = [...new Set(listings.map(car => car.data['Modell']).filter(Boolean))];
                const modelYears = [...new Set(listings.map(car => car.data['Modellår']).filter(Boolean))];
                const fuelTypes = [...new Set(listings.map(car => car.data['Drivstoff']).filter(Boolean))];
                const drivetrains = [...new Set(listings.map(car => car.data['Hjuldrift']).filter(Boolean))];
                const transmissions = [...new Set(listings.map(car => car.data['Girkasse']).filter(Boolean))];
                
                // Extract battery capacities with debug logging
                console.log('Extracting battery capacities from listings:', listings.length);
                const batteryCapacities = [...new Set(listings
                    .map(car => {
                        const capacity = car.data?.['Batterikapasitet'];
                        if (capacity) {
                            console.log('Found battery capacity:', capacity);
                        }
                        return capacity || 'Ikke oppgitt';
                    })
                    .filter(Boolean))];
                console.log('Extracted unique battery capacities:', batteryCapacities);
                
                // Calculate initial ranges
                const ranges = calculateRangesFromData(listings);
                
                const updatedOptions = {
                    models: models.sort(),
                    modelYears: modelYears.sort(),
                    fuelTypes: fuelTypes.sort(),
                    drivetrains: drivetrains.sort(),
                    transmissions: transmissions.sort(),
                    batteryCapacities: batteryCapacities.sort(),
                    serviceHistories: DEFAULT_SERVICE_HISTORIES,
                    conditions: DEFAULT_CONDITIONS,
                    sellerTypes: DEFAULT_SELLER_TYPES,
                    kilometerRange: ranges.kilometerRange,
                    priceRange: ranges.priceRange
                };

                console.log('Setting filter options with battery capacities:', updatedOptions.batteryCapacities);
                setFilterOptions(updatedOptions);
            })
            .catch(error => {
                console.error('Error loading initial data:', error);
            });
    }, []); // Run only once on mount

    // Update ranges when filters change
    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/finn_listings.json`)
            .then(response => response.json())
            .then(rawData => {
                const listings = rawData.listings || [];
                
                // Filter listings based on current filters
                const filteredListings = listings.filter(car => {
                    const kmValue = car.data['Kilometerstand'] ? 
                        parseInt(car.data['Kilometerstand'].replace(/[^0-9]/g, '')) : null;
                    const priceValue = car.data['Pris eksl. omreg.'] ? 
                        parseInt(car.data['Pris eksl. omreg.'].replace(/[^0-9]/g, '')) : null;

                    return (primaryFilters.model === 'all' || car.data['Modell'] === primaryFilters.model) &&
                           (primaryFilters.modelYear === 'all' || car.data['Modellår'] === primaryFilters.modelYear) &&
                           (primaryFilters.fuelType === 'all' || car.data['Drivstoff'] === primaryFilters.fuelType) &&
                           (primaryFilters.drivetrain === 'all' || car.data['Hjuldrift'] === primaryFilters.drivetrain) &&
                           (primaryFilters.transmission === 'all' || car.data['Girkasse'] === primaryFilters.transmission) &&
                           (primaryFilters.batteryCapacity === 'all' || car.data['Batterikapasitet'] === primaryFilters.batteryCapacity) &&
                           kmValue !== null && priceValue !== null;
                });

                if (filteredListings.length > 0) {
                    // Calculate ranges from filtered data
                    const ranges = calculateRangesFromData(filteredListings);

                    setFilterOptions(prev => ({
                        ...prev,
                        ...ranges
                    }));
                }
            })
            .catch(error => {
                console.error('Error updating ranges:', error);
            });
    }, [primaryFilters]);

    // Shared filter handling functions
    const handlePrimaryFilterChange = (filterName, value) => {
        setPrimaryFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const addComparison = () => {
        if (comparisonFilters.length < MAX_COMPARISONS) {
            setComparisonFilters([...comparisonFilters, {
                model: 'all',
                modelYear: 'all',
                fuelType: 'all',
                drivetrain: 'all',
                serviceHistory: 'all',
                condition: 'all',
                sellerType: 'all',
                transmission: 'all',
                batteryCapacity: 'all'
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
        // Ensure the new value is within the current filtered data range
        const clampedValue = [
            Math.max(currentRanges.kilometer.min, newValue[0]),
            Math.min(currentRanges.kilometer.max, newValue[1])
        ];
        setKilometerRange(clampedValue);
    };

    const handlePriceRangeChange = (event, newValue) => {
        // Ensure the new value is within the current filtered data range
        const clampedValue = [
            Math.max(currentRanges.price.min, newValue[0]),
            Math.min(currentRanges.price.max, newValue[1])
        ];
        setPriceRange(clampedValue);
    };

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
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
}; 
