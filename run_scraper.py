import logging
import time
from datetime import datetime
import sys
import os
from typing import Optional

# Import our other scripts
import scrape_links
import parse_car_ad

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

def run_scraping() -> Optional[str]:
    """
    Run the scraping process to collect Finn.no links
    Returns the path to the generated links file or None if failed
    """
    try:
        logging.info("Starting link scraping process...")
        start_time = time.time()
        
        # Run the scraping process
        scrape_links.main()
        
        elapsed_time = time.time() - start_time
        logging.info(f"Link scraping completed in {elapsed_time:.2f} seconds")
        
        # Verify the output file exists
        if os.path.exists('finn_links_test.json'):
            return 'finn_links_test.json'
        else:
            logging.error("finn_links_test.json was not created")
            return None
            
    except Exception as e:
        logging.error(f"Error during link scraping: {e}")
        return None

def run_parsing() -> bool:
    """
    Run the parsing process to update the database
    Returns True if successful, False otherwise
    """
    try:
        logging.info("Starting parsing process...")
        start_time = time.time()
        
        # Run the parsing process
        parse_car_ad.main()
        
        elapsed_time = time.time() - start_time
        logging.info(f"Parsing completed in {elapsed_time:.2f} seconds")
        
        return True
        
    except Exception as e:
        logging.error(f"Error during parsing: {e}")
        return False

def main():
    """
    Main orchestration function
    """
    start_time = time.time()
    logging.info(f"Starting scraping run at {datetime.now().isoformat()}")
    
    # Create backup of existing database if it exists
    if os.path.exists('finn_listings.json'):
        backup_name = f"finn_listings_backup_{int(time.time())}.json"
        try:
            with open('finn_listings.json', 'r') as src, open(backup_name, 'w') as dst:
                dst.write(src.read())
            logging.info(f"Created backup: {backup_name}")
        except Exception as e:
            logging.error(f"Failed to create backup: {e}")
            return
    
    # Step 1: Run the scraping process
    links_file = run_scraping()
    if not links_file:
        logging.error("Scraping process failed, aborting...")
        return
    
    # Optional delay between steps
    time.sleep(2)
    
    # Step 2: Run the parsing process
    if not run_parsing():
        logging.error("Parsing process failed")
        return
    
    # Calculate and log statistics
    elapsed_time = time.time() - start_time
    logging.info(f"Complete run finished in {elapsed_time:.2f} seconds")
    
    try:
        # Log final database statistics
        with open('finn_listings.json', 'r') as f:
            import json
            database = json.load(f)
            listings = database.get('listings', [])
            
            # Count listings by status
            status_counts = {}
            for listing in listings:
                status = listing.get('status', 'active')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            logging.info("Final database statistics:")
            logging.info(f"Total listings: {len(listings)}")
            for status, count in status_counts.items():
                logging.info(f"{status}: {count}")
            
    except Exception as e:
        logging.error(f"Error calculating final statistics: {e}")

if __name__ == "__main__":
    main()