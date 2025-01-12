import requests
from bs4 import BeautifulSoup
import json
import re
import os
from datetime import datetime
import logging
import time
import random

def clean_spaces(value: str) -> str:
    """Replace weird unicode whitespace with a normal space and strip."""
    return re.sub(r'[\u00A0\u202F\u200B]+', ' ', value).strip()

def parse_finn_listing(url: str) -> dict:
    """
    Fetch the HTML of a Finn.no listing, look for the <dl> element under
    <section class="key-info-section"> that has class 'emptycheck ...'
    containing <dt>/<dd> pairs, and return a dict of those field-value pairs.

    If the structure is not found, return None.
    """
    print(f"Fetching data from: {url}")
    wait_time = random.uniform(0.5, 1)  # Reduced to 0.5-1 seconds
    print(f"Waiting {wait_time:.2f} seconds...")
    time.sleep(wait_time)

    try:
        response = requests.get(url)
        response.raise_for_status()  # raises HTTPError if status != 200
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    # Look for the <section> with class 'key-info-section' that contains our <dl>
    # Typically: <section class="key-info-section border-b mt-40 pb-40">
    # Inside it is: <dl class="emptycheck columns-2 md:columns-3 break-words mb-0 mt-16">
    specs_section = soup.select_one("section.key-info-section dl.emptycheck.columns-2.md\\:columns-3.break-words.mb-0.mt-16")
    # Note: Using a CSS selector with escaping for colons in class names (md:columns-3 -> md\\:columns-3)
    # Alternatively, you can find by partial class if the classes are consistent.

    if not specs_section:
        print(f"No <dl> with class 'emptycheck ...' found for {url}. Skipping.")
        return None

    # The dt/dd pairs appear to be nested in <div> elements:
    # <div><dt>Some Label</dt><dd>Some Value</dd></div>
    listing_data = {}
    div_blocks = specs_section.find_all("div", recursive=False)

    for block in div_blocks:
        dt = block.find("dt")
        dd = block.find("dd")
        if dt and dd:
            key = clean_spaces(dt.get_text(strip=True))    # e.g., "Merke"
            value = clean_spaces(dd.get_text(strip=True))  # e.g., "Skoda"
            listing_data[key] = value

    return listing_data

def parse_car_ad(html_content, url):
    soup = BeautifulSoup(html_content, 'html.parser')
    status = check_listing_status(soup)
    
    if status == 'DEAKTIVERT':
        return {'status': 'deactivated', 'url': url}
    
    data = {}
    keys = soup.find_all('dt', class_='u-t4')
    values = soup.find_all('dd', class_='u-t4')
    
    for key, value in zip(keys, values):
        key_text = key.get_text(strip=True)
        value_text = value.get_text(strip=True)
        data[key_text] = value_text
    
    return {
        'url': url,
        'data': data,
        'status': 'sold' if status == 'SOLGT' else 'active'
    }

def check_listing_status(soup):
    """
    Check the status of a Finn.no listing
    Returns: 'SOLGT', 'DEAKTIVERT', or 'active'
    """
    status_badge = soup.find('div', class_='bg-[--w-color-badge-warning-background]')
    
    if status_badge:
        text = status_badge.get_text(strip=True).upper()
        if 'SOLGT' in text:
            return 'SOLGT'
        elif 'DEAKTIVERT' in text:
            return 'DEAKTIVERT'
    
    return 'active'

