import json, os, random, uuid
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="static", static_url_path="")
DATA, UPLOADS = "data.json", "uploads"
os.makedirs(UPLOADS, exist_ok=True)

# Fixed categories users can pick. Add or remove names here.
# (Colours and other tags stay free-form.)
CATEGORIES = ["accessory", "top", "tshirt", "shirt", "bottom", "pants", "dress", "shoes"]

# OOTD slots -> which categories each slot may draw from.
# e.g. the "bottom" slot can roll pants or a dress; the "top" slot can roll a tshirt or a shirt.
SLOTS = {
    "accessory": ["accessory"],
    "top": ["top", "tshirt", "shirt"],
    "bottom": ["bottom", "pants", "dress"],
    "shoes": ["shoes"],
}


# Read the saved data (name + items) from data.json
def load():
    if os.path.exists(DATA):
        with open(DATA) as f:
            d = json.load(f)
    else:
        d = {"name": "", "items": []}
    d["categories"] = CATEGORIES   # always sent to the frontend, never stored
    d["slots"] = list(SLOTS)
    return d


# Write data back to data.json
def save(d):
    with open(DATA, "w") as f:
        json.dump({k: v for k, v in d.items() if k not in ("categories", "slots")}, f, indent=2)


# Turn "Black, Linen ," into ['black', 'linen'] (lowercase, no blanks, no repeats)
def clean(text):
    """'Black, Linen ,' -> ['black', 'linen']"""
    out = []
    for t in text.split(","):
        t = t.strip().lower()
        if t and t not in out:
            out.append(t)
    return out


# Open the website
@app.get("/")
def home():
    return app.send_static_file("index.html")


# Serve uploaded clothing photos
@app.get("/uploads/<path:f>")
def uploaded(f):
    return send_from_directory(UPLOADS, f)


# Send the frontend everything it needs: name + all items
@app.get("/api/state")
def state():
    return jsonify(load())


# Save the user's name (first-time setup)
@app.post("/api/name")
def set_name():
    d = load()
    d["name"] = request.json.get("name", "").strip()
    save(d)
    return jsonify(d)


# Add a piece: save the photo file, then store its details
@app.post("/api/items")
def add_item():
    photo = request.files.get("photo")
    if not photo:
        return jsonify(error="Please choose a photo."), 400
    if request.form.get("category", "").strip().lower() not in CATEGORIES:
        return jsonify(error="Please pick a category from the list."), 400
    filename = uuid.uuid4().hex + os.path.splitext(photo.filename)[1].lower()
    photo.save(os.path.join(UPLOADS, filename))
    d = load()
    d["items"].append({
        "id": uuid.uuid4().hex,
        "name": request.form.get("name", "").strip(),
        "category": request.form.get("category", "").strip().lower(),
        "tags": clean(request.form.get("tags", "")),
        "image": filename,
    })
    save(d)
    return jsonify(d)


# Edit a piece's name, category or tags
@app.put("/api/items/<id>")
def edit_item(id):
    d = load()
    for item in d["items"]:
        if item["id"] == id:
            item["name"] = request.json.get("name", "").strip()
            cat = request.json.get("category", "").strip().lower()
            if cat in CATEGORIES:   # ignore anything not in the fixed list
                item["category"] = cat
            item["tags"] = clean(request.json.get("tags", ""))
    save(d)
    return jsonify(d)


# Remove a piece and delete its photo file
@app.delete("/api/items/<id>")
def remove_item(id):
    d = load()
    for item in d["items"]:
        if item["id"] == id:
            path = os.path.join(UPLOADS, item["image"])
            if os.path.exists(path):
                os.remove(path)
    d["items"] = [i for i in d["items"] if i["id"] != id]
    save(d)
    return jsonify(d)


# OOTD gacha: pick one random piece per slot (hat / top / bottom)
@app.get("/api/ootd")
def ootd():
    """?slots=hat,bottom&color=black -> one random item per slot.
    A slot only draws from its own categories (see SLOTS), and `color` (optional) must be one of the item's tags."""
    items = load()["items"]
    color = request.args.get("color", "").strip().lower()
    picks = []
    for slot in request.args.get("slots", "").split(","):
        matches = [i for i in items
                   if i["category"] in SLOTS.get(slot, []) and (not color or color in i["tags"])]
        picks.append(random.choice(matches) if matches else None)
    return jsonify(picks)


# Start the local server
if __name__ == "__main__":
    app.run(debug=True)
