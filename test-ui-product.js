// Test pour ajouter un produit qui apparaîtra en début de liste
const API_BASE = 'http://localhost:3000/api';

async function testUIProduct() {
  console.log('🧪 Test produit pour interface utilisateur...\n');

  try {
    // Ajouter un produit avec un nom qui apparaîtra en début de liste
    const newProduct = {
      name: 'AAAA Test Interface Utilisateur',
      reference: 'UI-TEST-001',
      description: 'Produit de test pour vérifier l\'interface utilisateur',
      price: 15.75,
      quantity: 25,
      barcodes: ['9999999999999']
    };

    console.log('📦 Ajout du produit pour Al Ouloum...');
    const createResponse = await fetch(`${API_BASE}/products?stockId=al-ouloum`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newProduct)
    });

    const createResult = await createResponse.json();
    console.log('✅ Résultat création:', createResult);

    if (createResult.success) {
      console.log(`📦 Produit créé avec ID: ${createResult.data.id}`);
      
      // Vérifier qu'il apparaît dans les premiers résultats
      console.log('\n📦 Vérification dans la liste (premiers résultats)...');
      const getResponse = await fetch(`${API_BASE}/products?stockId=al-ouloum&limit=10`);
      const getResult = await getResponse.json();
      
      console.log('✅ Premiers produits récupérés:', getResult.data.products.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity
      })));

      const foundProduct = getResult.data.products.find(p => p.id === createResult.data.id);
      if (foundProduct) {
        console.log('✅ Produit trouvé dans les premiers résultats !');
        console.log('📦 Détails:', {
          id: foundProduct.id,
          name: foundProduct.name,
          quantity: foundProduct.quantity,
          price: foundProduct.price,
          stock_id: foundProduct.stock_id
        });
      } else {
        console.log('❌ Produit non trouvé dans les premiers résultats');
      }

      // Ajouter le même produit à Renaissance
      console.log('\n📦 Ajout du même produit à Renaissance...');
      const renaissanceResponse = await fetch(`${API_BASE}/products?stockId=renaissance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProduct,
          quantity: 40
        })
      });

      const renaissanceResult = await renaissanceResponse.json();
      console.log('✅ Ajout à Renaissance:', renaissanceResult.success ? 'Succès' : 'Échec');

      // Vérifier dans Renaissance
      console.log('\n📦 Vérification dans Renaissance...');
      const getRenaissanceResponse = await fetch(`${API_BASE}/products?stockId=renaissance&limit=10`);
      const getRenaissanceResult = await getRenaissanceResponse.json();
      
      const foundInRenaissance = getRenaissanceResult.data.products.find(p => p.name === newProduct.name);
      if (foundInRenaissance) {
        console.log('✅ Produit trouvé dans Renaissance !');
        console.log('📦 Détails Renaissance:', {
          id: foundInRenaissance.id,
          name: foundInRenaissance.name,
          quantity: foundInRenaissance.quantity,
          stock_id: foundInRenaissance.stock_id
        });
      } else {
        console.log('❌ Produit non trouvé dans Renaissance');
      }

    } else {
      console.log('❌ Échec de création:', createResult.error);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testUIProduct();
