import {
  useState,
  useRef,
  useEffect,
} from "react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Tesseract from "tesseract.js";

function App() {
  const invoiceRef = useRef();

  // ----------------------------
  // STATES
  // ----------------------------

  const [invoiceNo, setInvoiceNo] =
    useState(442);

  const [customerName, setCustomerName] =
    useState("");

  const [date, setDate] =
    useState("");

  const [savedInvoices, setSavedInvoices] =
    useState([]);

  const [items, setItems] = useState([
    {
      description: "",
      qty: 1,
      rate: 0,
    },
  ]);

  // ----------------------------
  // LOAD SAVED INVOICES
  // ----------------------------

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    const invoices =
      JSON.parse(
        localStorage.getItem("invoices")
      ) || [];

    setSavedInvoices(invoices);
  };

  // ----------------------------
  // ADD ITEM
  // ----------------------------

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "",
        qty: 1,
        rate: 0,
      },
    ]);
  };

  // ----------------------------
  // UPDATE ITEM
  // ----------------------------

  const updateItem = (
    index,
    field,
    value
  ) => {
    const updated = [...items];

    updated[index][field] = value;

    setItems(updated);
  };

  // ----------------------------
  // TOTALS
  // ----------------------------

  const subtotal = items.reduce(
    (acc, item) => {
      return (
        acc + item.qty * item.rate
      );
    },
    0
  );

  const cgst = subtotal * 0.09;

  const sgst = subtotal * 0.09;

  const grandTotal =
    subtotal + cgst + sgst;

  // ----------------------------
  // PDF DOWNLOAD
  // ----------------------------

  const downloadPDF = async () => {
    const element = invoiceRef.current;

    const canvas =
      await html2canvas(element);

    const imgData =
      canvas.toDataURL("image/png");

    const pdf = new jsPDF(
      "p",
      "mm",
      "a4"
    );

    const pdfWidth =
      pdf.internal.pageSize.getWidth();

    const imgProps =
      pdf.getImageProperties(imgData);

    const pdfHeight =
      (imgProps.height * pdfWidth) /
      imgProps.width;

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      pdfWidth,
      pdfHeight
    );

    pdf.save(
      `Invoice-${invoiceNo}.pdf`
    );

    setInvoiceNo(invoiceNo + 1);
  };

  // ----------------------------
  // ADVANCED AI OCR PARSER
  // ----------------------------

  const parseBillText = (text) => {
    const lines = text.split("\n");

    let detectedItems = [];

    let detectedCustomer = "";

    lines.forEach((line) => {
      const clean = line.trim();

      if (!clean) return;

      // -----------------------
      // Detect Customer Name
      // -----------------------

      if (
        clean
          .toLowerCase()
          .includes("m/s") ||
        clean
          .toLowerCase()
          .includes("name")
      ) {
        detectedCustomer = clean
          .replace(/m\/s/i, "")
          .replace(/name/i, "")
          .trim();
      }

      // -----------------------
      // Detect Items
      // -----------------------

      const numbers =
        clean.match(/\d+/g);

      if (
        numbers &&
        numbers.length >= 2
      ) {
        const qty = parseInt(
          numbers[0]
        );

        const rate = parseInt(
          numbers[
            numbers.length - 1
          ]
        );

        let itemName = clean
          .replace(/\d+/g, "")
          .replace(
            /[^\w\s]/gi,
            ""
          )
          .trim();

        // Remove useless words

        const uselessWords = [
          "gst",
          "total",
          "invoice",
          "amount",
          "bill",
          "cgst",
          "sgst",
        ];

        uselessWords.forEach(
          (word) => {
            itemName =
              itemName.replace(
                new RegExp(
                  word,
                  "gi"
                ),
                ""
              );
          }
        );

        itemName =
          itemName.trim();

        if (
          itemName.length > 2 &&
          qty < 10000 &&
          rate < 100000
        ) {
          detectedItems.push({
            description:
              itemName,
            qty: qty || 1,
            rate: rate || 0,
          });
        }
      }
    });

    // Auto Fill Customer Name

    if (detectedCustomer) {
      setCustomerName(
        detectedCustomer
      );
    }

    return detectedItems;
  };

  // ----------------------------
  // OCR IMAGE UPLOAD
  // ----------------------------

  const handleImageUpload = async (
    e
  ) => {
    const file =
      e.target.files[0];

    if (!file) return;

    alert(
      "Reading Bill Image..."
    );

    const {
      data: { text },
    } =
      await Tesseract.recognize(
        file,
        "eng",
        {
          logger: (m) =>
            console.log(m),
        }
      );

    console.log(
      "OCR TEXT:"
    );
    console.log(text);

    const autoItems =
      parseBillText(text);

    if (autoItems.length > 0) {
      setItems(autoItems);

      alert(
        "Invoice Auto-Filled Successfully!"
      );
    } else {
      alert(
        "No items detected."
      );
    }
  };

  // ----------------------------
  // SAVE INVOICE
  // ----------------------------

  const saveInvoice = () => {
    const existingInvoices =
      JSON.parse(
        localStorage.getItem(
          "invoices"
        )
      ) || [];

    const newInvoice = {
      invoiceNo,
      customerName,
      date,
      items,
      subtotal,
      cgst,
      sgst,
      grandTotal,
    };

    existingInvoices.push(
      newInvoice
    );

    localStorage.setItem(
      "invoices",
      JSON.stringify(
        existingInvoices
      )
    );

    alert(
      "Invoice Saved Successfully!"
    );

    loadInvoices();
  };

  // ----------------------------
  // PRINT
  // ----------------------------

  const printInvoice = () => {
    window.print();
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#f0f0f0",
        minHeight: "100vh",
      }}
    >
      {/* OCR Upload */}

      <div
        style={{
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        <h2>
          Upload Handwritten Bill
        </h2>

        <input
          type="file"
          accept="image/*"
          onChange={
            handleImageUpload
          }
        />
      </div>

      {/* Invoice */}

      <div
        ref={invoiceRef}
        style={{
          background: "white",
          padding: "20px",
          maxWidth: "900px",
          margin: "auto",
          border:
            "2px solid black",
        }}
      >
        {/* Header */}

        <div
          style={{
            textAlign: "center",
          }}
        >
          <h1
            style={{ margin: 0 }}
          >
            OM TRADERS
          </h1>

          <p style={{ margin: 2 }}>
            Work Contractor,
            Building Material &
            General Order
            Supplier
          </p>

          <p style={{ margin: 2 }}>
            House No.-D,6 (A)
            J.K. Puram, Choti
            Mukhani, Haldwani
            (Nainital)
          </p>

          <p style={{ margin: 2 }}>
            GSTIN:
            05AIDPB2430L1ZR
          </p>

          <p style={{ margin: 2 }}>
            Mob: 9756174268,
            9410951428
          </p>
        </div>

        <hr />

        {/* Invoice Info */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            marginBottom: "20px",
          }}
        >
          <div>
            <b>Invoice No:</b>{" "}
            {invoiceNo}
          </div>

          <div>
            <b>Date:</b>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(
                  e.target.value
                )
              }
            />
          </div>
        </div>

        {/* Customer */}

        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <b>
            Customer Name:
          </b>

          <input
            type="text"
            placeholder="Enter Customer Name"
            value={
              customerName
            }
            onChange={(e) =>
              setCustomerName(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
            }}
          />
        </div>

        {/* Table */}

        <table
          border="1"
          cellPadding="10"
          cellSpacing="0"
          width="100%"
        >
          <thead>
            <tr>
              <th>No.</th>

              <th>
                Description
              </th>

              <th>Qty</th>

              <th>Rate</th>

              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {items.map(
              (item, index) => (
                <tr key={index}>
                  <td>
                    {index + 1}
                  </td>

                  <td>
                    <input
                      type="text"
                      value={
                        item.description
                      }
                      onChange={(e) =>
                        updateItem(
                          index,
                          "description",
                          e.target
                            .value
                        )
                      }
                      style={{
                        width:
                          "100%",
                      }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={
                        item.qty
                      }
                      onChange={(e) =>
                        updateItem(
                          index,
                          "qty",
                          Number(
                            e.target
                              .value
                          )
                        )
                      }
                      style={{
                        width:
                          "60px",
                      }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={
                        item.rate
                      }
                      onChange={(e) =>
                        updateItem(
                          index,
                          "rate",
                          Number(
                            e.target
                              .value
                          )
                        )
                      }
                      style={{
                        width:
                          "80px",
                      }}
                    />
                  </td>

                  <td>
                    ₹{" "}
                    {item.qty *
                      item.rate}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {/* Add Item */}

        <button
          onClick={addItem}
          style={{
            marginTop: "10px",
            padding: "10px",
          }}
        >
          + Add Item
        </button>

        {/* Totals */}

        <div
          style={{
            marginTop: "30px",
            width: "300px",
            marginLeft: "auto",
          }}
        >
          <table
            border="1"
            cellPadding="10"
            cellSpacing="0"
            width="100%"
          >
            <tbody>
              <tr>
                <td>
                  Subtotal
                </td>

                <td>
                  ₹{" "}
                  {subtotal.toFixed(
                    2
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  CGST (9%)
                </td>

                <td>
                  ₹{" "}
                  {cgst.toFixed(
                    2
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  SGST (9%)
                </td>

                <td>
                  ₹{" "}
                  {sgst.toFixed(
                    2
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  <b>
                    Grand Total
                  </b>
                </td>

                <td>
                  <b>
                    ₹{" "}
                    {grandTotal.toFixed(
                      2
                    )}
                  </b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature */}

        <div
          style={{
            marginTop: "80px",
            textAlign: "right",
          }}
        >
          <b>
            Authorised
            Signatory
          </b>
        </div>
      </div>

      {/* Buttons */}

      <div
        style={{
          marginTop: "20px",
          textAlign: "center",
        }}
      >
        <button
          onClick={
            saveInvoice
          }
          style={{
            padding:
              "15px 30px",
            fontSize: "18px",
            cursor: "pointer",
            marginRight:
              "20px",
          }}
        >
          Save Invoice
        </button>

        <button
          onClick={
            printInvoice
          }
          style={{
            padding:
              "15px 30px",
            fontSize: "18px",
            cursor: "pointer",
            marginRight:
              "20px",
          }}
        >
          Print Invoice
        </button>

        <button
          onClick={
            downloadPDF
          }
          style={{
            padding:
              "15px 30px",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          Download PDF
        </button>
      </div>

      {/* SAVED HISTORY */}

      <div
        style={{
          marginTop: "40px",
          background: "white",
          padding: "20px",
          maxWidth: "900px",
          marginInline: "auto",
          border:
            "2px solid black",
        }}
      >
        <h2>
          Saved Invoice
          History
        </h2>

        <table
          border="1"
          cellPadding="10"
          cellSpacing="0"
          width="100%"
        >
          <thead>
            <tr>
              <th>
                Invoice No
              </th>

              <th>
                Customer
              </th>

              <th>Date</th>

              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {savedInvoices.map(
              (
                invoice,
                index
              ) => (
                <tr key={index}>
                  <td>
                    {
                      invoice.invoiceNo
                    }
                  </td>

                  <td>
                    {
                      invoice.customerName
                    }
                  </td>

                  <td>
                    {invoice.date}
                  </td>

                  <td>
                    ₹{" "}
                    {invoice.grandTotal.toFixed(
                      2
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;