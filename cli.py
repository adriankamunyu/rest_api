import requests

BASE_URL = "http://localhost:5000"


def view_all():
    resp = requests.get(f"{BASE_URL}/inventory")
    items = resp.json()
    if not items:
        print("Inventory is empty.")
        return
    for item in items:
        print(f"[{item['id']}] {item['product_name']} ({item['brands']}) - ${item['price']} | stock: {item['stock']}")


def view_one():
    item_id = input("Enter item ID: ").strip()
    if not item_id.isdigit():
        print("Invalid ID.")
        return
    resp = requests.get(f"{BASE_URL}/inventory/{item_id}")
    if resp.status_code == 404:
        print("Item not found.")
        return
    for key, value in resp.json().items():
        print(f"{key}: {value}")


def add_item():
    print("Add item — leave barcode blank to enter details manually.")
    barcode = input("Barcode (optional): ").strip() or None
    payload = {"barcode": barcode}

    if not barcode:
        payload["product_name"] = input("Product name: ").strip()
        payload["brands"] = input("Brand: ").strip()

    try:
        payload["price"] = float(input("Price: ").strip() or 0)
        payload["stock"] = int(input("Stock: ").strip() or 0)
    except ValueError:
        print("Price/stock must be numbers.")
        return

    payload["category"] = input("Category: ").strip() or "uncategorized"

    resp = requests.post(f"{BASE_URL}/inventory", json=payload)
    if resp.status_code == 201:
        print("Item added:", resp.json())
    else:
        print("Error:", resp.json().get("error"))


def update_item():
    item_id = input("Enter item ID to update: ").strip()
    if not item_id.isdigit():
        print("Invalid ID.")
        return

    print("Leave blank to skip a field.")
    price = input("New price: ").strip()
    stock = input("New stock: ").strip()

    payload = {}
    try:
        if price:
            payload["price"] = float(price)
        if stock:
            payload["stock"] = int(stock)
    except ValueError:
        print("Price/stock must be numbers.")
        return

    if not payload:
        print("Nothing to update.")
        return

    resp = requests.patch(f"{BASE_URL}/inventory/{item_id}", json=payload)
    if resp.status_code == 200:
        print("Item updated:", resp.json())
    else:
        print("Error:", resp.json().get("error"))


def delete_item():
    item_id = input("Enter item ID to delete: ").strip()
    if not item_id.isdigit():
        print("Invalid ID.")
        return
    resp = requests.delete(f"{BASE_URL}/inventory/{item_id}")
    if resp.status_code == 204:
        print("Item deleted.")
    else:
        print("Error:", resp.json().get("error"))


def find_on_api():
    print("1. Search by barcode")
    print("2. Search by product name")
    choice = input("Choice: ").strip()

    if choice == "1":
        barcode = input("Barcode: ").strip()
        resp = requests.get(f"{BASE_URL}/lookup/barcode/{barcode}")
        if resp.status_code == 200:
            product = resp.json()
            print(f"Name: {product.get('product_name')}")
            print(f"Brand: {product.get('brands')}")
            print(f"Ingredients: {product.get('ingredients_text')}")
        else:
            print("Not found.")
    elif choice == "2":
        name = input("Product name: ").strip()
        resp = requests.get(f"{BASE_URL}/lookup/search", params={"name": name})
        products = resp.json()
        if not products:
            print("No results.")
            return
        for p in products:
            print(f"- {p.get('product_name')} ({p.get('brands')}) barcode: {p.get('code')}")
    else:
        print("Invalid choice.")


def main():
    menu = """
1. View all inventory
2. View item details
3. Add new item
4. Update item price/stock
5. Delete item
6. Find item on OpenFoodFacts
0. Exit
"""
    while True:
        print(menu)
        choice = input("Choice: ").strip()
        if choice == "1":
            view_all()
        elif choice == "2":
            view_one()
        elif choice == "3":
            add_item()
        elif choice == "4":
            update_item()
        elif choice == "5":
            delete_item()
        elif choice == "6":
            find_on_api()
        elif choice == "0":
            break
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    main()