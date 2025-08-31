async function testSimplePurchaseForm() {
  try {
    console.log('🛒 Test du formulaire d\'achat simple...');
    
    // Simuler les données du formulaire d'achat simple
    const saleData = {
      user_id: 1, // Maintenant inclus
      client_id: null,
      stock_id: 2, // Renaissance
      total: 36,
      amount_paid: 40,
      change_amount: 4,
      payment_method: 'cash',
      payment_status: 'paid',
      notes: 'Test formulaire achat simple',
      items: [
        {
          product_id: 1,
          quantity: 2,
          unit_price: 18,
          total_price: 36
        }
      ]
    };

    console.log('📝 Données de vente à envoyer:', saleData);

    const response = await fetch('http://localhost:3000/api/sales?stockId=renaissance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saleData)
    });

    console.log('📡 Status de la réponse:', response.status);

    const result = await response.json();
    console.log('📥 Résultat:', result);

    if (result.success) {
      console.log('✅ Vente créée avec succès !');
      console.log(`   ID: ${result.data.id}`);
      console.log(`   Numéro: ${result.data.sale_number}`);
      console.log(`   Facture: ${result.data.invoice_number}`);
      console.log(`   Total: ${result.data.total_amount}`);
      
      // Tester la génération automatique de facture A4
      console.log('\n🧾 Test de génération automatique de facture A4...');
      
      const invoiceResponse = await fetch('http://localhost:3000/api/invoices/generate-a4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sale_id: result.data.id,
          stockId: 'renaissance'
        })
      });

      if (invoiceResponse.ok) {
        console.log('✅ Facture A4 générée avec succès !');
        console.log(`   Taille: ${invoiceResponse.headers.get('content-length')} bytes`);
        console.log(`   Type: ${invoiceResponse.headers.get('content-type')}`);
        console.log(`   Disposition: ${invoiceResponse.headers.get('content-disposition')}`);
      } else {
        const errorText = await invoiceResponse.text();
        console.error('❌ Erreur génération facture A4:', invoiceResponse.status, errorText);
      }
      
    } else {
      console.error('❌ Erreur lors de la création de la vente:', result.error);
      console.error('   Détails:', result.details || 'Aucun détail disponible');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Test avec différents scénarios
async function testDifferentScenarios() {
  console.log('\n🧪 Test de différents scénarios...\n');
  
  // Scénario 1: Vente payée complètement
  console.log('📋 Scénario 1: Vente payée complètement');
  await testScenario({
    user_id: 1,
    client_id: null,
    stock_id: 2,
    total: 25,
    amount_paid: 25,
    change_amount: 0,
    payment_method: 'cash',
    payment_status: 'paid',
    notes: 'Vente payée complètement',
    items: [{ product_id: 1, quantity: 1, unit_price: 25, total_price: 25 }]
  });
  
  // Scénario 2: Vente avec monnaie à rendre
  console.log('\n📋 Scénario 2: Vente avec monnaie à rendre');
  await testScenario({
    user_id: 1,
    client_id: null,
    stock_id: 2,
    total: 18,
    amount_paid: 20,
    change_amount: 2,
    payment_method: 'cash',
    payment_status: 'paid',
    notes: 'Vente avec monnaie',
    items: [{ product_id: 1, quantity: 1, unit_price: 18, total_price: 18 }]
  });
  
  // Scénario 3: Vente en attente de paiement
  console.log('\n📋 Scénario 3: Vente en attente de paiement');
  await testScenario({
    user_id: 1,
    client_id: null,
    stock_id: 2,
    total: 50,
    amount_paid: 0,
    change_amount: null,
    payment_method: 'cash',
    payment_status: 'pending',
    notes: 'Vente en attente',
    items: [{ product_id: 1, quantity: 2, unit_price: 25, total_price: 50 }]
  });
}

async function testScenario(saleData) {
  try {
    const response = await fetch('http://localhost:3000/api/sales?stockId=renaissance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Succès - ID: ${result.data.id}, Total: ${result.data.total_amount}`);
    } else {
      console.log(`❌ Échec - ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Erreur - ${error.message}`);
  }
}

// Exécuter les tests
async function runAllTests() {
  await testSimplePurchaseForm();
  await testDifferentScenarios();
  
  console.log('\n📝 Résumé:');
  console.log('- Le formulaire d\'achat simple devrait maintenant fonctionner');
  console.log('- Les factures A4 devraient se générer automatiquement');
  console.log('- Testez dans le navigateur pour confirmer le téléchargement automatique');
}

runAllTests();
