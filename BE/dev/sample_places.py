"""Sample `places` rows for running the API without Supabase.

PLACEHOLDER DATA, not verified: landmark coordinates are approximate, the shops and
food stalls are made up, and every price, opening hour and stay time is a guess.
Real data comes from the UST team via the template in docs/data-template/.

Columns follow BE/db/schema.sql.
"""

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def hours(value: str, **overrides: str) -> dict:
    """Same hours every day, e.g. hours("08:00-20:00", mon="closed")."""
    return {d: overrides.get(d, value) for d in DAYS}


def place(place_id, name, category, lat, lng, district, *, price=None, entry=0,
          small=False, stay=40, opening=None, tags=(), description=None):
    lo, hi = price if price else (None, None)
    return {
        "place_id": place_id,
        "name": name,
        "category": category,
        "is_small_business": small,
        "lat": lat,
        "lng": lng,
        "address": f"{district}, Manila",
        "district": district,
        "price_min": lo,
        "price_max": hi,
        "entry_fee": entry,
        "avg_stay_minutes": stay,
        "opening_hours": opening if opening is not None else hours("08:00-20:00"),
        "tags": list(tags),
        "description": description,
        "photos": [],
        "contact": None,
        "source": "dev sample (placeholder)",
        "last_checked": None,
    }


SAMPLE_PLACES = [
    # Intramuros
    place("DEV-0001", "Fort Santiago", "attraction", 14.5958, 120.9705, "Intramuros",
          entry=75, stay=60, opening=hours("08:00-22:00"), tags=["history", "heritage"],
          description="Spanish-era citadel at the mouth of the Pasig River."),
    place("DEV-0002", "Manila Cathedral", "attraction", 14.5915, 120.9734, "Intramuros",
          stay=30, opening=hours("07:00-17:00"), tags=["church", "history"],
          description="Basilica on Plaza de Roma. Free to enter."),
    place("DEV-0003", "San Agustin Church Museum", "attraction", 14.5889, 120.9751, "Intramuros",
          entry=200, stay=50, opening=hours("08:00-17:00", mon="closed"), tags=["museum", "church"],
          description="Oldest stone church in the country, with a museum. Closed on Mondays (sample)."),
    place("DEV-0004", "Kalye Lumpia Stall", "restaurant", 14.5905, 120.9750, "Intramuros",
          price=(80, 150), small=True, stay=30, tags=["street food", "lumpia"],
          description="Family-run stall selling fresh lumpia (made-up sample)."),
    place("DEV-0005", "Plaza Kapihan", "restaurant", 14.5912, 120.9741, "Intramuros",
          price=(120, 220), small=True, stay=40, opening=hours("07:00-19:00"), tags=["cafe", "coffee"],
          description="Small café serving barako coffee and kakanin (made-up sample)."),
    place("DEV-0006", "Intramuros Weavers Shop", "shop", 14.5897, 120.9758, "Intramuros",
          price=(150, 600), small=True, stay=25, opening=hours("09:00-18:00", sun="closed"),
          tags=["souvenir", "handicraft"],
          description="Local woven bags and souvenirs (made-up sample)."),
    # Binondo
    place("DEV-0007", "Binondo Church", "attraction", 14.6003, 120.9747, "Binondo",
          stay=25, opening=hours("06:00-19:00"), tags=["church", "history"],
          description="Minor Basilica of San Lorenzo Ruiz. Free to enter."),
    place("DEV-0008", "Ongpin Dumpling House", "restaurant", 14.6010, 120.9765, "Binondo",
          price=(150, 300), small=True, stay=45, opening=hours("09:00-21:00"),
          tags=["dumplings", "chinese", "street food"],
          description="Dumplings and siopao in Chinatown (made-up sample)."),
    place("DEV-0009", "Binondo Fresh Market", "market", 14.6018, 120.9758, "Binondo",
          price=(50, 200), small=True, stay=40, opening=hours("05:00-15:00"),
          tags=["market", "fruit", "street food"],
          description="Wet market with fruit and snack stalls (made-up sample)."),
    place("DEV-0010", "Escolta Bakery", "restaurant", 14.5975, 120.9785, "Binondo",
          price=(60, 180), small=True, stay=25, opening=hours("07:00-18:00"),
          tags=["bakery", "dessert"],
          description="Pandesal and ensaymada (made-up sample)."),
]
