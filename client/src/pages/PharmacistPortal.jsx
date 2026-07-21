import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ClipboardList, Pill, CheckCircle, ShieldAlert, Plus, ShieldCheck, ShoppingCart } from "lucide-react";

export default function PharmacistPortal() {
  const { authFetch } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Stock addition form state
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [itemName, setItemName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [reorderThreshold, setReorderThreshold] = useState(15);
  const [supplierId, setSupplierId] = useState("");

  const [loadingRx, setLoadingRx] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoadingRx(true);
      setLoadingInv(true);

      // Load pending prescriptions
      const rxRes = await authFetch("/api/clinical/prescriptions?status=Pending");
      const rxData = await rxRes.json();
      if (rxRes.ok && rxData.success) {
        setPrescriptions(rxData.prescriptions);
      }

      // Load inventory
      const invRes = await authFetch("/api/inventory/items");
      const invData = await invRes.json();
      if (invRes.ok && invData.success) {
        setInventory(invData.items);
      }

      // Load suppliers
      const supRes = await authFetch("/api/inventory/suppliers");
      const supData = await supRes.json();
      if (supRes.ok && supData.success) {
        setSuppliers(supData.suppliers);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRx(false);
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispense = async (prescriptionId, patientName) => {
    setError("");
    setSuccess("");
    
    try {
      const res = await authFetch(`/api/inventory/prescriptions/${prescriptionId}/dispense`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        let msg = `Prescription dispensed successfully for ${patientName}.`;
        if (data.alerts && data.alerts.length > 0) {
          msg += ` WARNING: ${data.alerts.join(", ")}`;
        }
        setSuccess(msg);
        loadData();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(data.message || "Failed to dispense prescription");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!itemName || !batchNumber || !expiryDate || quantity === undefined) {
      setError("Please fill in name, batch number, expiry date, and quantity.");
      return;
    }

    try {
      const res = await authFetch("/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          name: itemName,
          batchNumber,
          expiryDate,
          quantityInStock: Number(quantity),
          reorderThreshold: Number(reorderThreshold),
          supplierId: supplierId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Successfully added stock for: ${itemName}`);
        setItemName("");
        setBatchNumber("");
        setExpiryDate("");
        setQuantity(100);
        setSupplierId("");
        loadData();
        
        setTimeout(() => {
          setShowRestockModal(false);
          setSuccess("");
        }, 2000);
      } else {
        setError(data.message || "Failed to add inventory stock");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="pharmacist-page">
      <div className="page-header-row">
        <div>
          <h1>Pharmacy Operations Desk</h1>
          <p className="subtitle">Dispense doctor prescriptions and manage medicine inventory counts</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowRestockModal(true)}>
          <Plus size={18} style={{ marginRight: "6px" }} /> Restock Inventory
        </button>
      </div>

      {success && <div className="alert alert-success mb-4">{success}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="pharmacist-split">
        {/* Pending Prescriptions */}
        <div className="card rx-queue-card">
          <div className="card-header">
            <div className="card-title">
              <ClipboardList className="icon-purple" size={20} /> Pending Dispensation Queue
            </div>
          </div>
          <div className="card-body scroll-panel">
            {loadingRx ? (
              <div className="page-loading">
                <span className="spinner" /> Loading queues...
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="idle-state">
                <p>No pending prescriptions in dispenser queue.</p>
              </div>
            ) : (
              <div className="prescriptions-list">
                {prescriptions.map((rx) => (
                  <div key={rx._id} className="rx-list-item mb-4 card bg-surface-2 p-4">
                    <div className="flex justify-between items-center border-b border-white-08 pb-2">
                      <div>
                        <strong>Patient: {rx.patientId?.name}</strong>
                        <div style={{ fontSize: "11px", opacity: 0.7 }}>
                          ID: {rx.patientId?.patientId} | Issued by: {rx.doctorId?.name}
                        </div>
                      </div>
                      <button
                        className="btn btn-success flex items-center"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        onClick={() => handleDispense(rx._id, rx.patientId?.name)}
                      >
                        <ShoppingCart size={14} style={{ marginRight: "4px" }} /> Dispense
                      </button>
                    </div>
                    
                    <div className="mt-3">
                      <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>
                        <strong>Diagnosis:</strong> {rx.consultationId?.diagnosis || "Not specified"}
                      </div>
                      <table className="table mt-2 bg-darker-table">
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rx.medicines.map((m, idx) => (
                            <tr key={idx}>
                              <td><strong>{m.name}</strong></td>
                              <td>{m.dosage}</td>
                              <td><span className="pill pill-info">{m.frequency}</span></td>
                              <td>{m.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Stock Tracker */}
        <div className="card stock-card">
          <div className="card-header">
            <div className="card-title">
              <Pill className="icon-purple" size={20} /> Medicine Catalog & Stock levels
            </div>
          </div>
          <div className="card-body scroll-panel">
            {loadingInv ? (
              <div className="page-loading">
                <span className="spinner" /> Loading stock...
              </div>
            ) : inventory.length === 0 ? (
              <div className="idle-state">
                <p>No inventory records logged.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Medicine Name</th>
                    <th>Batch</th>
                    <th>Stock level</th>
                    <th>Expiry Date</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isLow = item.quantityInStock <= item.reorderThreshold;
                    const isExpired = new Date(item.expiryDate) < new Date();
                    return (
                      <tr key={item._id}>
                        <td><strong className="text-purple">{item.itemId}</strong></td>
                        <td><strong>{item.name}</strong></td>
                        <td><code>{item.batchNumber}</code></td>
                        <td>
                          <span className={`badge ${isLow ? "badge-red" : "badge-success"}`}>
                            {item.quantityInStock} Units
                          </span>
                          {isLow && (
                            <div style={{ fontSize: "9px", color: "var(--color-error)", marginTop: "2px" }}>
                              Low (reorder: {item.reorderThreshold})
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={isExpired ? "text-error" : ""}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                          {isExpired && (
                            <div style={{ fontSize: "9px", color: "var(--color-error)", marginTop: "2px" }}>
                              Expired!
                            </div>
                          )}
                        </td>
                        <td>{item.supplierId?.name || "Generic supplier"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Restocking Modal */}
      {showRestockModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-2xl">
            <div className="modal-header">
              <h2>Add Medicine Stock</h2>
              <button className="modal-close-btn" onClick={() => setShowRestockModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger mb-4 flex items-center">
                  <ShieldAlert size={16} style={{ marginRight: "8px" }} /> {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success mb-4 flex items-center">
                  <CheckCircle size={16} style={{ marginRight: "8px" }} /> {success}
                </div>
              )}

              <form onSubmit={handleRestockSubmit} className="grid-form">
                <div className="form-group span-2">
                  <label>Medicine / Supply Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin 500mg, Panadol Syrup"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Batch Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-992-A"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity to Restock *</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reorder Alert Threshold *</label>
                  <input
                    type="number"
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group span-2">
                  <label>Supplier Account</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">-- Choose Registered Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.contactInfo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="span-2 flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-muted" onClick={() => setShowRestockModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Inventory stock</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
