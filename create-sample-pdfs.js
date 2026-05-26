/* eslint-disable */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const outputDir = path.join(process.cwd(), "sample-pdfs");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const docs = [
  {
    file: "test-pod.pdf",
    title: "PROOF OF DELIVERY",
    lines: [
      "Load Number: PM-1001",
      "Carrier: PODMatch Test Carrier LLC",
      "Broker: Test Broker Logistics",
      "Pickup: Dallas, TX",
      "Delivery: Atlanta, GA",
      "Delivery Date: 05/24/2026",
      "Receiver Name: John Smith",
      "Receiver Signature: John Smith",
      "Freight delivered in good condition. No shortages or damages reported."
    ]
  },
  {
    file: "test-invoice.pdf",
    title: "FREIGHT INVOICE",
    lines: [
      "Invoice Number: INV-1001",
      "Load Number: PM-1001",
      "Carrier: PODMatch Test Carrier LLC",
      "Broker: Test Broker Logistics",
      "Linehaul: USD 2,000.00",
      "Fuel Surcharge: USD 150.00",
      "Total Due: USD 2,150.00",
      "Payment Terms: Net 30"
    ]
  },
  {
    file: "test-rate-confirmation.pdf",
    title: "RATE CONFIRMATION",
    lines: [
      "Load Number: PM-1001",
      "Broker: Test Broker Logistics",
      "Carrier: PODMatch Test Carrier LLC",
      "Pickup Location: Dallas, TX",
      "Delivery Location: Atlanta, GA",
      "Linehaul: USD 2,000.00",
      "Fuel Surcharge: USD 150.00",
      "Total Rate: USD 2,150.00"
    ]
  },
  {
    file: "test-bol.pdf",
    title: "BILL OF LADING",
    lines: [
      "BOL Number: BOL-1001",
      "Load Number: PM-1001",
      "Shipper: Dallas Distribution Center",
      "Consignee: ABC Warehouse",
      "Commodity: General freight",
      "Pieces: 24 pallets",
      "Weight: 18,500 lbs",
      "Driver Signature: Test Driver"
    ]
  },
  {
    file: "blocked-invoice.pdf",
    title: "FREIGHT INVOICE - BLOCKED TEST",
    lines: [
      "Invoice Number: INV-2001",
      "Load Number: PM-2001",
      "Carrier: PODMatch Test Carrier LLC",
      "Broker: Missing Docs Broker",
      "Linehaul: USD 1,800.00",
      "Lumper Charge: USD 250.00",
      "Detention: USD 150.00",
      "Total Due: USD 2,200.00"
    ]
  },
  {
    file: "lumper-invoice.pdf",
    title: "FREIGHT INVOICE - LUMPER TEST",
    lines: [
      "Invoice Number: INV-3001",
      "Load Number: PM-3001",
      "Carrier: PODMatch Test Carrier LLC",
      "Broker: Lumper Test Broker",
      "Linehaul: USD 2,000.00",
      "Lumper Charge: USD 250.00",
      "Total Due: USD 2,250.00"
    ]
  },
  {
    file: "lumper-pod.pdf",
    title: "PROOF OF DELIVERY - LUMPER TEST",
    lines: [
      "Load Number: PM-3001",
      "Receiver Name: Jane Receiver",
      "Receiver Signature: Jane Receiver",
      "Delivery Date: 05/24/2026",
      "Delivered in good condition."
    ]
  },
  {
    file: "lumper-rate-confirmation.pdf",
    title: "RATE CONFIRMATION - LUMPER TEST",
    lines: [
      "Load Number: PM-3001",
      "Broker: Lumper Test Broker",
      "Carrier: PODMatch Test Carrier LLC",
      "Linehaul: USD 2,000.00",
      "Approved Lumper: USD 250.00",
      "Total Rate: USD 2,250.00"
    ]
  },
  {
    file: "lumper-bol.pdf",
    title: "BILL OF LADING - LUMPER TEST",
    lines: [
      "BOL Number: BOL-3001",
      "Load Number: PM-3001",
      "Shipper: Test Shipper",
      "Consignee: Test Receiver",
      "Commodity: General freight",
      "Pieces: 18 pallets"
    ]
  },
  {
    file: "lumper-receipt.pdf",
    title: "LUMPER RECEIPT",
    lines: [
      "Load Number: PM-3001",
      "Warehouse: ABC Cold Storage",
      "Date: 05/24/2026",
      "Lumper Fee: USD 250.00",
      "Paid By: Driver",
      "Receipt Number: LMP-3001",
      "Authorized Signature: Warehouse Clerk"
    ]
  },
  {
    file: "detention-invoice.pdf",
    title: "FREIGHT INVOICE - DETENTION TEST",
    lines: [
      "Invoice Number: INV-4001",
      "Load Number: PM-4001",
      "Carrier: PODMatch Test Carrier LLC",
      "Broker: Detention Test Broker",
      "Linehaul: USD 1,900.00",
      "Detention: USD 150.00",
      "Total Due: USD 2,050.00"
    ]
  },
  {
    file: "detention-pod.pdf",
    title: "PROOF OF DELIVERY - DETENTION TEST",
    lines: [
      "Load Number: PM-4001",
      "Receiver Name: Dock Clerk",
      "Receiver Signature: Dock Clerk",
      "Delivery Date: 05/24/2026",
      "Delivery completed."
    ]
  },
  {
    file: "detention-rate-confirmation.pdf",
    title: "RATE CONFIRMATION - DETENTION TEST",
    lines: [
      "Load Number: PM-4001",
      "Broker: Detention Test Broker",
      "Carrier: PODMatch Test Carrier LLC",
      "Linehaul: USD 1,900.00",
      "Detention approved with backup.",
      "Total Rate: USD 2,050.00"
    ]
  },
  {
    file: "detention-bol.pdf",
    title: "BILL OF LADING - DETENTION TEST",
    lines: [
      "BOL Number: BOL-4001",
      "Load Number: PM-4001",
      "Shipper: Test Shipper",
      "Consignee: Test Receiver",
      "Commodity: General freight",
      "Pieces: 20 pallets"
    ]
  },
  {
    file: "detention-evidence.pdf",
    title: "DETENTION EVIDENCE",
    lines: [
      "Load Number: PM-4001",
      "Appointment Time: 8:00 AM",
      "Arrival Time: 7:45 AM",
      "Departure Time: 12:30 PM",
      "Total Detention Time Claimed: 3.5 hours",
      "Driver Notes: Receiver delayed unloading due to dock congestion.",
      "Broker Approval: Approved by dispatch@examplebroker.com"
    ]
  }
];

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPdf(title, lines) {
  const contentLines = [
    "BT",
    "/F1 20 Tf",
    "72 740 Td",
    `(${escapePdfText(title)}) Tj`,
    "0 -36 Td",
    "/F1 11 Tf",
    ...lines.flatMap((line) => [
      `(${escapePdfText(line)}) Tj`,
      "0 -18 Td"
    ]),
    "ET"
  ];

  const stream = contentLines.join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

for (const doc of docs) {
  const pdf = createPdf(doc.title, doc.lines);
  const filePath = path.join(outputDir, doc.file);
  fs.writeFileSync(filePath, pdf, "binary");
  console.log(`Created ${filePath}`);
}

console.log("");
console.log("All sample PDFs created in:");
console.log(outputDir);