def update_listings_database(new_listing, database_file='finn_listings_with_metrics.json'):
    """
    Update the listings database with a new listing
    Handles status changes and deactivated listings
    """
    try:
        # Read existing database
        with open(database_file, 'r', encoding='utf-8') as f:
            database = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        database = {'listings': []}
    
    listings = database['listings']
    
    # Check if listing already exists
    existing_listing_index = next(
        (index for (index, d) in enumerate(listings) 
         if d['url'] == new_listing['url']), 
        None
    )
    
    if existing_listing_index is not None:
        # Listing exists, handle status changes
        if new_listing['status'] == 'deactivated':
            # Remove deactivated listing
            listings.pop(existing_listing_index)
            print(f"Removed deactivated listing: {new_listing['url']}")
        elif new_listing['status'] == 'sold':
            # Update existing listing with sold status
            listings[existing_listing_index]['status'] = 'sold'
            listings[existing_listing_index]['sold_date'] = datetime.now().isoformat()
            print(f"Marked listing as sold: {new_listing['url']}")
        elif new_listing['status'] == 'unknown':
            # Update existing listing with unknown status
            listings[existing_listing_index]['status'] = 'unknown'
            listings[existing_listing_index]['last_updated'] = datetime.now().isoformat()
            print(f"Marked listing as unknown: {new_listing['url']}")
    else:
        # New listing, add it if not deactivated
        if new_listing['status'] != 'deactivated':
            new_listing['last_checked'] = datetime.now().isoformat()
            listings.append(new_listing)
            print(f"Added new listing: {new_listing['url']}")
    
    # Save updated database
    with open(database_file, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)

def process_new_listing(html_content, url):
    """
    Main function to process a new listing
    """
    listing_data = parse_car_ad(html_content, url)
    update_listings_database(listing_data)
    return listing_data

def main(force_reparse=True):  # Always reparse everything
    """
    Main function that reads multiple Finn.no links and updates the database
    """
    # Read links from the file generated by scrape_links.py
    try:
        with open('finn_links.json', 'r', encoding='utf-8') as f:
            finn_links = json.load(f)
            logging.info(f"Loaded {len(finn_links)} links from finn_links.json")
    except FileNotFoundError:
        logging.error("finn_links.json not found. Run scrape_links.py first.")
        raise
    except json.JSONDecodeError:
        logging.error("Error decoding finn_links.json")
        raise

    filename = "finn_listings.json"

    try:
        # Load existing database
        with open(filename, "r", encoding="utf-8") as f:
            database = json.load(f)
            existing_data = database if isinstance(database, list) else database.get('listings', [])
    except (FileNotFoundError, json.JSONDecodeError):
        existing_data = []

    # Create a map of existing listings for easy lookup
    existing_listings = {item["url"]: item for item in existing_data}
    
    # Process all listings
    updated_results = []
    for link in finn_links:
        print(f"Processing: {link}")
        data = parse_finn_listing(link)
    
        if data:
            listing = {
                "url": link,
                "data": data,
                "last_checked": datetime.now().isoformat()
            }
            
            # Check status
            wait_time = random.uniform(0.5, 1)  # Reduced to 0.5-1 seconds
            print(f"Waiting {wait_time:.2f} seconds before status check...")
            time.sleep(wait_time)
            soup = BeautifulSoup(requests.get(link).text, "html.parser")
            status = check_listing_status(soup)
            listing["status"] = status
            
            # Handle status changes
            existing_listing = existing_listings.get(link)
            if existing_listing:
                if status != existing_listing.get("status", "active"):
                    print(f"Status changed for {link}: {existing_listing.get('status', 'active')} -> {status}")
                    if status == "sold":
                        listing["sold_date"] = datetime.now().isoformat()
            
            if status != "deactivated":  # Don't add deactivated listings
                updated_results.append(listing)
                print(f"{'Updated' if existing_listing else 'Added'} listing: {link} (Status: {status})")
        else:
            print(f"Skipped deactivated listing: {link}")

    # Mark remaining active listings as unknown
    current_urls = set(finn_links)
    for url, item in existing_listings.items():
        if url not in current_urls and item.get("status") == "active":
            item["status"] = "unknown"
            item["last_updated"] = datetime.now().isoformat()
            updated_results.append(item)
            print(f"Marked as unknown: {url}")
    
    # Save everything to JSON file
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(updated_results, f, ensure_ascii=False, indent=4)
    
    # Print status breakdown
    statuses = {}
    for item in updated_results:
        status = item.get('status', 'active')
        statuses[status] = statuses.get(status, 0) + 1
    
    print("\nStatus breakdown:")
    for status, count in statuses.items():
        print(f"{status}: {count}")
    print(f"\nTotal listings in database: {len(updated_results)}")

if __name__ == "__main__":
    main()
