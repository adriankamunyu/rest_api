import { useState, useEffect } from "react";

const BASE_URL = "http://localhost:5000";

export default function InventoryApp() {
  const [inventory, setInventory] = useState([]);
  const [view, setView] = useState("list"); // list | add | search
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchType, setSearchType] = useState("barcode");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [form, setForm] = useState({
    barcode: "",
    product_name: "",
    brands: "",
    category: "",
    price: "",
    stock: ""
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/inventory`);
      const data = await res.json();
      setInventory(data);
    } catch {
      setError("Failed to load inventory. Is the Flask server running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0
    };
    if (!payload.barcode) delete payload.barcode;

    try {
      const res = await fetch(`${BASE_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add item.");
        return;
      }
      setForm({ barcode: "", product_name: "", brands: "", category: "", price: "", stock: "" });
      setView("list");
      fetchInventory();
    } catch {
      setError("Request failed.");
    }
  }

  async function handleUpdate(id, updates) {
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update item.");
        return;
      }
      setSelectedItem(null);
      fetchInventory();
    } catch {
      setError("Request failed.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this item?")) return;
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/inventory/${id}`, { method: "DELETE" });
      if (res.status !== 204) {
        const data = await res.json();
        setError(data.error || "Failed to delete item.");
        return;
      }
      fetchInventory();
    } catch {
      setError("Request failed.");
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setSearchResults([]);
    try {
      if (searchType === "barcode") {
        const res = await fetch(`${BASE_URL}/lookup/barcode/${searchQuery}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Not found.");
          return;
        }
        setSearchResults([data]);
      } else {
        const res = await fetch(`${BASE_URL}/lookup/search?name=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      setError("Search failed.");
    }
  }

  const navBtn = (active) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
    }`;

  const inputClass =
    "w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Inventory Manager</h1>

        <nav className="flex gap-2 mb-6">
          <button className={navBtn(view === "list")} onClick={() => setView("list")}>
            View Inventory
          </button>
          <button className={navBtn(view === "add")} onClick={() => setView("add")}>
            Add Item
          </button>
          <button className={navBtn(view === "search")} onClick={() => setView("search")}>
            Find on OpenFoodFacts
          </button>
        </nav>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}
        {loading && <p className="text-slate-500 text-sm mb-4">Loading...</p>}

        {view === "list" && (
          <div className="space-y-3">
            {inventory.length === 0 && !loading && (
              <p className="text-slate-500 text-sm">No items in inventory.</p>
            )}
            {inventory.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{item.product_name}</h3>
                    <p className="text-sm text-slate-500">{item.brands}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 uppercase">
                    {item.category}
                  </span>
                </div>

                <div className="flex gap-4 mt-2 text-sm text-slate-600">
                  <span>${item.price}</span>
                  <span>Stock: {item.stock}</span>
                </div>

                {selectedItem === item.id ? (
                  <InlineEditForm
                    item={item}
                    onCancel={() => setSelectedItem(null)}
                    onSave={(updates) => handleUpdate(item.id, updates)}
                    inputClass={inputClass}
                  />
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setSelectedItem(item.id)}
                      className="text-sm px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-sm px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "add" && (
          <form
            onSubmit={handleAdd}
            className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Barcode (optional)
              </label>
              <input
                className={inputClass}
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product name
              </label>
              <input
                className={inputClass}
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
              <input
                className={inputClass}
                value={form.brands}
                onChange={(e) => setForm({ ...form, brands: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium hover:bg-slate-800"
            >
              Add Item
            </button>
          </form>
        )}

        {view === "search" && (
          <div>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="barcode">Barcode</option>
                <option value="name">Product Name</option>
              </select>
              <input
                className={`${inputClass} flex-1`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchType === "barcode" ? "e.g. 3017620422003" : "e.g. almond milk"}
              />
              <button
                type="submit"
                className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            <div className="space-y-3">
              {searchResults.map((p, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-slate-800">{p.product_name}</h3>
                  <p className="text-sm text-slate-500">{p.brands}</p>
                  {p.ingredients_text && (
                    <p className="text-sm text-slate-600 mt-2">{p.ingredients_text}</p>
                  )}
                  {p.code && (
                    <p className="text-xs text-slate-400 mt-2">Barcode: {p.code}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InlineEditForm({ item, onCancel, onSave, inputClass }) {
  const [price, setPrice] = useState(item.price);
  const [stock, setStock] = useState(item.stock);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ price: parseFloat(price), stock: parseInt(stock) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end mt-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Price</label>
        <input
          type="number"
          step="0.01"
          className={`${inputClass} w-24`}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Stock</label>
        <input
          type="number"
          className={`${inputClass} w-24`}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="text-sm px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm px-3 py-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
      >
        Cancel
      </button>
    </form>
  );
}