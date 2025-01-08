import requests
from bs4 import BeautifulSoup
import json
import re
import os

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


def main(force_reparse=False):
    """
    Main function that reads multiple Finn.no links,
    parses each listing, and writes the results to a JSON file.
    
    Args:
        force_reparse: If True, reparse all listings even if they exist in database
    """
    
    # Example links: replace with your own
    finn_links = [
    "https://www.finn.no/mobility/item/371844368",
    "https://www.finn.no/mobility/item/387854182",
    "https://www.finn.no/mobility/item/387829854",
    "https://www.finn.no/mobility/item/387825440",
    "https://www.finn.no/mobility/item/387824688",
    "https://www.finn.no/mobility/item/343177455",
    "https://www.finn.no/mobility/item/387810020",
    "https://www.finn.no/mobility/item/387808853",
    "https://www.finn.no/mobility/item/387799492",
    "https://www.finn.no/mobility/item/387785433",
    "https://www.finn.no/mobility/item/387783785",
    "https://www.finn.no/mobility/item/387783067",
    "https://www.finn.no/mobility/item/387771200",
    "https://www.finn.no/mobility/item/387769574",
    "https://www.finn.no/mobility/item/387753610",
    "https://www.finn.no/mobility/item/374712993",
    "https://www.finn.no/mobility/item/387757505",
    "https://www.finn.no/mobility/item/387757093",
    "https://www.finn.no/mobility/item/387280064",
    "https://www.finn.no/mobility/item/387749439",
    "https://www.finn.no/mobility/item/387749144",
    "https://www.finn.no/mobility/item/387747962",
    "https://www.finn.no/mobility/item/387746061",
    "https://www.finn.no/mobility/item/387743199",
    "https://www.finn.no/mobility/item/387741387",
    "https://www.finn.no/mobility/item/387553918",
    "https://www.finn.no/mobility/item/376335963",
    "https://www.finn.no/mobility/item/387651320",
    "https://www.finn.no/mobility/item/387604572",
    "https://www.finn.no/mobility/item/387602376",
    "https://www.finn.no/mobility/item/387562329",
    "https://www.finn.no/mobility/item/387493416",
    "https://www.finn.no/mobility/item/387490145",
    "https://www.finn.no/mobility/item/387486646",
    "https://www.finn.no/mobility/item/387479423",
    "https://www.finn.no/mobility/item/368336939",
    "https://www.finn.no/mobility/item/368113798",
    "https://www.finn.no/mobility/item/364765521",
    "https://www.finn.no/mobility/item/365971271",
    "https://www.finn.no/mobility/item/365814058",
    "https://www.finn.no/mobility/item/365657302",
    "https://www.finn.no/mobility/item/364925136",
    "https://www.finn.no/mobility/item/362598894",
    "https://www.finn.no/mobility/item/362120903",
    "https://www.finn.no/mobility/item/361485760",
    "https://www.finn.no/mobility/item/361058744",
    "https://www.finn.no/mobility/item/358557785",
    "https://www.finn.no/mobility/item/353189270",
    "https://www.finn.no/mobility/item/350285360",
    "https://www.finn.no/mobility/item/349288566",
    "https://www.finn.no/mobility/item/342757776",
    ]

    filename = "finn_listings.json"
    existing_data = []
    existing_urls = set()

    # Load existing data if available
    if os.path.exists(filename) and not force_reparse:
        with open(filename, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
            existing_urls = {item["url"] for item in existing_data}
    
    # Only parse new URLs or all if force_reparse is True
    new_results = []
    for link in finn_links:
        if force_reparse or link not in existing_urls:
            data = parse_finn_listing(link)
            if data:
                new_results.append({
                    "url": link,
                    "data": data
                })
        else:
            print(f"Skipping {link} - already in database")
    
    # Combine existing and new results
    all_results = existing_data + new_results
    
    # Save everything to JSON file
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=4)
    
    print(f"Done! Added {len(new_results)} new listings to database.")
    print(f"Database now contains {len(all_results)} total listings.")

if __name__ == "__main__":
    main(force_reparse=False)  # Set to True to reparse everything
