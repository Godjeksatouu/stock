// Test script pour vérifier l'API de mise à jour des codes-barres
const API_BASE = 'http://localhost:3000/api';

async function testBarcodeAPI() {
  console.log('🧪 Testing Barcode API...\n');

  try {
    // Test 1: Créer une vente d'abord
    console.log('💰 Test 1: Créer une vente pour tester le code-barres');
    const saleData = {
      customer_id: null,
      total_amount: 50.00,
      payment_method: 'cash',
      notes: 'Test pour code-barres'
    };

    const createSaleResponse = await fetch(`${API_BASE}/sales?stockId=renaissance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData)
    });

    const createSaleResult = await createSaleResponse.json();
    console.log('✅ Résultat création vente:', createSaleResult);

    if (createSaleResult.success) {
      const saleId = createSaleResult.data.id;
      console.log(`💰 Vente créée avec ID: ${saleId}`);

      // Test 2: Mettre à jour le code-barres
      console.log('\n📝 Test 2: Mettre à jour le code-barres de la vente');
      const testBarcode = `BARCODE-${Date.now()}`;
      
      const updateBarcodeResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode: testBarcode })
      });

      const responseText = await updateBarcodeResponse.text();
      console.log('📝 Réponse brute de l\'API:', responseText);
      console.log('📝 Status:', updateBarcodeResponse.status);
      console.log('📝 Headers:', Object.fromEntries(updateBarcodeResponse.headers.entries()));

      if (updateBarcodeResponse.ok) {
        try {
          const updateBarcodeResult = JSON.parse(responseText);
          console.log('✅ Mise à jour code-barres réussie:', updateBarcodeResult);

          // Test 3: Récupérer le code-barres
          console.log('\n🔍 Test 3: Récupérer le code-barres');
          const getBarcodeResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`);
          const getBarcodeResult = await getBarcodeResponse.json();
          
          console.log('✅ Récupération code-barres:', getBarcodeResult);
          
          if (getBarcodeResult.success && getBarcodeResult.data.barcode === testBarcode) {
            console.log('✅ Code-barres vérifié avec succès !');
          } else {
            console.log('❌ Code-barres ne correspond pas');
          }

        } catch (parseError) {
          console.error('❌ Erreur de parsing JSON:', parseError);
          console.log('📝 Réponse non-JSON:', responseText);
        }
      } else {
        console.error('❌ Erreur lors de la mise à jour du code-barres');
        console.log('📝 Status:', updateBarcodeResponse.status);
        console.log('📝 Réponse:', responseText);
        
        // Essayer de parser comme JSON pour voir l'erreur
        try {
          const errorResult = JSON.parse(responseText);
          console.log('📝 Détails de l\'erreur:', errorResult);
        } catch (e) {
          console.log('📝 Réponse non-JSON:', responseText);
        }
      }

    } else {
      console.log('❌ Échec de création de la vente:', createSaleResult.error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('📝 Stack trace:', error.stack);
  }
}

// Exécuter le test
testBarcodeAPI();
