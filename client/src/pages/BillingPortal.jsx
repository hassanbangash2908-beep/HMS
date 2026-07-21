import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Receipt, Search, Plus, Printer, CheckCircle, ShieldAlert, CreditCard, X } from "lucide-react";

export default function BillingPortal() {
  const { authFetch } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Search patient filter
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Invoice generator state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [itemizedCharges, setItemizedCharges] = useState([{ item: "Consultation Fee", amount: 1500 }]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

  // Payment/Detail state
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInvoices = async () => {
    try {
      setLoadingList(true);
      const res = await authFetch("/api/billing");
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Search Patients
  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientSearch) return;
    try {
      const res = await authFetch(`/api/patients?search=${encodeURIComponent(patientSearch)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPatients(data.patients);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Item to charges list
  const handleAddChargeItem = (e) => {
    e.preventDefault();
    if (!newItemName || !newItemAmount) return;
    setItemizedCharges([
      ...itemizedCharges,
      { item: newItemName, amount: Number(newItemAmount) },
    ]);
    setNewItemName("");
    setNewItemAmount("");
  };

  const handleRemoveChargeItem = (idx) => {
    setItemizedCharges(itemizedCharges.filter((_, i) => i !== idx));
  };

  // Submit Invoice Creation
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedPatient) {
      setError("Please search and select a patient first.");
      return;
    }
    if (itemizedCharges.length === 0) {
      setError("Please add at least one charge item.");
      return;
    }

    try {
      const res = await authFetch("/api/billing", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient._id,
          itemizedCharges,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Invoice compiled and generated successfully!");
        setSelectedPatient(null);
        setItemizedCharges([{ item: "Consultation Fee", amount: 1500 }]);
        setPatientSearch("");
        setPatients([]);
        loadInvoices();
        
        setTimeout(() => {
          setShowCreateModal(false);
          setSuccess("");
        }, 2000);
      } else {
        setError(data.message || "Failed to create invoice");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  // Complete Payment Transaction
  const handleProcessPayment = async () => {
    if (!activeInvoice) return;
    setError("");
    setSuccess("");

    try {
      const res = await authFetch(`/api/billing/${activeInvoice._id}/pay`, {
        method: "PUT",
        body: JSON.stringify({ paymentMethod }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Collected payment for Invoice ${activeInvoice.invoiceId}`);
        loadInvoices();
        setActiveInvoice(null);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Failed to process payment");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  // Process Credit Note Refund
  const handleIssueCreditNote = async () => {
    if (!activeInvoice) return;
    setError("");
    setSuccess("");

    const reason = window.prompt(`Enter refund reason for reversing Invoice ${activeInvoice.invoiceId}:`);
    if (reason === null) return;

    try {
      const res = await authFetch(`/api/billing/${activeInvoice._id}/credit-note`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Reversed invoice ${activeInvoice.invoiceId}. Credit note generated: ${data.creditNote.invoiceId}`);
        loadInvoices();
        setActiveInvoice(null);
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(data.message || "Failed to issue credit note");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  // Browser Print trigger
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="billing-page">
      <div className="page-header-row hide-print">
        <div>
          <h1>Billing & Invoicing Portal</h1>
          <p className="subtitle">Compile service charges, process cash/card collections, and issue reversals</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} style={{ marginRight: "6px" }} /> Compile New Bill
        </button>
      </div>

      {success && <div className="alert alert-success mb-4 hide-print">{success}</div>}
      {error && <div className="alert alert-danger mb-4 hide-print">{error}</div>}

      <div className="billing-split mt-2">
        {/* Invoices List Panel */}
        <div className="card list-card hide-print">
          <div className="card-header">
            <div className="card-title">
              <Receipt className="icon-purple" size={20} /> Transaction Ledger
            </div>
          </div>
          <div className="card-body scroll-panel">
            {loadingList ? (
              <div className="page-loading">
                <span className="spinner" /> Loading transactions...
              </div>
            ) : invoices.length === 0 ? (
              <div className="idle-state">
                <p>No billing invoices generated.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Patient Name</th>
                    <th>Subtotal</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td>
                        <strong className="text-purple">{inv.invoiceId}</strong>
                        {inv.isCreditNote && (
                          <div style={{ fontSize: "9px", color: "var(--color-primary-light)" }}>
                            CREDIT NOTE (ref: {inv.linkedOriginalInvoiceId})
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{inv.patientId?.name || "Generic patient"}</strong>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>ID: {inv.patientId?.patientId}</div>
                      </td>
                      <td>
                        <strong className={inv.isCreditNote ? "text-error" : ""}>
                          Rs. {inv.totalAmount}
                        </strong>
                      </td>
                      <td><span className="pill pill-info">{inv.paymentMethod}</span></td>
                      <td>
                        <span className={`badge ${
                          inv.status === "Paid" ? "badge-success" :
                          inv.status === "Unpaid" ? "badge-red" :
                          "badge-purple"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "11px" }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => setActiveInvoice(inv)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detailed Receipt Panel (Printable) */}
        {activeInvoice && (
          <div className="card receipt-panel">
            <div className="card-header hide-print">
              <div className="card-title">
                <Printer className="icon-purple" size={20} /> Receipt Preview
              </div>
              <button className="btn btn-muted btn-sm" onClick={() => setActiveInvoice(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="card-body print-section">
              {/* Receipt Layout */}
              <div className="receipt-box-layout">
                <div className="receipt-header">
                  <h3>SUBHAN CARE CLINICS</h3>
                  <p>Royal Avenue, Islamabad, Pakistan</p>
                  <p>Phone: +92 318 9883239</p>
                  <div className="receipt-divider" />
                </div>
                
                <div className="receipt-meta">
                  <div><strong>Invoice Code:</strong> {activeInvoice.invoiceId}</div>
                  <div><strong>Date:</strong> {new Date(activeInvoice.createdAt).toLocaleString()}</div>
                  <div><strong>Patient:</strong> {activeInvoice.patientId?.name} ({activeInvoice.patientId?.patientId})</div>
                  <div><strong>Cashier:</strong> {activeInvoice.issuedBy?.username || "System"}</div>
                  {activeInvoice.isCreditNote && (
                    <div className="text-red-400 mt-1">
                      <strong>REVERSAL NOTE:</strong> Reverses original bill reference: {activeInvoice.linkedOriginalInvoiceId}
                    </div>
                  )}
                </div>

                <table className="receipt-table mt-4">
                  <thead>
                    <tr>
                      <th>Service/Item Name</th>
                      <th style={{ textAlign: "right" }}>Fee (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.itemizedCharges.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.item}</td>
                        <td style={{ textAlign: "right" }}>Rs. {item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>NET PAYABLE DUE:</strong></td>
                      <td style={{ textAlign: "right" }}>
                        <strong>Rs. {activeInvoice.totalAmount}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="receipt-footer mt-4">
                  <p>Payment Mode: {activeInvoice.paymentMethod}</p>
                  <p>Billing Status: {activeInvoice.status.toUpperCase()}</p>
                  <p className="mt-4" style={{ fontSize: "10px", opacity: 0.8 }}>Thank you for choosing Subhan Care!</p>
                </div>
              </div>

              {/* Action Operations */}
              <div className="flex gap-2 justify-end mt-6 hide-print">
                <button className="btn btn-secondary flex items-center" onClick={handlePrintReceipt}>
                  <Printer size={16} style={{ marginRight: "4px" }} /> Print Invoice
                </button>

                {activeInvoice.status === "Unpaid" && (
                  <div className="flex items-center gap-1 border border-white-08 p-1 rounded bg-surface">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ padding: "4px", fontSize: "12px", background: "none", border: "none" }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                    <button className="btn btn-success" style={{ padding: "6px 12px" }} onClick={handleProcessPayment}>
                      Pay Now
                    </button>
                  </div>
                )}

                {activeInvoice.status === "Paid" && !activeInvoice.isCreditNote && (
                  <button className="btn btn-danger" onClick={handleIssueCreditNote}>
                    Issue Credit Note (Refund)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bill Compilation Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-xl">
            <div className="modal-header">
              <h2>Compile Service invoice</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-danger mb-4">{error}</div>}
              {success && <div className="alert alert-success mb-4">{success}</div>}

              {/* Patient Selection Selector */}
              <div className="booking-section-block">
                <label>1. Select Patient</label>
                {selectedPatient ? (
                  <div className="selected-patient-card mt-2">
                    <div className="patient-name-box">
                      <strong>{selectedPatient.name}</strong>
                      <span>{selectedPatient.patientId}</span>
                    </div>
                    <button className="btn btn-muted btn-sm" onClick={() => setSelectedPatient(null)}>Change</button>
                  </div>
                ) : (
                  <form onSubmit={handlePatientSearch} className="patient-search-subform mt-2">
                    <div className="input-with-icon flex-1">
                      <Search className="input-icon" size={16} />
                      <input
                        type="text"
                        placeholder="Search patient name, CNIC..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-secondary">Find</button>
                  </form>
                )}

                {!selectedPatient && patients.length > 0 && (
                  <div className="search-results-list mt-2">
                    {patients.map((p) => (
                      <div
                        key={p._id}
                        className="search-result-item"
                        onClick={() => setSelectedPatient(p)}
                      >
                        <strong>{p.name}</strong> ({p.patientId}) - CNIC: {p.cnic}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add itemized charges */}
              <div className="booking-section-block mt-4">
                <label>2. Compile Itemized Charges</label>
                
                <form onSubmit={handleAddChargeItem} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Charge Item (e.g. ECG Test, Lab fee)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Fee (Rs.)"
                    style={{ width: "100px" }}
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary">
                    Add
                  </button>
                </form>

                <div className="charges-items-list mt-3">
                  <table className="table bg-darker-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemizedCharges.map((charge, idx) => (
                        <tr key={idx}>
                          <td>{charge.item}</td>
                          <td style={{ textAlign: "right" }}>Rs. {charge.amount}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: "4px 8px", fontSize: "10px" }}
                              onClick={() => handleRemoveChargeItem(idx)}
                              disabled={charge.item === "Consultation Fee"}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Gross Sum:</strong></td>
                        <td style={{ textAlign: "right" }}>
                          <strong>
                            Rs. {itemizedCharges.reduce((sum, c) => sum + Number(c.amount), 0)}
                          </strong>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-muted" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateInvoiceSubmit}
                  disabled={!selectedPatient}
                >
                  Generate invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
