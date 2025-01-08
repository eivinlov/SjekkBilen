import json
import matplotlib.pyplot as plt

# Read the data
with open("finn_listings_with_metrics.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Extract metrics
price_per_10k = []
multi_factor_scores = []
years = []

for listing in data["listings"]:
    metrics = listing["metrics"]["metrics"]
    price_per_10k.append(metrics["price_per_10k"])
    multi_factor_scores.append(metrics["multi_factor_score"])
    years.append(int(listing["data"]["Modellår"]))

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))

# Plot price per 10k km
ax1.scatter(years, price_per_10k)
ax1.set_xlabel("Model Year")
ax1.set_ylabel("Price per 10,000 km (NOK)")
ax1.set_title("Price per 10,000 km vs Model Year")
ax1.grid(True)

# Plot multi-factor score
ax2.scatter(years, multi_factor_scores)
ax2.set_xlabel("Model Year")
ax2.set_ylabel("Multi-factor Score")
ax2.set_title("Multi-factor Score vs Model Year")
ax2.grid(True)

# Adjust layout and display
plt.tight_layout()
plt.show()  # Add this line to display the plot
