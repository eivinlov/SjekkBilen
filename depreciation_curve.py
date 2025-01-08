import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import json

def clean_numeric(value):
    """Helper function to clean numeric strings."""
    return int(value.replace(" ", "").replace("kr", "").replace("km", "").replace(",", "").strip())

def prepare_data(listings):
    """Prepare the data for analysis."""
    data = []
    for listing in listings:
        car_data = listing.get("data", {})
        try:
            model = car_data.get("Modell", "Unknown")
            year = int(car_data.get("Modellår", 0))
            drivetrain = car_data.get("Hjuldrift", "Unknown")
            price = clean_numeric(car_data.get("Pris eksl. omreg.", "0"))
            mileage = clean_numeric(car_data.get("Kilometerstand", "0"))
            
            # Current year
            current_year = 2025
            age = current_year - year
            
            data.append({
                "model": model,
                "year": year,
                "drivetrain": drivetrain,
                "price": price,
                "mileage": mileage,
                "age": age
            })
        except Exception as e:
            print(f"Error processing listing: {e}")
            continue
    return pd.DataFrame(data)

def fit_depreciation_curve(data, feature="drivetrain"):
    """Fit depreciation curves and visualize them."""
    grouped = data.groupby(["model", feature])
    
    curves = {}
    for (model, feature_val), group in grouped:
        # Aggregate by age
        avg_prices = group.groupby("age")["price"].mean().reset_index()
        
        # Fit a polynomial regression
        X = avg_prices["age"].values.reshape(-1, 1)
        y = avg_prices["price"].values
        
        # Polynomial regression
        poly = PolynomialFeatures(degree=2)
        X_poly = poly.fit_transform(X)
        model = LinearRegression()
        model.fit(X_poly, y)
        
        # Generate predictions
        X_pred = np.linspace(0, max(avg_prices["age"]), 100).reshape(-1, 1)
        X_pred_poly = poly.transform(X_pred)
        y_pred = model.predict(X_pred_poly)
        
        # Store the curve
        curves[(model, feature_val)] = (X_pred.flatten(), y_pred)
        
        # Plot the curve
        plt.plot(X_pred, y_pred, label=f"{model} ({feature_val})")
        plt.scatter(X, y, label=f"Data ({model}, {feature_val})", alpha=0.7)
    
    plt.xlabel("Age (years)")
    plt.ylabel("Price (kr)")
    plt.title("Depreciation Curves by Model and Feature")
    plt.legend()
    plt.show()
    plt.close()
    
    return curves

def compare_models(data, model1, model2):
    """Compare depreciation curves of two specific models."""
    # Filter data for the two models
    model_data = data[data["model"].isin([model1, model2])]
    
    # Create figure
    plt.figure(figsize=(10, 6))
    
    # Plot each model
    for model in [model1, model2]:
        model_subset = model_data[model_data["model"] == model]
        
        # Aggregate by age
        avg_prices = model_subset.groupby("age")["price"].mean().reset_index()
        
        # Fit polynomial regression
        X = avg_prices["age"].values.reshape(-1, 1)
        y = avg_prices["price"].values
        
        poly = PolynomialFeatures(degree=2)
        X_poly = poly.fit_transform(X)
        reg = LinearRegression()
        reg.fit(X_poly, y)
        
        # Generate predictions
        X_pred = np.linspace(0, max(avg_prices["age"]), 100).reshape(-1, 1)
        X_pred_poly = poly.transform(X_pred)
        y_pred = reg.predict(X_pred_poly)
        
        # Plot
        plt.plot(X_pred, y_pred, label=f"{model} (fitted curve)")
        plt.scatter(X, y, label=f"{model} (actual data)", alpha=0.7)
    
    plt.xlabel("Age (years)")
    plt.ylabel("Price (kr)")
    plt.title(f"Depreciation Comparison: {model1} vs {model2}")
    plt.legend()
    plt.grid(True)
    plt.show()

# Example usage
if __name__ == "__main__":
    # Load data from finn_listings.json
    with open("finn_listings.json", "r", encoding="utf-8") as f:
        listings = json.load(f)
    
    df = prepare_data(listings)
    depreciation_curves = fit_depreciation_curve(df)
    
    # Compare two models (assuming these models exist in the data)
    available_models = df["model"].unique()
    if len(available_models) >= 2:
        compare_models(df, available_models[0], available_models[1])
