const fs = require('fs');

async function testDownloadBehavior() {
  try {
    console.log('🧪 Test du comportement de téléchargement automatique...');
    
    // Créer une nouvelle vente pour tester
    const saleData = {
      user_id: 1,
      stock_id: 2, // Renaissance
      items: [
        {
          product_id: 1,
          quantity: 1,
          unit_price: 25.00
        }
      ],
      amount_paid: 30.00,
      change_amount: 5.00,
      payment_status: 'paid'
    };

    console.log('📝 Création d\'une nouvelle vente pour test...');
    const saleResponse = await fetch('http://localhost:3000/api/sales?stockId=renaissance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saleData)
    });

    const saleResult = await saleResponse.json();
    console.log('Résultat de la vente:', saleResult);

    if (saleResult.success && saleResult.data) {
      const saleId = saleResult.data.id;
      const invoiceNumber = saleResult.data.invoice_number;
      
      console.log(`✅ Vente créée: ID ${saleId}, Facture ${invoiceNumber}`);
      
      // Test de génération de facture A4 avec différents en-têtes
      console.log('\n🧾 Test de génération avec en-têtes de téléchargement...');
      
      const invoiceResponse = await fetch('http://localhost:3000/api/invoices/generate-a4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sale_id: saleId,
          stockId: 'renaissance'
        })
      });

      console.log('Status de la réponse:', invoiceResponse.status);
      console.log('En-têtes de la réponse:');
      for (const [key, value] of invoiceResponse.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      if (invoiceResponse.ok) {
        const buffer = await invoiceResponse.arrayBuffer();
        const filename = `test_download_${saleId}_${Date.now()}.pdf`;
        
        fs.writeFileSync(filename, Buffer.from(buffer));
        console.log('✅ Facture générée et sauvegardée !');
        console.log(`📄 Fichier: ${filename}`);
        console.log(`📊 Taille: ${buffer.byteLength} bytes`);
        
        // Vérifier que le fichier est un PDF valide
        const fileBuffer = fs.readFileSync(filename);
        const isPDF = fileBuffer.toString('ascii', 0, 4) === '%PDF';
        console.log(`📋 Fichier PDF valide: ${isPDF ? '✅ Oui' : '❌ Non'}`);
        
        if (isPDF) {
          console.log('🎉 Le téléchargement automatique devrait fonctionner dans le navigateur !');
        }
        
      } else {
        const errorText = await invoiceResponse.text();
        console.error('❌ Erreur lors de la génération:', invoiceResponse.status, errorText);
      }
      
    } else {
      console.error('❌ Erreur lors de la création de la vente:', saleResult.error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Test des en-têtes HTTP pour le téléchargement
async function testDownloadHeaders() {
  console.log('\n🔍 Test des en-têtes HTTP pour le téléchargement...');
  
  try {
    const response = await fetch('http://localhost:3000/api/invoices/generate-a4', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sale_id: 23, // Utiliser une vente existante
        stockId: 'renaissance'
      })
    });

    console.log('📋 Analyse des en-têtes de réponse:');
    console.log(`  Status: ${response.status}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    console.log(`  Content-Disposition: ${response.headers.get('content-disposition')}`);
    console.log(`  Content-Length: ${response.headers.get('content-length')}`);
    
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition && contentDisposition.includes('attachment')) {
      console.log('✅ En-tête Content-Disposition correctement configuré pour téléchargement');
    } else {
      console.log('⚠️ En-tête Content-Disposition pourrait ne pas déclencher le téléchargement');
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType === 'application/pdf') {
      console.log('✅ Content-Type PDF correctement configuré');
    } else {
      console.log('⚠️ Content-Type inattendu:', contentType);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test des en-têtes:', error);
  }
}

// Exécuter les tests
async function runAllTests() {
  await testDownloadBehavior();
  await testDownloadHeaders();
  
  console.log('\n📝 Conseils pour le téléchargement automatique:');
  console.log('1. Vérifiez que les pop-ups ne sont pas bloqués dans votre navigateur');
  console.log('2. Vérifiez les paramètres de téléchargement du navigateur');
  console.log('3. Certains navigateurs demandent une confirmation pour les téléchargements automatiques');
  console.log('4. Le téléchargement devrait apparaître dans la barre de téléchargement du navigateur');
}

runAllTests();
