import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'

// PUT - Mettre à jour le code-barres d'une vente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const saleId = parseInt(id)
    const { barcode } = await request.json()

    console.log(`📝 PUT /api/sales/${saleId}/barcode - Barcode: ${barcode}`)

    if (!saleId || !barcode) {
      console.error('❌ Paramètres manquants:', { saleId, barcode })
      return NextResponse.json(
        { success: false, error: 'ID de vente et code-barres requis' },
        { status: 400 }
      )
    }

    // Validate barcode format
    const cleanedBarcode = barcode.trim();
    if (!/^\d+$/.test(cleanedBarcode)) {
      console.error('❌ Format de code-barres invalide:', cleanedBarcode)
      return NextResponse.json(
        { success: false, error: 'Format de code-barres invalide. Seuls les chiffres sont acceptés.' },
        { status: 400 }
      )
    }

    if (cleanedBarcode.length < 6 || cleanedBarcode.length > 20) {
      console.error('❌ Longueur de code-barres invalide:', cleanedBarcode)
      return NextResponse.json(
        { success: false, error: 'Longueur de code-barres invalide. Doit contenir entre 6 et 20 chiffres.' },
        { status: 400 }
      )
    }

    // Vérifier que la vente existe
    console.log(`🔍 Vérification de l'existence de la vente #${saleId}...`)
    const [saleRows] = await pool.query('SELECT id, barcode FROM sales WHERE id = ?', [saleId]);
    const sales = saleRows as any[];

    if (!sales || sales.length === 0) {
      console.error(`❌ Vente #${saleId} non trouvée`)
      return NextResponse.json(
        { success: false, error: 'Vente non trouvée' },
        { status: 404 }
      )
    }

    const sale = sales[0];
    console.log(`✅ Vente #${saleId} trouvée, code-barres actuel:`, sale.barcode)

    // Mettre à jour le code-barres de la vente
    const updateQuery = `UPDATE sales SET barcode = ? WHERE id = ?`;

    console.log(`🔄 Mise à jour du code-barres pour la vente #${saleId}...`)
    const [updateResult] = await pool.query(updateQuery, [cleanedBarcode, saleId]);

    console.log(`✅ Code-barres mis à jour avec succès pour la vente #${saleId}`);

    // Vérifier que la mise à jour a bien fonctionné
    const [verifyRows] = await pool.query('SELECT id, barcode FROM sales WHERE id = ?', [saleId]);
    const verifyData = (verifyRows as any[])[0];
    console.log(`🔍 Vérification post-mise à jour:`, verifyData);

    return NextResponse.json({
      success: true,
      message: 'Code-barres mis à jour avec succès',
      data: {
        saleId,
        barcode,
        verified: verifyData?.barcode === barcode
      }
    })

  } catch (error) {
    console.error('Error updating barcode:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la mise à jour du code-barres' },
      { status: 500 }
    )
  }
}

// GET - Récupérer le code-barres d'une vente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const saleId = parseInt(params.id)

    if (!saleId) {
      return NextResponse.json(
        { success: false, error: 'ID de vente requis' },
        { status: 400 }
      )
    }

    // Récupérer le code-barres de la vente
    const query = 'SELECT id, barcode FROM sales WHERE id = ?'
    const [rows] = await pool.query(query, [saleId]);
    const sales = rows as any[];

    if (sales && sales.length > 0) {
      const sale = sales[0];
      return NextResponse.json({
        success: true,
        data: {
          saleId: sale.id,
          barcode: sale.barcode
        }
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Vente non trouvée' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Error getting barcode:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la récupération du code-barres' },
      { status: 500 }
    )
  }
}
