// Test script pour vérifier l'API des ventes avec le format de la caisse
const API_BASE = 'http://localhost:3000/api';

async function testCashierSale() {
  console.log('🧪 Testing Cashier Sale API...\n');

  try {
    // Test 1: Créer une vente avec le format de la caisse (items array)
    console.log('💰 Test 1: Créer une vente avec items array (format caisse)');
    const cashierSaleData = {
      user_id: 2,
      stock_id: 2,
      customer_id: null,
      payment_method: 'cash',
      notes: 'Vente test depuis la caisse',
      items: [
        { product_id: 712, quantity: 2, unit_price: 18.50 },
        { product_id: 1392, quantity: 1, unit_price: 50.00 },
        { product_id: 1397, quantity: 3, unit_price: 25.50 }
      ]
    };

    // Calculer le total attendu
    const expectedTotal = cashierSaleData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    console.log('💰 Total attendu:', expectedTotal);

    const createResponse = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cashierSaleData)
    });

    const createResult = await createResponse.json();
    console.log('✅ Résultat création vente:', createResult);

    if (createResult.success) {
      console.log(`💰 Vente créée avec ID: ${createResult.data.id}`);
      console.log(`💰 Total calculé: ${createResult.data.total_amount}`);
      console.log(`💰 Nombre d'items: ${createResult.data.items_count}`);

      // Test 2: Récupérer les ventes pour vérifier
      console.log('\n💰 Test 2: Récupérer les ventes pour Renaissance');
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
            total_amount: ourSale.total_amount,
            payment_method: ourSale.payment_method,
            stock_id: ourSale.stock_id,
            customer_name: ourSale.customer_name
          });
        } else {
          console.log('❌ Vente non trouvée dans la liste');
        }
      }

      // Test 3: Vérifier les stocks des produits
      console.log('\n📦 Test 3: Vérifier les stocks après la vente');
      for (const item of cashierSaleData.items) {
        try {
          const productResponse = await fetch(`${API_BASE}/products?stockId=renaissance&search=${item.product_id}&limit=5`);
          const productResult = await productResponse.json();
          
          if (productResult.success && productResult.data.products.length > 0) {
            const product = productResult.data.products.find(p => p.id === item.product_id);
            if (product) {
              console.log(`📦 Produit ${item.product_id}: Stock actuel = ${product.quantity} (vendu: ${item.quantity})`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Erreur lors de la vérification du stock pour le produit ${item.product_id}`);
        }
      }

    } else {
      console.log('❌ Échec de création de la vente:', createResult.error);
      if (createResult.details) {
        console.log('📝 Détails:', createResult.details);
      }
    }

    // Test 4: Test avec l'ancien format pour la compatibilité
    console.log('\n💰 Test 4: Test avec l\'ancien format (compatibilité)');
    const oldFormatSale = {
      customer_id: null,
      total_amount: 75.25,
      payment_method: 'card',
      notes: 'Test ancien format'
    };

    const oldFormatResponse = await fetch(`${API_BASE}/sales?stockId=renaissance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oldFormatSale)
    });

    const oldFormatResult = await oldFormatResponse.json();
    console.log('✅ Test ancien format:', oldFormatResult.success ? 'Succès' : 'Échec');
    if (oldFormatResult.success) {
      console.log(`💰 Vente ancien format créée avec ID: ${oldFormatResult.data.id}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testCashierSale();
