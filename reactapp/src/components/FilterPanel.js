import React from 'react';
import { useFilters } from '../contexts/FilterContext';
import { Box, Grid2, Select, MenuItem, Typography, FormControlLabel, Checkbox, Button, Slider } from '@mui/material';

export function FilterPanel() {
    const {
        primaryFilters,
        comparisonFilters,
        filterOptions = {},
        handlePrimaryFilterChange,
        handleComparisonFilterChange,
        addComparison,
        removeComparison,
        MAX_COMPARISONS,
        kilometerRange,
        priceRange,
        handleKilometerRangeChange,
        handlePriceRangeChange,
    } = useFilters();

    const {
        models = [],
        modelYears = [],
        fuelTypes = [],
        drivetrains = [],
        serviceHistories = ['BRA', 'MIDDELS', 'DÅRLIG', 'UKJENT'],
        conditions = ['INGENTING Å BEMERKE', 'NOE Å BEMERKE', 'MYE Å BEMERKE'],
        sellerTypes = ['PRIVAT', 'BILFORHANDLER'],
        transmissions = [],
        batteryCapacities = []
    } = filterOptions;

    return (
        <Box sx={{ mb: 3 }}>
            <Grid2 container spacing={2}>
                {/* Primary Filters */}
                <Grid2 xs={12}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={primaryFilters.showOnlySold}
                                onChange={(e) => handlePrimaryFilterChange('showOnlySold', e.target.checked)}
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
                        onChange={(e) => handlePrimaryFilterChange('model', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle modeller</MenuItem>
                        {models.map(model => (
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
                        onChange={(e) => handlePrimaryFilterChange('modelYear', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle år</MenuItem>
                        {modelYears.map(year => (
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
                        onChange={(e) => handlePrimaryFilterChange('fuelType', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle typer</MenuItem>
                        {fuelTypes.map(type => (
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
                        onChange={(e) => handlePrimaryFilterChange('drivetrain', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle typer</MenuItem>
                        {drivetrains.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>
                        Service Historie
                    </Typography>
                    <Select
                        fullWidth
                        value={primaryFilters.serviceHistory}
                        onChange={(e) => handlePrimaryFilterChange('serviceHistory', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle</MenuItem>
                        {serviceHistories.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>
                        Bilens Tilstand
                    </Typography>
                    <Select
                        fullWidth
                        value={primaryFilters.condition}
                        onChange={(e) => handlePrimaryFilterChange('condition', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle</MenuItem>
                        {conditions.map(condition => (
                            <MenuItem key={condition} value={condition}>{condition}</MenuItem>
                        ))}
                    </Select>
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>
                        Selger Type
                    </Typography>
                    <Select
                        fullWidth
                        value={primaryFilters.sellerType}
                        onChange={(e) => handlePrimaryFilterChange('sellerType', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle</MenuItem>
                        {sellerTypes.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>
                        Girkasse
                    </Typography>
                    <Select
                        fullWidth
                        value={primaryFilters.transmission}
                        onChange={(e) => handlePrimaryFilterChange('transmission', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle typer</MenuItem>
                        {transmissions.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </Select>
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Typography variant="subtitle2" gutterBottom>
                        Batterikapasitet
                    </Typography>
                    <Select
                        fullWidth
                        value={primaryFilters.batteryCapacity}
                        onChange={(e) => handlePrimaryFilterChange('batteryCapacity', e.target.value)}
                        size="small"
                    >
                        <MenuItem value="all">Alle</MenuItem>
                        {batteryCapacities.map(capacity => (
                            <MenuItem key={capacity} value={capacity}>{capacity}</MenuItem>
                        ))}
                    </Select>
                </Grid2>

                {/* Kilometer Range Slider */}
                <Grid2 xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                        Kilometerstand
                    </Typography>
                    <Slider
                        value={kilometerRange}
                        onChange={handleKilometerRangeChange}
                        valueLabelDisplay="auto"
                        min={filterOptions.kilometerRange?.min || 0}
                        max={filterOptions.kilometerRange?.max || 1000000}
                        valueLabelFormat={value => `${value.toLocaleString()} km`}
                    />
                </Grid2>

                {/* Price Range Slider */}
                <Grid2 xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                        Price Range
                    </Typography>
                    <Slider
                        value={priceRange}
                        onChange={handlePriceRangeChange}
                        min={0}
                        max={1000000}
                        step={1000}
                        valueLabelDisplay="auto"
                    />
                </Grid2>

                {/* Comparison Filters */}
                {comparisonFilters.map((comparison, index) => (
                    <Grid2 container spacing={2} key={index}>
                        <Grid2 xs={12} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2">
                                Sammenligning {index + 1}
                            </Typography>
                            <Button 
                                onClick={() => removeComparison(index)}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ minWidth: '40px', ml: 1 }}
                            >
                                X
                            </Button>
                        </Grid2>
                        
                        {/* Model */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Modell
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.model}
                                onChange={(e) => handleComparisonFilterChange(index, 'model', e.target.value)}
                                size="small"
                            >
                                {models.map(model => (
                                    <MenuItem key={model} value={model}>{model}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Model Year */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Årsmodell
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.modelYear}
                                onChange={(e) => handleComparisonFilterChange(index, 'modelYear', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle år</MenuItem>
                                {modelYears.map(year => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Fuel Type */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Drivstoff
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.fuelType}
                                onChange={(e) => handleComparisonFilterChange(index, 'fuelType', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle typer</MenuItem>
                                {fuelTypes.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Drivetrain */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Hjuldrift
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.drivetrain}
                                onChange={(e) => handleComparisonFilterChange(index, 'drivetrain', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle typer</MenuItem>
                                {drivetrains.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Show Only Sold Checkbox */}
                        <Grid2 xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={comparison.showOnlySold}
                                        onChange={(e) => handleComparisonFilterChange(index, 'showOnlySold', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Vis kun solgte biler"
                            />
                        </Grid2>

                        {/* Service History */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Service Historie
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.serviceHistory}
                                onChange={(e) => handleComparisonFilterChange(index, 'serviceHistory', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle</MenuItem>
                                {serviceHistories.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Car Condition */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Bilens Tilstand
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.condition}
                                onChange={(e) => handleComparisonFilterChange(index, 'condition', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle</MenuItem>
                                {conditions.map(condition => (
                                    <MenuItem key={condition} value={condition}>{condition}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Seller Type */}
                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Selger Type
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.sellerType}
                                onChange={(e) => handleComparisonFilterChange(index, 'sellerType', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle</MenuItem>
                                {sellerTypes.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Girkasse
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.transmission}
                                onChange={(e) => handleComparisonFilterChange(index, 'transmission', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle typer</MenuItem>
                                {transmissions.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        <Grid2 xs={12} sm={6} md={3}>
                            <Typography variant="subtitle2" gutterBottom>
                                Batterikapasitet
                            </Typography>
                            <Select
                                fullWidth
                                value={comparison.batteryCapacity}
                                onChange={(e) => handleComparisonFilterChange(index, 'batteryCapacity', e.target.value)}
                                size="small"
                            >
                                <MenuItem value="all">Alle</MenuItem>
                                {batteryCapacities.map(capacity => (
                                    <MenuItem key={capacity} value={capacity}>{capacity}</MenuItem>
                                ))}
                            </Select>
                        </Grid2>

                        {/* Remove Comparison Button */}
                        <Grid2 xs={12}>
                            <Button 
                                variant="outlined" 
                                color="error" 
                                onClick={() => removeComparison(index)}
                                sx={{ mt: 2 }}
                            >
                                Fjern sammenligning
                            </Button>
                        </Grid2>
                    </Grid2>
                ))}

                {/* Add Comparison Button */}
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
    );
} 