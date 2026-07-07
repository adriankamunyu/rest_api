from flask import Flask, jsonify, request, make_response
import requests

app = Flask(__name__)

OFF_BASE_URL = "https://world.openfoodfacts.org/api/v2"


INVENTORY = [
    {
        "id": 1,
        "barcode": "3017620422003",
        "product_name": "Nutella",
        "brands": "Ferrero",
        "ingredients_text": "Sugar, palm oil, hazelnuts, cocoa...",
        "category": "spreads",
        "price": 4.99,
        "stock": 40
    },
    {
        "id": 2,
        "barcode": "0016000275287",
        "product_name": "Organic Almond Milk",
        "brands": "Silk",
        "ingredients_text": "Filtered water, almonds, cane sugar...",
        "category": "beverages",
        "price": 3.49,
        "stock": 25
    },
    {
        "id": 3,
        "barcode": "5000159484695",
        "product_name": "Snickers Bar",
        "brands": "Mars",
        "ingredients_text": "Milk chocolate, peanuts, corn syrup...",
        "category": "snacks",
        "price": 1.29,
        "stock": 100
    }
]

next_id = 4


def find_item(item_id):
    return next((item for item in INVENTORY if item["id"] == item_id), None)


def fetch_off_product(barcode):
    """Query OpenFoodFacts by barcode, return dict or None."""
    try:
        resp = requests.get(f"{OFF_BASE_URL}/product/{barcode}.json", timeout=5)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == 1:
            return data.get("product")
        return None
    except requests.RequestException:
        return None


def search_off_products(name, page_size=5):
    """Search OpenFoodFacts by product name, return list of products."""
    try:
        resp = requests.get(
            "https://world.openfoodfacts.org/cgi/search.pl",
            params={
                "search_terms": name,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": page_size
            },
            timeout=5
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("products", [])
    except requests.RequestException:
        return []


@app.route("/inventory", methods=["GET"])
def get_inventory():
    return jsonify(INVENTORY), 200


@app.route("/inventory/<int:item_id>", methods=["GET"])
def get_item(item_id):
    item = find_item(item_id)
    if item is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item), 200


@app.route("/inventory", methods=["POST"])
def create_item():
    global next_id
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    barcode = data.get("barcode")
    off_product = None
    if barcode:
        off_product = fetch_off_product(barcode)

    new_item = {
        "id": next_id,
        "barcode": barcode,
        "product_name": data.get("product_name") or (off_product.get("product_name") if off_product else None),
        "brands": data.get("brands") or (off_product.get("brands") if off_product else None),
        "ingredients_text": data.get("ingredients_text") or (off_product.get("ingredients_text") if off_product else None),
        "category": data.get("category", "uncategorized"),
        "price": data.get("price", 0.0),
        "stock": data.get("stock", 0)
    }

    if not new_item["product_name"]:
        return jsonify({"error": "product_name is required (directly or via valid barcode)"}), 400

    INVENTORY.append(new_item)
    next_id += 1
    return jsonify(new_item), 201


@app.route("/inventory/<int:item_id>", methods=["PATCH"])
def update_item(item_id):
    item = find_item(item_id)
    if item is None:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    for field in ["product_name", "brands", "ingredients_text", "category", "price", "stock", "barcode"]:
        if field in data:
            item[field] = data[field]

    return jsonify(item), 200


@app.route("/inventory/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    item = find_item(item_id)
    if item is None:
        return jsonify({"error": "Item not found"}), 404

    INVENTORY.remove(item)
    return make_response("", 204)


@app.route("/lookup/barcode/<barcode>", methods=["GET"])
def lookup_barcode(barcode):
    product = fetch_off_product(barcode)
    if product is None:
        return jsonify({"error": "Product not found on OpenFoodFacts"}), 404
    return jsonify(product), 200


@app.route("/lookup/search", methods=["GET"])
def lookup_search():
    name = request.args.get("name")
    if not name:
        return jsonify({"error": "Query param 'name' is required"}), 400
    products = search_off_products(name)
    return jsonify(products), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)