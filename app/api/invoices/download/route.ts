import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import pool from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    const forwardedHost = headersList.get("x-forwarded-host");
    const forwardedProto = headersList.get("x-forwarded-proto");
    const forwardedOrigin =
      forwardedProto && forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : "";

    const { searchParams } = new URL(request.url);
    const saleId = parseInt(searchParams.get("sale_id") || "");

    if (!saleId) {
      return NextResponse.json(
        { success: false, error: "sale_id parameter is required" },
        { status: 400 },
      );
    }

    // First, get the sale details to determine the source
    const [saleRows] = await pool.query(
      `
      SELECT
        s.*,
        CASE
          WHEN s.source = 'pos' OR s.notes LIKE 'Vente POS%' OR s.notes LIKE '%POS%'
          THEN 'pos'
          ELSE 'manual'
        END as computed_source
      FROM sales s
      WHERE s.id = ?
    `,
      [saleId],
    );

    if (!saleRows || saleRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sale not found" },
        { status: 404 },
      );
    }

    const sale = saleRows[0];
    const isPosSale = sale.computed_source === "pos";

    if (isPosSale) {
      // For POS/caisse sales, generate ticket format dynamically
      try {
        const { generateSimpleTicketHTML } = await import(
          "@/lib/simple-ticket-generator"
        );
        const { STOCK_SLUGS } = await import("@/lib/types");

        // Get sale details with items
        const saleResponse = await fetch(
          `${forwardedOrigin}/api/sales/${saleId}`,
        );
        const saleResult = await saleResponse.json();

        if (!saleResult.success) {
          throw new Error("Failed to fetch sale details");
        }

        const saleData = saleResult.data;

        // Attempt to enrich with return details (retour)
        let returnInfo: any = null;
        try {
          const [dbRows]: any = await pool.query(`SELECT DATABASE() AS db`);
          const dbName =
            Array.isArray(dbRows) && dbRows[0]?.db ? dbRows[0].db : "stock";
          // Check if returns tables exist
          const [rtExistsRows]: any = await pool.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_transactions'`,
            [dbName],
          );
          const [riExistsRows]: any = await pool.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_items'`,
            [dbName],
          );
          const hasRT =
            Array.isArray(rtExistsRows) && (rtExistsRows[0]?.cnt || 0) > 0;
          const hasRI =
            Array.isArray(riExistsRows) && (riExistsRows[0]?.cnt || 0) > 0;

          if (hasRT && hasRI) {
            const [itemsRows]: any = await pool.query(
              `SELECT ri.quantity, ri.unit_price, ri.action_type, p.name AS product_name
               FROM return_items ri
               INNER JOIN return_transactions rt ON ri.return_transaction_id = rt.id
               LEFT JOIN products p ON ri.product_id = p.id
               WHERE rt.original_sale_id = ?
               ORDER BY ri.id`,
              [sale.id],
            );
            const retItems = Array.isArray(itemsRows) ? itemsRows : [];

            if (retItems.length > 0) {
              const returnQty = retItems
                .filter(
                  (it: any) =>
                    it.action_type === "return" ||
                    it.action_type === "exchange_out",
                )
                .reduce(
                  (sum: number, it: any) => sum + Number(it.quantity || 0),
                  0,
                );
              const refundAmount = retItems
                .filter((it: any) => it.action_type === "return")
                .reduce(
                  (sum: number, it: any) =>
                    sum + Number(it.quantity * it.unit_price),
                  0,
                );
              const statusLabel =
                saleData.total_quantity && returnQty >= saleData.total_quantity
                  ? "Retour total"
                  : "Retour partiel";

              returnInfo = {
                status: statusLabel,
                refund_amount: refundAmount,
                refund_method: sale.payment_method || "cash",
                items: retItems.map((it: any) => ({
                  product_name: it.product_name,
                  quantity: Number(it.quantity),
                  unit_price: Number(it.unit_price),
                  total: Number(it.quantity * it.unit_price),
                  type:
                    it.action_type === "exchange_out" ? "exchange" : "return",
                })),
              };
            }
          }
        } catch (e) {
          console.warn("Return info enrichment failed:", e);
        }

        // Convert to SimpleTicketData used by caisse
        const stockSlug = (STOCK_SLUGS as any)[sale.stock_id] || "al-ouloum";
        const simpleData: any = {
          id: sale.id as number,
          invoiceNumber: (sale.invoice_number || `SALE-${sale.id}`) as string,
          date: new Date(sale.created_at).toLocaleDateString("fr-FR"),
          stockId: stockSlug as string,
          customerName: saleData.customer_name || "Client anonyme",
          items: (saleData.items || []).map((it: any) => ({
            product_name: it.product_name,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            total: Number(
              it.total_price ?? Number(it.quantity) * Number(it.unit_price),
            ),
          })),
          subtotal: Number(sale.total),
          total: Number(sale.total),
          payment_method: sale.payment_method || "cash",
          amount_paid: Number(
            sale.amount_paid ?? saleData.amount_paid ?? sale.total,
          ),
          change: Number(sale.change_amount ?? 0),
          barcode: saleData.sale_barcode || undefined,
          notes: sale.notes || undefined,
        };
        if (returnInfo) simpleData.returnInfo = returnInfo;

        const ticketHTML = generateSimpleTicketHTML(simpleData);

        return new NextResponse(ticketHTML, {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            "Content-Disposition": `attachment; filename="ticket_${sale.invoice_number || sale.id}.html"`,
          },
        });
      } catch (error) {
        console.error("❌ Error generating ticket:", error);
        return NextResponse.json(
          { success: false, error: "Failed to generate ticket" },
          { status: 500 },
        );
      }
    } else {
      // For manual sales, try to get stored invoice file
      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_files (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sale_id INT NOT NULL UNIQUE,
          filename VARCHAR(255),
          file_data LONGBLOB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      const [rows] = await pool.query(
        "SELECT filename, file_data FROM invoice_files WHERE sale_id = ?",
        [saleId],
      );
      const files = Array.isArray(rows) ? (rows as any[]) : [];

      if (files.length === 0) {
        // No stored PDF found, generate A4 format invoice for manual sales
        console.log(
          "📄 No stored PDF found for manual sale, generating A4 format invoice",
        );

        try {
          const { generateImprovedA4InvoicePDF } = await import(
            "@/lib/a4-invoice-generator-improved"
          );
          const { STOCK_SLUGS, STOCK_NAMES } = await import("@/lib/types");

          // Get sale details with items
          const saleResponse = await fetch(
            `${forwardedOrigin}/api/sales/${saleId}`,
          );
          const saleResult = await saleResponse.json();

          if (!saleResult.success) {
            throw new Error("Failed to fetch sale details");
          }

          const saleData = saleResult.data;
          const stockSlug = (STOCK_SLUGS as any)[sale.stock_id] || "al-ouloum";
          const stockName =
            (STOCK_NAMES as any)[sale.stock_id] || "Librairie Al Ouloum";

          // Prepare A4 invoice data
          const invoiceData = {
            invoiceNumber: sale.invoice_number || `SALE-${sale.id}`,
            date: new Date(sale.created_at).toLocaleDateString("fr-FR"),
            customerName: saleData.customer_name || "Client anonyme",
            customerPhone: saleData.customer_phone || undefined,
            customerAddress: saleData.customer_address || undefined,
            items: (saleData.items || []).map((it: any) => ({
              product_name: it.product_name,
              quantity: Number(it.quantity),
              unit_price: Number(it.unit_price),
              total_price: Number(
                it.total_price ?? Number(it.quantity) * Number(it.unit_price),
              ),
            })),
            subtotal: Number(sale.total),
            discount: 0,
            tax: 0,
            total: Number(sale.total),
            amountPaid: Number(
              sale.amount_paid ?? saleData.amount_paid ?? sale.total,
            ),
            change: Number(sale.change_amount ?? 0),
            paymentMethod: sale.payment_method || "cash",
            notes: sale.notes || undefined,
            stockId: stockSlug,
            stockName: stockName,
            factureBarcode: saleData.sale_barcode || undefined,
            barcodes: saleData.sale_barcode || undefined,
          };

          // Generate A4 PDF
          const pdf = generateImprovedA4InvoicePDF(invoiceData);
          const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="facture_A4_${sale.invoice_number || sale.id}.pdf"`,
              "Content-Length": pdfBuffer.length.toString(),
            },
          });
        } catch (fallbackError) {
          console.error(
            "❌ Error generating A4 fallback invoice:",
            fallbackError,
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "Original invoice not found for this sale and A4 fallback generation failed",
            },
            { status: 404 },
          );
        }
      }

      const { filename, file_data } = files[0];
      const buffer: Buffer = file_data;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename || `facture_${saleId}.pdf`}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }
  } catch (error: any) {
    console.error("❌ Error downloading stored invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
