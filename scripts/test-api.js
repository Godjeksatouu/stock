const http = require('http')

async function testAPI() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Test de l\'API de détection des doublons...')

    const req = http.get('http://localhost:3000/api/products/duplicates', (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)

          if (res.statusCode !== 200) {
            console.error('❌ Erreur API:', jsonData.error)
            resolve()
            return
          }

          console.log('✅ API répond correctement')
          console.log('\n📊 Résultats:')
          console.log(`- Groupes de doublons: ${jsonData.data.totalGroups}`)
          console.log(`- Produits à supprimer: ${jsonData.data.totalToDelete}`)

          if (jsonData.data.duplicates && jsonData.data.duplicates.length > 0) {
            console.log('\n🔍 Doublons trouvés:')
            jsonData.data.duplicates.forEach((group, index) => {
              console.log(`\n${index + 1}. "${group.name}"`)
              console.log(`   - Nombre: ${group.duplicate_count}`)
              console.log(`   - IDs: ${group.product_ids}`)
            })

            console.log('\n📋 Plan de nettoyage:')
            jsonData.data.cleanupPlan.forEach((plan, index) => {
              console.log(`\n${index + 1}. "${plan.name}"`)
              console.log(`   - Garder ID: ${plan.keepId}`)
              console.log(`   - Supprimer IDs: ${plan.deleteIds.join(', ')}`)
              console.log(`   - Ventes: ${plan.totalSales} (${plan.totalRevenue.toFixed(2)}€)`)
            })
          } else {
            console.log('\n✅ Aucun doublon trouvé!')
          }

          resolve()
        } catch (error) {
          console.error('❌ Erreur de parsing JSON:', error.message)
          resolve()
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Erreur de requête:', error.message)
      resolve()
    })
  })
}

testAPI()
