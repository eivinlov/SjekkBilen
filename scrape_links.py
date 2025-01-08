import requests
from bs4 import BeautifulSoup
import time

def get_listing_links_on_page(page_url: str) -> list[str]:
    """
    Fetches one Finn summary (search) page and returns a list of listing URLs
    found in <article class="sf-search-ad"> elements.
    """
    print(f"Fetching summary page: {page_url}")
    response = requests.get(page_url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "html.parser")

    # Find <article> elements that have 'sf-search-ad' among their classes
    articles = soup.find_all("article", class_="sf-search-ad")

    listing_links = []
    
    for article in articles:
        # Each listing anchor typically is something like:
        # <h2 class="..."><a class="sf-search-ad-link" href="..."></a></h2>
        link_tag = article.select_one("h2 a.sf-search-ad-link")
        if link_tag and link_tag.has_attr("href"):
            href = link_tag["href"]
            if href.startswith("/"):
                href = "https://www.finn.no" + href
            listing_links.append(href)
    
    return listing_links

def scrape_all_pages(base_url: str, query: str, sleep_sec=1) -> list[str]:
    """
    Iterates through all pages for the given query until no more results are found.
    base_url: e.g. "https://www.finn.no/mobility/search/car"
    query: e.g. "skoda+superb"
    
    Returns a combined list of all listing links.
    """
    all_links = []
    page = 1
    
    while True:
        # Build the URL for this page (Finn uses "?page=X&q=Y")
        url = f"{base_url}?page={page}&q={query}"
        
        # Get the links
        links = get_listing_links_on_page(url)

        # If no links found, we've likely reached the end
        if not links:
            print(f"No more results on page {page}. Stopping.")
            break
        
        # Accumulate them
        all_links.extend(links)
        print(f"Page {page}: Found {len(links)} links. Total so far: {len(all_links)}")

        # Go to next page
        page += 1
        
        # Sleep briefly to be kind to the server
        time.sleep(sleep_sec)
    
    return all_links

def main():
    # Example usage:
    base_url = "https://www.finn.no/mobility/search/car"
    query = "kia+sportage"
    
    all_listing_links = scrape_all_pages(base_url, query, sleep_sec=1)
    
    print(f"\nDone! Found a total of {len(all_listing_links)} listing links.")
    for link in all_listing_links:
        print(link)

if __name__ == "__main__":
    main()
