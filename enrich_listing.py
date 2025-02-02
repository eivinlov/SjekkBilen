import json
from bs4 import BeautifulSoup
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
api_key = os.getenv('OPENAI_API_KEY')

if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables. Please set it in the .env file.")

client = OpenAI(api_key=api_key)

def get_listing_text_from_soup(soup: BeautifulSoup) -> str:
    """
    Extract relevant text content from an already parsed BeautifulSoup object,
    with special focus on 'Beskrivelse' and 'Selgers kjennskap til bilen'
    """
    try:
        text_parts = []
        
        # Get the specs first
        specs_section = soup.select_one("section.key-info-section dl.emptycheck")
        if specs_section:
            specs_text = []
            for div in specs_section.find_all("div", recursive=False):
                dt = div.find("dt")
                dd = div.find("dd")
                if dt and dd:
                    specs_text.append(f"{dt.get_text(strip=True)}: {dd.get_text(strip=True)}")
            text_parts.append("Specifications:\n" + "\n".join(specs_text))

        # Get the description ("Beskrivelse")
        description_section = soup.find('section', class_='border-b', recursive=True)
        if description_section and description_section.find('h3', string='Beskrivelse'):
            description_div = description_section.find('div', {'data-testid': 'expandable-section'})
            if description_div:
                description_text = description_div.get_text(strip=True)
                text_parts.append(f"\nBeskrivelse:\n{description_text}")

        # Get seller's knowledge ("Selgers kjennskap til bilen")
        seller_knowledge_section = soup.find('section', class_='mt-40')
        if seller_knowledge_section and seller_knowledge_section.find('h2', string='Selgers kjennskap til bilen'):
            knowledge_text = []
            # Get all question-answer pairs
            questions = seller_knowledge_section.find_all('p', class_='font-bold')
            for question in questions:
                q_text = question.get_text(strip=True)
                # Get the answer (next sibling p that's not bold)
                answer = question.find_next_sibling('p', class_=lambda x: x != 'font-bold')
                if answer:
                    a_text = answer.get_text(strip=True)
                    knowledge_text.append(f"{q_text}\n{a_text}")
            
            if knowledge_text:
                text_parts.append("\nSelgers kjennskap til bilen:\n" + "\n".join(knowledge_text))

        # Get seller info (as additional context)
        seller_info = soup.find('div', {'data-testid': 'seller-info'})
        if seller_info:
            text_parts.append(f"\nSeller Information:\n{seller_info.get_text(strip=True)}")

        # Combine all parts with clear section separation
        return "\n\n".join(text_parts)
        
    except Exception as e:
        print(f"Error extracting text from soup: {e}")
        return ""

def analyze_listing_content(soup: BeautifulSoup) -> dict:
    """
    Analyze the BeautifulSoup content and generate metadata
    """
    try:
        listing_text = get_listing_text_from_soup(soup)
        if not listing_text:
            return None

        prompt = """
        Analyze this car listing information, paying special attention to the "Beskrivelse" and "Selgers kjennskap til bilen" sections 
        when available, as these contain crucial information about the car's condition and history.

        Based on the available information, provide values for these specific fields:

        {
            "service_historie": Choose one: ["BRA", "MIDDELS", "DÅRLIG", "UKJENT"] - Based on service history and maintenance information,
            "Slitedeler_som_bør_byttes": Choose one: ["JA", "NEI"] - Based on mentioned wear and tear or needed repairs,
            "Pris_estimat_bytte_av_slitedeler": Numeric value in NOK or 0 if no parts need replacement - Estimate based on mentioned issues,
            "Bilens_tilstand": Choose one: ["INGENTING Å BEMERKE", "NOE Å BEMERKE", "MYE Å BEMERKE"] - Overall condition assessment,
            "Spesifikke_feil": List of specific issues mentioned in the listing,
            "Selger": Choose one: ["PRIVAT", "BILFORHANDLER"] - Based on seller information
            "Andre_notater": Any other notes that are not covered by the other fields
        }
        
        If you cant find anything about service history label it as "UKJENT"

        When estimating the price for slitedeler, only include parts that are mentioned in the listing. Prices should be in NOK.

        Only respond with a JSON object containing exactly these fields and values.

        For the "Other_notes" field, include any additional information that a potential buyer would want to know in norwegian.

        Car listing text:
        """
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a car expert who analyzes car listings and provides structured metadata. Focus especially on the seller's description and knowledge of the car when available."},
                {"role": "user", "content": prompt + listing_text}
            ],
            temperature=0.3
        )
        
        metadata = json.loads(response.choices[0].message.content)
        return metadata
        
    except Exception as e:
        print(f"Error analyzing listing with OpenAI: {e}")
        return None 