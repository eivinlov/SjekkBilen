from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import date

# SQLAlchemy setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./finn_listings.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy models
class ListingDB(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True)
    modell = Column(String)
    modellaar = Column(Integer)
    hjuldrift = Column(String)
    pris = Column(Integer)
    kilometerstand = Column(Integer)
    merke = Column(String)
    karosseri = Column(String)
    drivstoff = Column(String)
    effekt = Column(String)
    slagvolum = Column(String)
    co2 = Column(String)
    girkasse = Column(String)
    maksimal_tilhengervekt = Column(Integer)
    vekt = Column(Integer)
    seter = Column(Integer)
    dorer = Column(Integer)
    bagasjerom = Column(String)
    farge = Column(String)
    fargebeskrivelse = Column(String)
    interiorfarge = Column(String)
    lokasjon = Column(String)
    neste_eu_kontroll = Column(Date)
    avgiftsklasse = Column(String)
    registreringsnummer = Column(String)
    vin = Column(String)
    forste_registrering = Column(Date)
    garanti = Column(String)
    garantiens_varighet = Column(String)
    garanti_inntil = Column(String)
    tilstandsrapport = Column(String)
    salgsform = Column(String)
    
    metrics = relationship("MetricsDB", back_populates="listing", uselist=False)

class MetricsDB(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    price_per_10k = Column(Float)
    multi_factor_score = Column(Float)
    
    listing = relationship("ListingDB", back_populates="metrics")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class MetricsBase(BaseModel):
    price_per_10k: float
    multi_factor_score: float

class ListingBase(BaseModel):
    url: str
    modell: str
    modellaar: int
    hjuldrift: str
    pris: int
    kilometerstand: int
    merke: str
    karosseri: str
    drivstoff: str
    effekt: str
    slagvolum: str
    co2: str
    girkasse: str
    maksimal_tilhengervekt: int
    vekt: int
    seter: int
    dorer: int
    bagasjerom: str
    farge: str
    fargebeskrivelse: str
    interiorfarge: str
    lokasjon: str
    neste_eu_kontroll: str
    avgiftsklasse: str
    registreringsnummer: str
    vin: str
    forste_registrering: str
    garanti: str
    garantiens_varighet: str
    garanti_inntil: str
    tilstandsrapport: str
    salgsform: str

class MetricsCreate(MetricsBase):
    pass

class ListingCreate(ListingBase):
    pass

class Metrics(MetricsBase):
    id: int
    listing_id: int

    class Config:
        from_attributes = True

class Listing(ListingBase):
    id: int
    metrics: Metrics

    class Config:
        from_attributes = True

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI app
app = FastAPI()

@app.post("/listings/", response_model=Listing)
def create_listing(listing: ListingCreate, metrics: MetricsCreate, db: Session = Depends(get_db)):
    db_listing = ListingDB(**listing.dict())
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)
    
    db_metrics = MetricsDB(**metrics.dict(), listing_id=db_listing.id)
    db.add(db_metrics)
    db.commit()
    db.refresh(db_metrics)
    
    return db_listing

@app.get("/listings/", response_model=List[Listing])
def read_listings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    listings = db.query(ListingDB).offset(skip).limit(limit).all()
    return listings

@app.get("/listings/{listing_id}", response_model=Listing)
def read_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(ListingDB).filter(ListingDB.id == listing_id).first()
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

@app.put("/listings/{listing_id}", response_model=Listing)
def update_listing(listing_id: int, listing: ListingCreate, metrics: MetricsCreate, db: Session = Depends(get_db)):
    db_listing = db.query(ListingDB).filter(ListingDB.id == listing_id).first()
    if db_listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Update listing
    for key, value in listing.dict().items():
        setattr(db_listing, key, value)
    
    # Update metrics
    for key, value in metrics.dict().items():
        setattr(db_listing.metrics, key, value)
    
    db.commit()
    db.refresh(db_listing)
    return db_listing

@app.delete("/listings/{listing_id}")
def delete_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(ListingDB).filter(ListingDB.id == listing_id).first()
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    db.delete(listing)
    db.commit()
    return {"message": "Listing deleted successfully"}

