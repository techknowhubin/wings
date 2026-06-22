import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export async function generateInvoicePDF(booking: any) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(1, 50, 32); // #013220
  doc.text("XPLORWING", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Tax Invoice", 14, 30);
  doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 14, 35);
  doc.text(`Booking ID: ${booking.id || booking.booking_id}`, 14, 40);

  // Customer Details
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill To:", 14, 55);
  doc.setFontSize(10);
  doc.setTextColor(80);
  
  // Parse customer details if in notes
  let customerName = "Guest";
  let customerPhone = "";
  if (booking.notes) {
    try {
      const parsed = JSON.parse(booking.notes);
      if (parsed.primaryGuest) {
        customerName = parsed.primaryGuest.name || "Guest";
        customerPhone = parsed.primaryGuest.phone || "";
      }
    } catch { /* ignore */ }
  } else if (booking.traveller?.full_name) {
    customerName = booking.traveller.full_name;
    customerPhone = booking.traveller.phone || "";
  }

  doc.text(customerName, 14, 62);
  if (customerPhone) doc.text(`Phone: ${customerPhone}`, 14, 67);

  // Table Data
  const baseAmount = booking.base_amount ?? booking.total_price ?? booking.amount;
  const gstPercent = booking.gst_percentage ?? 0;
  const gstAmount = booking.gst_amount ?? 0;
  const totalAmount = baseAmount + gstAmount;

  const tableData = [
    [
      booking.listing_type || booking.cab_type || 'Booking',
      booking.start_date ? format(new Date(booking.start_date), 'dd MMM yyyy') : (booking.travel_date ? format(new Date(booking.travel_date), 'dd MMM yyyy') : '-'),
      `Rs. ${Number(baseAmount).toFixed(2)}`
    ]
  ];

  (doc as any).autoTable({
    startY: 80,
    head: [['Description', 'Date', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [1, 50, 32] },
    styles: { fontSize: 10 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 100;

  // Totals
  doc.text("Subtotal:", 140, finalY + 10);
  doc.text(`Rs. ${Number(baseAmount).toFixed(2)}`, 170, finalY + 10);
  
  doc.text(`GST (${gstPercent}%):`, 140, finalY + 17);
  doc.text(`Rs. ${Number(gstAmount).toFixed(2)}`, 170, finalY + 17);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Total:", 140, finalY + 27);
  doc.text(`Rs. ${Number(totalAmount).toFixed(2)}`, 170, finalY + 27);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("Thank you for choosing Xplorwing!", 105, 280, { align: 'center' });

  doc.save(`Invoice_${booking.id || booking.booking_id}.pdf`);
}
