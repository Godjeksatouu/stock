const fs = require('fs');

async function testAutomaticInvoiceGeneration() {
  try {
    console.log('🧾 Test de génération automatique de facture lors de la création de vente...');
    
    // Créer une nouvelle vente
    const saleData = {
      user_id: 1,
      stock_id: 2, // Renaissance
      items: [
        {
          product_id: 1,
          quantity: 2,
          unit_price: 15.50
        }
      ],
      amount_paid: 35.00,
      change_amount: 4.00,
      payment_status: 'paid'
    };

    console.log('📝 Création de la vente...');
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
      
      console.log(`✅ Vente créée avec succès: ID ${saleId}, Facture ${invoiceNumber}`);
      
      // Attendre un peu pour que la vente soit bien enregistrée
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Maintenant tester la génération de facture A4 pour cette vente
      console.log('🧾 Test de génération de facture A4 pour cette vente...');
      
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

      if (invoiceResponse.ok) {
        const buffer = await invoiceResponse.arrayBuffer();
        const filename = `test_automatic_invoice_${saleId}_${Date.now()}.pdf`;
        
        fs.writeFileSync(filename, Buffer.from(buffer));
        console.log('✅ Facture A4 générée automatiquement !');
        console.log(`📄 Fichier sauvegardé: ${filename}`);
        console.log(`📊 Taille: ${buffer.byteLength} bytes`);
        
        // Test avec différents stocks pour la même vente
        console.log('\n🏪 Test avec différents pieds de page de stock...');
        
        const stocks = ['al-ouloum', 'gros'];
        for (const stock of stocks) {
          console.log(`\n📄 Génération pour ${stock}...`);
          
          const stockInvoiceResponse = await fetch('http://localhost:3000/api/invoices/generate-a4', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sale_id: saleId,
              stockId: stock
            })
          });

          if (stockInvoiceResponse.ok) {
            const stockBuffer = await stockInvoiceResponse.arrayBuffer();
            const stockFilename = `test_${stock}_invoice_${saleId}_${Date.now()}.pdf`;
            
            fs.writeFileSync(stockFilename, Buffer.from(stockBuffer));
            console.log(`✅ Facture générée pour ${stock}: ${stockFilename}`);
          } else {
            const errorText = await stockInvoiceResponse.text();
            console.error(`❌ Erreur pour ${stock}:`, stockInvoiceResponse.status, errorText);
          }
          
          // Attendre entre les tests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } else {
        const errorText = await invoiceResponse.text();
        console.error('❌ Erreur lors de la génération de la facture A4:', invoiceResponse.status, errorText);
      }
      
    } else {
      console.error('❌ Erreur lors de la création de la vente:', saleResult.error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testAutomaticInvoiceGeneration();