@app.post("/import-json/")
def import_json_data(filename: str = "finn_listings_with_metrics.json", db: Session = Depends(get_db)):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for item in data.get("listings", []):
            listing_data = ListingCreate(
                url=item["url"],
                modell=item["data"]["Modell"],
                modellaar=int(item["data"]["Modellår"]),
                hjuldrift=item["data"]["Hjuldrift"],
                pris=int(item["data"]["Pris eksl. omreg."].replace(" ", "").replace("kr", "")),
                kilometerstand=int(item["data"]["Kilometerstand"].replace(" ", "").replace("km", "")),
                merke=item["data"]["Merke"],
                karosseri=item["data"]["Karosseri"],
                drivstoff=item["data"]["Drivstoff"],
                effekt=item["data"]["Effekt"],
                slagvolum=item["data"]["Slagvolum"],
                co2=item["data"]["CO₂-utslipp"],
                girkasse=item["data"]["Girkasse"],
                maksimal_tilhengervekt=int(item["data"]["Maksimal tilhengervekt"].split()[0]),
                vekt=int(item["data"]["Vekt"].split()[0]),
                seter=int(item["data"]["Seter"]),
                dorer=int(item["data"]["Dører"]),
                bagasjerom=item["data"]["Størrelse på bagasjerom"],
                farge=item["data"]["Farge"],
                fargebeskrivelse=item["data"]["Fargebeskrivelse"],
                interiorfarge=item["data"]["Interiørfarge"],
                lokasjon=item["data"]["Bilen står i"],
                neste_eu_kontroll=item["data"]["Neste frist for EU-kontroll"],
                avgiftsklasse=item["data"]["Avgiftsklasse"],
                registreringsnummer=item["data"]["Registreringsnummer"],
                vin=item["data"]["Chassis nr. (VIN)"],
                forste_registrering=item["data"]["1. gang registrert"],
                garanti=item["data"]["Garanti"],
                garantiens_varighet=item["data"]["Garantiens varighet"],
                garanti_inntil=item["data"]["Garanti inntil"],
                tilstandsrapport=item["data"]["Tilstandsrapport"],
                salgsform=item["data"]["Salgsform"]
            )
            
            metrics_data = MetricsCreate(
                price_per_10k=item["metrics"]["metrics"]["price_per_10k"],
                multi_factor_score=item["metrics"]["metrics"]["multi_factor_score"]
            )
            
            create_listing(listing_data, metrics_data, db)
            
        return {"message": "Data imported successfully"}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="JSON file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root(db: Session = Depends(get_db)):
    # Count total listings using SQLAlchemy
    total_listings = db.query(ListingDB).count()
    
    return {
        "message": "Welcome to the Finn Listings API",
        "status": "running",
        "total_listings": total_listings,
        "endpoints": {
            "GET /": "This help message",
            "GET /listings/": "List all listings",
            "GET /listings/{id}": "Get a specific listing",
            "POST /listings/": "Create a new listing",
            "PUT /listings/{id}": "Update a listing",
            "DELETE /listings/{id}": "Delete a listing",
            "POST /import-json/": "Import listings from JSON file"
        }
    }

def demo_api_usage():
    """
    Demonstrates how to use the different API endpoints.
    Run this function to see example usage of the API.
    """
    import requests
    import json
    
    # Base URL for the API
    base_url = "http://localhost:8000"
    
    
    # 1. Import data from JSON file
    print("\n1. Importing data from JSON file...")
    response = requests.post(f"{base_url}/import-json/", 
                           params={"filename": "finn_listings_with_metrics.json"})
    print(f"Import response: {response.json()}")
    
    # 2. Create a new listing
    print("\n2. Creating a new listing...")
    new_listing = {
        "url": "https://www.finn.no/car/used/ad/example",
        "modell": "Test Model",
        "modellaar": 2020,
        "hjuldrift": "4WD",
        "pris": 500000,
        "kilometerstand": 50000,
        "merke": "Test Brand",
        "karosseri": "Sedan",
        "drivstoff": "Electric",
        "effekt": "400 hk",
        "slagvolum": "N/A",
        "co2": "0 g/km",
        "girkasse": "Automatic",
        "maksimal_tilhengervekt": 2000,
        "vekt": 2100,
        "seter": 5,
        "dorer": 4,
        "bagasjerom": "500 l",
        "farge": "Black",
        "fargebeskrivelse": "Metallic Black",
        "interiorfarge": "Black leather",
        "lokasjon": "Oslo",
        "neste_eu_kontroll": "2025-01-01",
        "avgiftsklasse": "Personbil",
        "registreringsnummer": "EK12345",
        "vin": "12345678901234567",
        "forste_registrering": "2020-01-01",
        "garanti": "Factory",
        "garantiens_varighet": "5 years",
        "garanti_inntil": "100000 km",
        "tilstandsrapport": "Yes",
        "salgsform": "Used car for sale"
    }
    metrics = {
        "price_per_10k": 100000,
        "multi_factor_score": 8.5
    }
    response = requests.post(f"{base_url}/listings/", 
                           json={"listing": new_listing, "metrics": metrics})
    created_listing = response.json()
    print(f"Created listing: {created_listing}")
    
    # 3. Get all listings
    print("\n3. Getting all listings...")
    response = requests.get(f"{base_url}/listings/")
    all_listings = response.json()
    print(f"Found {len(all_listings)} listings")
    
    # 4. Get a specific listing
    if all_listings:
        listing_id = all_listings[0]["id"]
        print(f"\n4. Getting listing with ID {listing_id}...")
        response = requests.get(f"{base_url}/listings/{listing_id}")
        listing = response.json()
        print(f"Retrieved listing: {listing}")
        
        # 5. Update the listing
        print(f"\n5. Updating listing {listing_id}...")
        updates = {
            "listing": {"pris": 490000},
            "metrics": {"multi_factor_score": 8.7}
        }
        response = requests.put(f"{base_url}/listings/{listing_id}", json=updates)
        updated_listing = response.json()
        print(f"Updated listing: {updated_listing}")
        
        # 6. Delete the listing
        print(f"\n6. Deleting listing {listing_id}...")
        response = requests.delete(f"{base_url}/listings/{listing_id}")
        print(f"Delete response: {response.json()}")
