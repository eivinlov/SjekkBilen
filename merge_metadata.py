import json

def load_json_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
        # Check if the data is a string (which would cause our error)
        if isinstance(data, str):
            # Try parsing it again in case it's double-encoded
            data = json.loads(data)
        return data

def save_json_file(data, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def merge_metadata():
    # Load both JSON files
    print("Loading JSON files...")
    test_listings = load_json_file('finn_listings_test.json')
    metrics_listings = load_json_file('finn_listings_with_metrics.json')

    # Add debug information
    print(f"Type of test_listings: {type(test_listings)}")
    print(f"Type of metrics_listings: {type(metrics_listings)}")
    
    # Ensure we have lists
    if isinstance(test_listings, dict) and 'listings' in test_listings:
        test_listings = test_listings['listings']
    if isinstance(metrics_listings, dict) and 'listings' in metrics_listings:
        metrics_listings = metrics_listings['listings']

    # Verify the data structure
    if not test_listings or not isinstance(test_listings, list):
        raise ValueError(f"Invalid test_listings format: {type(test_listings)}")
    if not metrics_listings or not isinstance(metrics_listings, list):
        raise ValueError(f"Invalid metrics_listings format: {type(metrics_listings)}")

    # Print sample data for debugging
    print("\nSample test listing:")
    print(json.dumps(test_listings[0] if test_listings else "No test listings", indent=2))
    print("\nSample metrics listing:")
    print(json.dumps(metrics_listings[0] if metrics_listings else "No metrics listings", indent=2))

    # Create a dictionary of test listings by URL for faster lookup
    test_listings_by_url = {listing['url']: listing for listing in test_listings}
    
    # Counter for tracking changes
    updated_count = 0
    total_metrics_listings = len(metrics_listings)

    # Iterate through metrics listings and update metadata where possible
    print("\nMerging metadata...")
    for metrics_listing in metrics_listings:
        if not isinstance(metrics_listing, dict):
            print(f"Warning: Invalid metrics listing format: {type(metrics_listing)}")
            continue
            
        url = metrics_listing.get('url')
        if not url:
            print(f"Warning: Missing URL in metrics listing")
            continue

        if url in test_listings_by_url:
            test_listing = test_listings_by_url[url]
            
            # If the test listing has metadata
            if 'metadata' in test_listing:
                # If metrics listing doesn't have metadata, create it
                if 'metadata' not in metrics_listing:
                    metrics_listing['metadata'] = {}
                
                # Update metadata fields from test listing
                metrics_listing['metadata'].update(test_listing['metadata'])
                updated_count += 1

    print(f"Processed {total_metrics_listings} listings")
    print(f"Updated metadata for {updated_count} listings")

    # Save the updated metrics data to a new file
    output_filename = 'finn_listings_with_metrics_updated.json'
    save_json_file(metrics_listings, output_filename)
    print(f"Saved updated data to {output_filename}")

if __name__ == "__main__":
    try:
        merge_metadata()
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        # Print more detailed error information
        import traceback
        traceback.print_exc() 