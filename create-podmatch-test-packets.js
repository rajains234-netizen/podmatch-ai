const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const root = path.join(process.cwd(), "test-packets");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writePdf(filePath, title, lines) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();

  for (const line of lines) {
    doc.fontSize(11).text(line);
    doc.moveDown(0.35);
  }

  doc.end();
}

function makeGoodPacket() {
  const dir = path.join(root, "01-good-ready-to-bill-multiple-invoices");
  ensureDir(dir);

  writePdf(path.join(dir, "01_rate_confirmation_PM-GOOD-1001.pdf"), "Carrier Rate Confirmation", [
    "Load Number: PM-GOOD-1001",
    "Carrier Rate Confirmation",
    "Carrier Pay Summary",
    "Line Haul: USD 3,500.00",
    "Fuel Surcharge: USD 350.00",
    "Lumper Reimbursement: USD 200.00",
    "Detention Approved: USD 150.00",
    "Total Rate: USD 4,200.00",
    "Agreed rate approved by broker and carrier.",
  ]);

  writePdf(path.join(dir, "02_invoice_main_PM-GOOD-1001.pdf"), "Carrier Invoice", [
    "Invoice Number: INV-GOOD-1001-A",
    "Load Number: PM-GOOD-1001",
    "Bill To: Good Broker LLC",
    "Line Haul: USD 3,500.00",
    "Fuel Surcharge: USD 350.00",
    "Lumper: USD 200.00",
    "Detention: USD 150.00",
    "Invoice Total: USD 4,200.00",
    "Amount Due: USD 4,200.00",
  ]);

  writePdf(path.join(dir, "03_invoice_customer_copy_PM-GOOD-1001.pdf"), "Customer Invoice Copy", [
    "Invoice Number: INV-GOOD-1001-COPY",
    "Load Number: PM-GOOD-1001",
    "Customer copy of submitted invoice.",
    "Invoice Total: USD 4,200.00",
    "Total Due: USD 4,200.00",
  ]);

  writePdf(path.join(dir, "04_signed_pod_PM-GOOD-1001.pdf"), "Proof of Delivery", [
    "Load Number: PM-GOOD-1001",
    "Proof of Delivery",
    "Delivered to consignee on scheduled date.",
    "Received by: Maria Lopez",
    "Signature: Maria Lopez",
    "Signed by consignee at delivery.",
  ]);

  writePdf(path.join(dir, "05_lumper_receipt_PM-GOOD-1001.pdf"), "Lumper Receipt", [
    "Load Number: PM-GOOD-1001",
    "Lumper Receipt",
    "Warehouse unloading fee approved.",
    "Lumper Amount: USD 200.00",
    "Paid by carrier, reimbursable by broker.",
  ]);

  writePdf(path.join(dir, "06_detention_approval_PM-GOOD-1001.pdf"), "Detention Approval", [
    "Load Number: PM-GOOD-1001",
    "Detention Evidence and Broker Approval",
    "Appointment Time: 08:00",
    "Arrival Time: 07:45",
    "Departure Time: 12:15",
    "Waiting Time: 4.5 hours",
    "Detention Pay Approved: USD 150.00",
  ]);
}

function makeBadPacket() {
  const dir = path.join(root, "02-bad-blocked-multiple-invoices");
  ensureDir(dir);

  writePdf(path.join(dir, "01_rate_confirmation_PM-BAD-2002.pdf"), "Carrier Rate Confirmation", [
    "Load Number: PM-BAD-2002",
    "Carrier Rate Confirmation",
    "Carrier Pay Summary",
    "Line Haul: USD 3,100.00",
    "Fuel Surcharge: USD 500.00",
    "Total Rate: USD 3,600.00",
    "No lumper or detention approval listed on this rate confirmation.",
  ]);

  writePdf(path.join(dir, "02_invoice_main_PM-BAD-2002.pdf"), "Carrier Invoice", [
    "Invoice Number: INV-BAD-2002-A",
    "Load Number: PM-BAD-2002",
    "Bill To: Risky Broker LLC",
    "Line Haul: USD 3,100.00",
    "Fuel Surcharge: USD 500.00",
    "Lumper: USD 250.00",
    "Detention: USD 300.00",
    "Invoice Total: USD 4,150.00",
    "Amount Due: USD 4,150.00",
  ]);

  writePdf(path.join(dir, "03_invoice_accessorial_PM-BAD-2002.pdf"), "Accessorial Invoice", [
    "Invoice Number: INV-BAD-2002-B",
    "Load Number: PM-BAD-2002",
    "Supplemental accessorial invoice.",
    "Lumper: USD 250.00",
    "Detention: USD 300.00",
    "Invoice Total: USD 550.00",
    "Total Due: USD 550.00",
    "No receipt attached. No detention approval attached.",
  ]);

  writePdf(path.join(dir, "04_delivery_note_unsigned_PM-BAD-2002.pdf"), "Delivery Note - Unsigned", [
    "Load Number: PM-BAD-2002",
    "Delivery note created by dispatcher.",
    "Delivered status not confirmed by consignee signature.",
    "No signed proof of delivery present.",
    "Signature: missing",
  ]);
}

ensureDir(root);
makeGoodPacket();
makeBadPacket();

console.log("Created test packets in:");
console.log(root);
console.log("\nUpload packet 01 first. It should be ready or near-ready.");
console.log("Upload packet 02 second. It should be blocked with revenue at risk.");
