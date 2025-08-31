// Test script pour vérifier l'API des ventes
const API_BASE = 'http://localhost:3000/api';

async function testSalesAPI() {
  console.log('🧪 Testing Sales API...\n');

  try {
    // Test 1: Créer une vente simple
    console.log('💰 Test 1: Créer une vente simple');
    const saleData = {
      customer_id: null, // vente anonyme
      total_amount: 125.50,
      payment_method: 'cash',
      payment_status: 'paid',
      subtotal: 125.50,
      tax_amount: 0,
      discount_amount: 0,
      notes: 'Test de vente via API'
    };

    const createResponse = await fetch(`${API_BASE}/sales?stockId=renaissance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData)
    });

    const createResult = await createResponse.json();
    console.log('✅ Résultat création vente:', createResult);

    if (createResult.success) {
      console.log(`💰 Vente créée avec ID: ${createResult.data.id}\n`);

      // Test 2: Récupérer les ventes
      console.log('💰 Test 2: Récupérer les ventes');
      const getResponse = await fetch(`${API_BASE}/sales?stockId=renaissance&limit=10`);
      const getResult = await getResponse.json();
      
      console.log('✅ Récupération ventes:', {
        success: getResult.success,
        totalSales: getResult.data?.sales?.length || 0,
        total: getResult.data?.pagination?.total || 0
      });

      // Vérifier si notre vente est dans la liste
      if (getResult.data?.sales) {
        const ourSale = getResult.data.sales.find(s => s.id === createResult.data.id);
        if (ourSale) {
          console.log('✅ Vente trouvée dans la liste:', {
            id: ourSale.id,
            total: ourSale.total,
            payment_method: ourSale.payment_method,
            stock_id: ourSale.stock_id
          });
        } else {
          console.log('❌ Vente non trouvée dans la liste');
        }
      }

    } else {
      console.log('❌ Échec de création de la vente:', createResult.error);
      if (createResult.details) {
        console.log('📝 Détails:', createResult.details);
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testSalesAPI();
