// Test simple pour l'API de code-barres avec une vente existante
const API_BASE = 'http://localhost:3000/api';

async function testBarcodeSimple() {
  console.log('🧪 Testing Barcode API with existing sale...\n');

  try {
    // Test avec la vente ID 5 qui existe selon les logs
    const saleId = 5;
    const testBarcode = `TEST-BARCODE-${Date.now()}`;

    console.log(`📝 Test: Mettre à jour le code-barres de la vente ${saleId}`);
    console.log(`📝 Nouveau code-barres: ${testBarcode}`);

    // Test 1: Récupérer le code-barres actuel
    console.log('\n🔍 Test 1: Récupérer le code-barres actuel');
    try {
      const getCurrentResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`);
      const getCurrentText = await getCurrentResponse.text();
      
      console.log('📝 Status GET:', getCurrentResponse.status);
      console.log('📝 Réponse GET:', getCurrentText);

      if (getCurrentResponse.ok) {
        const getCurrentResult = JSON.parse(getCurrentText);
        console.log('✅ Code-barres actuel:', getCurrentResult);
      }
    } catch (getError) {
      console.log('⚠️ Erreur lors de la récupération:', getError.message);
    }

    // Test 2: Mettre à jour le code-barres
    console.log('\n📝 Test 2: Mettre à jour le code-barres');
    try {
      const updateResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode: testBarcode })
      });

      const updateText = await updateResponse.text();
      console.log('📝 Status PUT:', updateResponse.status);
      console.log('📝 Réponse PUT:', updateText);

      if (updateResponse.ok) {
        const updateResult = JSON.parse(updateText);
        console.log('✅ Mise à jour réussie:', updateResult);

        // Test 3: Vérifier la mise à jour
        console.log('\n🔍 Test 3: Vérifier la mise à jour');
        const verifyResponse = await fetch(`${API_BASE}/sales/${saleId}/barcode`);
        const verifyText = await verifyResponse.text();
        
        if (verifyResponse.ok) {
          const verifyResult = JSON.parse(verifyText);
          console.log('✅ Vérification:', verifyResult);
          
          if (verifyResult.data.barcode === testBarcode) {
            console.log('🎉 Code-barres mis à jour avec succès !');
          } else {
            console.log('❌ Code-barres ne correspond pas');
          }
        }
      } else {
        console.log('❌ Erreur lors de la mise à jour');
        try {
          const errorResult = JSON.parse(updateText);
          console.log('📝 Détails de l\'erreur:', errorResult);
        } catch (e) {
          console.log('📝 Réponse non-JSON:', updateText);
        }
      }
    } catch (updateError) {
      console.log('⚠️ Erreur lors de la mise à jour:', updateError.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter le test
testBarcodeSimple();
