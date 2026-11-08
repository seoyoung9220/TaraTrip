"""
가짜 장소 데이터 (나중에 백엔드가 DB에서 읽은 UST 리서치 데이터로 교체)

category는 엑셀 양식의 Category 컬럼과 같은 값: food / cafe / shopping / sightseeing / culture / other
description은 취향 맞춤 점수(임베딩)에 쓰는 영어 설명
  → 엑셀의 "Must-try / highlight" + "Notes"를 합쳐서 만들면 돼요
"""

START_LOCATION = [14.5915, 120.9737]  # 인트라무로스 Plaza Roma

places = [
    {"name": "Fort Santiago", "area": "Intramuros", "category": "sightseeing",
     "lat": 14.5951, "lng": 120.9706, "opens": "08:00", "closes": "22:00", "stayMin": 60, "costPhp": 75, "smallBiz": False, "score": 8,
     "description": "Spanish-era stone citadel with gardens, river views and history exhibits about Jose Rizal. Great spot for photos."},
    {"name": "San Agustin Church", "area": "Intramuros", "category": "culture",
     "lat": 14.5888, "lng": 120.9752, "opens": "08:00", "closes": "17:00", "stayMin": 45, "costPhp": 200, "smallBiz": False, "score": 7,
     "description": "Oldest stone church in the Philippines with baroque architecture and a museum of religious art. UNESCO heritage site."},
    {"name": "Manila Cathedral", "area": "Intramuros", "category": "culture",
     "lat": 14.5916, "lng": 120.9733, "opens": "07:00", "closes": "20:00", "stayMin": 20, "costPhp": 0, "smallBiz": False, "score": 5,
     "description": "Grand cathedral facing Plaza Roma with a quiet interior and stained glass windows."},
    {"name": "Casa Manila", "area": "Intramuros", "category": "culture",
     "lat": 14.5889, "lng": 120.9758, "opens": "09:00", "closes": "18:00", "stayMin": 40, "costPhp": 75, "smallBiz": False, "score": 5,
     "description": "Museum recreating a 19th-century Spanish colonial house with antique furniture and old Manila history."},
    {"name": "Binondo Church", "area": "Binondo", "category": "culture",
     "lat": 14.6000, "lng": 120.9744, "opens": "06:00", "closes": "20:00", "stayMin": 20, "costPhp": 0, "smallBiz": False, "score": 5,
     "description": "Historic church in Chinatown with an octagonal bell tower."},
    {"name": "비논도 만두 가게 (가상)", "area": "Binondo", "category": "food",
     "lat": 14.6008, "lng": 120.9750, "opens": "10:00", "closes": "21:00", "stayMin": 40, "costPhp": 250, "smallBiz": True, "score": 6,
     "description": "Small family-run dumpling shop in Chinatown serving pork siopao and fried dumplings. Cheap, filling local street food."},
    {"name": "에스콜타 로컬 카페 (가상)", "area": "Binondo", "category": "cafe",
     "lat": 14.5975, "lng": 120.9785, "opens": "09:00", "closes": "20:00", "stayMin": 45, "costPhp": 200, "smallBiz": True, "score": 5,
     "description": "Cozy locally owned coffee shop in an old Escolta building. Quiet place to rest with Philippine coffee beans and pastries."},
    {"name": "Quiapo Church", "area": "Quiapo", "category": "culture",
     "lat": 14.5988, "lng": 120.9837, "opens": "05:00", "closes": "21:00", "stayMin": 20, "costPhp": 0, "smallBiz": False, "score": 6,
     "description": "Busy basilica of the Black Nazarene surrounded by crowded street vendors."},
    {"name": "키아포 수공예 시장 (가상)", "area": "Quiapo", "category": "shopping",
     "lat": 14.5982, "lng": 120.9844, "opens": "09:00", "closes": "19:00", "stayMin": 40, "costPhp": 400, "smallBiz": True, "score": 5,
     "description": "Market stalls selling handwoven bags, rattan crafts and souvenirs made by local artisans."},
    {"name": "인트라무로스 할로할로 노점 (가상)", "area": "Intramuros", "category": "food",
     "lat": 14.5905, "lng": 120.9745, "opens": "11:00", "closes": "21:00", "stayMin": 25, "costPhp": 120, "smallBiz": True, "score": 5,
     "description": "Street stall selling halo-halo shaved ice dessert and local snacks. Perfect sweet treat on a hot day."},
]
