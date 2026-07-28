import jsPDF from "jspdf";

export interface ReceiptData {
  reference: string;
  ambassadorName: string;
  ambassadorEmail: string;
  amountNaira: number;
  avuEarned: number;
  date: string;
  fundingByName?: string;
  programSponsored?: string;
}

export function downloadDepositReceiptPDF(receipt: ReceiptData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 42, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ADVALTAD GLOBAL FELLOWSHIP", 15, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text("Official AVU Token Top-Up Transaction Receipt", 15, 26);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("African Youth Empowerment & Innovation Network", 15, 33);

  // Status Badge
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(142, 14, 53, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VERIFIED & CREDITED", 145, 22.5);

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 52, 195, 52);

  // Transaction Info Table
  doc.setFontSize(10);

  const rows = [
    ["Transaction Reference:", receipt.reference || "N/A"],
    ["Date & Time:", receipt.date || new Date().toLocaleString()],
    ["Ambassador Name:", receipt.ambassadorName || "Fellow Ambassador"],
    ["Ambassador Email:", receipt.ambassadorEmail || "N/A"],
    ["Funding / Sponsor:", receipt.fundingByName || "Direct Top-Up"],
    ["Program Sponsored:", receipt.programSponsored || "General AVU Allocation"],
    ["Payment Gateway:", "Paystack Secured Online Checkout"],
    ["Status:", "SUCCESS - CREDITED TO WALLET"]
  ];

  let currentY = 62;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, 15, currentY);

    doc.setFont("helvetica", "bold");
    if (label === "Status:") {
      doc.setTextColor(5, 150, 105); // emerald-600
    } else {
      doc.setTextColor(15, 23, 42); // slate-900
    }
    doc.text(value, 68, currentY);
    currentY += 8.5;
  });

  // Amount Summary Card Box
  const cardY = currentY + 4;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(15, cardY, 180, 48, 4, 4, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("Amount Paid (NGN):", 25, cardY + 16);
  doc.text("AVU Tokens Credited:", 25, cardY + 34);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`NGN ${(receipt.amountNaira || 0).toLocaleString()}`, 115, cardY + 16);

  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`+${(receipt.avuEarned || 0).toLocaleString()} AVU`, 115, cardY + 34);

  // Verification watermark / Stamp
  const footerY = cardY + 62;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, 195, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("This is an official computer-generated receipt issued by Advaltad Global Fellowship Ledger.", 15, footerY + 8);
  doc.text("For financial reconciliation or support, contact finance@advaltad.org.", 15, footerY + 14);

  // Trigger download
  const safeRef = (receipt.reference || "RECEIPT").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Advaltad_AVU_Receipt_${safeRef}.pdf`);
}
