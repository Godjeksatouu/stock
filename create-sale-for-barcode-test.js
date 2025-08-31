// Créer une vente pour tester l'API de code-barres
const API_BASE = 'http://localhost:3000/api';

async function createSaleForBarcodeTest() {
  console.log('🧪 Creating sale for barcode test...\n');

  try {
    // Créer une vente simple
    const saleData = {
      customer_id: null,
      total_amount: 99.99,
      payment_method: 'cash',
      notes: 'Vente pour test code-barres'
    };

    console.log('💰 Création d\'une vente pour test...');
    const createResponse = await fetch(`${API_BASE}/sales?stockId=renaissance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData)
    });

    const createText = await createResponse.text();
    console.log('📝 Status création:', createResponse.status);
    console.log('📝 Réponse création:', createText);

    if (createResponse.ok) {
      const createResult = JSON.parse(createText);
      console.log('✅ Vente créée:', createResult);
      
      if (createResult.success) {
        const saleId = createResult.data.id;
        console.log(`💰 Vente créée avec ID: ${saleId}`);
        
        // Maintenant tester l'API de code-barres
        const testBarcode = `BARCODE-TEST-${Date.now()}`;
        console.log(`\n📝 Test du code-barres: ${testBarcode}`);

        // Mettre à jour le code-barres
        const updateResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode: testBarcode })
        });

        const updateText = await updateResponse.text();
        console.log('📝 Status mise à jour:', updateResponse.status);
        console.log('📝 Réponse mise à jour:', updateText);

        if (updateResponse.ok) {
          const updateResult = JSON.parse(updateText);
          console.log('✅ Code-barres mis à jour:', updateResult);
          
          // Vérifier la mise à jour
          const getResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`);
          const getText = await getResponse.text();
          
          if (getResponse.ok) {
            const getResult = JSON.parse(getText);
            console.log('✅ Vérification code-barres:', getResult);
            
            if (getResult.data.barcode === testBarcode) {
              console.log('🎉 API de code-barres fonctionne parfaitement !');
            } else {
              console.log('❌ Problème de cohérence du code-barres');
            }
          }
        } else {
          console.log('❌ Erreur lors de la mise à jour du code-barres');
        }
      }
    } else {
      console.log('❌ Erreur lors de la création de la vente');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

createSaleForBarcodeTest();
