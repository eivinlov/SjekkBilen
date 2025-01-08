import json
import re
from typing import List, Dict, Any
import datetime

def store_metrics_data(listings: list, metrics_results: list) -> None:
    """
    Takes the original listings data and calculated metrics,
    combines them into a new data structure and saves to JSON.
    
    The output format is:
    {
        "listings": [
            {
                "url": original_url,
                "data": original_listing_data,
                "metrics": {
                    "price": calculated_price,
                    "mileage": calculated_mileage,
                    ...
                }
            },
            ...
        ]
    }
    """
    enriched_data = []
    
    for listing, metrics in zip(listings, metrics_results):
        enriched_listing = {
            "url": listing["url"],
            "data": listing["data"],
            "metrics": metrics
        }
        enriched_data.append(enriched_listing)
    
    output = {
        "listings": enriched_data
    }
    
    # Save to new JSON file
    with open("finn_listings_with_metrics.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=4)


def clean_numeric(value: str) -> int:
    """
    Removes all non-digit characters and returns an integer.
    If no digits found, returns 0.
    Example: "193 695 kr" -> 193695
             "50 259 km"  -> 50259
    """
    digits = re.sub(r"[^\d]", "", value)  # keep only 0-9
    return int(digits) if digits else 0

def compute_price_per_10k(price: int, mileage: int) -> float:
    """
    Returns (price / mileage) * 10000 if mileage > 0, otherwise 9999999.0
    """
    if mileage == 0:
        return 9999999.0  # fallback if mileage is zero or not found
    return (price / mileage) * 10000

def compute_price_per_10k(price: int, mileage: int) -> float:
    """
    Returns (price / mileage) * 10000 if mileage > 0.
    If mileage == 0, returns float('inf') to avoid division by zero.
    """
    if mileage <= 0:
        return float('inf')
    return (price / mileage) * 10000

def compute_age(model_year: int) -> int:
    """
    Computes a rough 'age' of the car based on model_year.
    Uses the current calendar year as reference. 
    If model_year is 0 or invalid, returns 0.
    """
    current_year = datetime.datetime.now().year
    if model_year <= 0:
        return 0
    age = current_year - model_year
    return age if age >= 0 else 0  # no negative ages

def compute_warranty_months(warranty_str: str) -> int:
    """
    Extracts an integer from a string that might contain 
    the number of warranty months.
    E.g. "6 måneder" -> 6
    If not parseable, returns 0.
    """
    if not isinstance(warranty_str, str):
        return 0
    # Look for digits in something like "2 måneder" or "6 mnd"
    digits = clean_numeric(warranty_str)
    if digits:
        return int(digits)
    return 0

def compute_effect(effect_str: str) -> int:
    """
    Extracts the horsepower/kW from a string, e.g. "120 hk".
    If not parseable, returns 0.
    """
    if not isinstance(effect_str, str):
        return 0
    digits = clean_numeric(effect_str)
    return int(digits) if digits else 0

def compute_owners(owners_str: str) -> int:
    """
    Extracts the number of owners, e.g. "3" from "3 eiere".
    If not parseable, returns 1 as a default.
    """
    if not isinstance(owners_str, str):
        return 1  # fallback if missing
    digits = clean_numeric(owners_str)
    return int(digits) if digits else 1

def compute_multifactor_score(price: int, mileage: int, age: int, warranty_mo: int, effekt: int, owners: int) -> float:
    """
    Multi-factor scoring approach combining:
      - Price  (lower is better)
      - Mileage (lower is better)
      - Age (lower is better)
      - Warranty months (higher is better)
      - Effekt / horsepower (higher is better)
      - Number of owners (lower is better)
    
    Adjust the weights to reflect your preferences.
    """
    try:
        score = 0.0
        
        # Example weights / formula (tweak as needed)
        # Subtract points for higher price, mileage, age, owners
        # Add points for more warranty, higher horsepower
        
        # Price factor
        # e.g. multiply by 0.0001 to keep the score in a reasonable range
        score -= price * 0.0001
        
        # Mileage factor
        score -= mileage * 0.01
        
        # Age factor (in years)
        score -= age * 100
        
        # Warranty months
        score += warranty_mo * 200
        
        # Effekt
        score += effekt * 2
        
        # Owners
        # If owners are > 1, subtract more
        score -= (owners - 1) * 500
        
        return score
    except Exception as e:
        # In case of any weird errors, fallback to a large negative or 0
        print(f"Error computing multifactor score: {e}")
        return float('-inf')

def calculate_metrics(listings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calculates various metrics for each car listing and stores them in results.
    Each result might contain:
      - 'url': the listing's URL
      - 'metrics': a dictionary of calculated metrics 
                   (price, mileage, price_per_10k, multi_factor_score, etc.)
      - 'data': the original listing data for reference
    """
    results = []
    
    for listing in listings:
        car_data = listing.get("data", {})

        # Extract raw numeric values (with error handling)
        price = clean_numeric(car_data.get("Pris eksl. omreg.", ""))
        mileage = clean_numeric(car_data.get("Kilometerstand", ""))
        
        # Model year might be something like "2017"
        try:
            model_year = int(car_data.get("Modellår", "0"))
        except ValueError:
            model_year = 0
        
        # Warranty might be "6 måneder" or "12 mnd" 
        warranty_mo = compute_warranty_months(car_data.get("Garantiens varighet", ""))
        
        # Effekt might be "115 hk"
        effekt = compute_effect(car_data.get("Effekt", ""))
        
        # Owners might be "3" or "3 eiere"
        owners = compute_owners(car_data.get("Eiere", "1"))
        
        # Compute individual metrics
        age = compute_age(model_year)
        price_per_10k = compute_price_per_10k(price, mileage)
        multi_factor_score = compute_multifactor_score(
            price=price,
            mileage=mileage,
            age=age,
            warranty_mo=warranty_mo,
            effekt=effekt,
            owners=owners
        )
        
        # Build a dict of all calculated metrics
        metrics = {
            "price_per_10k": price_per_10k,
            "multi_factor_score": multi_factor_score
        }
        
        # Store results along with original listing for reference
        results.append({
            "url": listing.get("url", ""),
            "metrics": metrics,
        })

    return results

def main():
    # Load listings data
    with open("finn_listings.json", "r", encoding="utf-8") as f:
        listings = json.load(f)

    # Calculate metrics and store results
    metrics_results = calculate_metrics(listings)
    store_metrics_data(listings, metrics_results)

if __name__ == "__main__":
    main()
