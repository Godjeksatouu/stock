// Script de validation pour la préparation à la production
// Exécuter avec: node scripts/production-validation.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation de la Préparation à la Production\n');

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Vérifications des fichiers de sécurité
function checkSecurityFiles() {
  log('\n📋 1. Vérification des Fichiers de Sécurité', 'blue');
  
  const securityFiles = [
    'lib/security.ts',
    'lib/api-security.ts',
    'lib/client-security.ts',
    'lib/performance.ts',
    'middleware.ts'
  ];
  
  let allPresent = true;
  
  securityFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`  ✅ ${file}`, 'green');
    } else {
      log(`  ❌ ${file} - MANQUANT`, 'red');
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Vérification de la structure des APIs
function checkApiStructure() {
  log('\n📋 2. Vérification de la Structure des APIs', 'blue');
  
  const apiDir = 'app/api';
  let apiCount = 0;
  let securedApis = 0;
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item === 'route.ts') {
        apiCount++;
        
        // Vérifier si l'API utilise les mesures de sécurité
        const content = fs.readFileSync(itemPath, 'utf8');
        
        if (content.includes('validateApiRequest') || 
            content.includes('createSecureApiResponse') ||
            content.includes('sanitizeApiInput')) {
          securedApis++;
          log(`  ✅ ${itemPath} - Sécurisé`, 'green');
        } else {
          log(`  ⚠️  ${itemPath} - Non sécurisé`, 'yellow');
        }
      }
    });
  }
  
  scanDirectory(apiDir);
  
  log(`\n  📊 Résumé: ${securedApis}/${apiCount} APIs sécurisées`);
  
  return { total: apiCount, secured: securedApis };
}

// Vérification des dépendances de sécurité
function checkDependencies() {
  log('\n📋 3. Vérification des Dépendances', 'blue');
  
  if (!fs.existsSync('package.json')) {
    log('  ❌ package.json non trouvé', 'red');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const recommendedDeps = {
    'next': 'Framework principal',
    'react': 'Interface utilisateur',
    'mysql2': 'Base de données',
    'typescript': 'Typage statique'
  };
  
  let allPresent = true;
  
  Object.entries(recommendedDeps).forEach(([dep, description]) => {
    if (dependencies[dep]) {
      log(`  ✅ ${dep} (${dependencies[dep]}) - ${description}`, 'green');
    } else {
      log(`  ⚠️  ${dep} - ${description} (recommandé)`, 'yellow');
    }
  });
  
  return allPresent;
}

// Vérification de la configuration de sécurité
function checkSecurityConfig() {
  log('\n📋 4. Vérification de la Configuration de Sécurité', 'blue');
  
  const checks = [
    {
      file: 'middleware.ts',
      check: (content) => content.includes('X-Content-Type-Options'),
      message: 'En-têtes de sécurité'
    },
    {
      file: 'middleware.ts',
      check: (content) => content.includes('rateLimit'),
      message: 'Rate limiting'
    },
    {
      file: 'lib/security.ts',
      check: (content) => content.includes('sanitizeHtml'),
      message: 'Protection XSS'
    },
    {
      file: 'lib/security.ts',
      check: (content) => content.includes('validateSQLParams'),
      message: 'Protection SQL'
    }
  ];
  
  let passedChecks = 0;
  
  checks.forEach(({ file, check, message }) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (check(content)) {
        log(`  ✅ ${message}`, 'green');
        passedChecks++;
      } else {
        log(`  ❌ ${message} - Non configuré`, 'red');
      }
    } else {
      log(`  ❌ ${message} - Fichier manquant (${file})`, 'red');
    }
  });
  
  return { passed: passedChecks, total: checks.length };
}

// Vérification des tests
function checkTests() {
  log('\n📋 5. Vérification des Tests', 'blue');
  
  const testFiles = [
    'test-production-readiness.html',
    'test-sales-quantity-fix.html',
    'test-barcode-fix.html'
  ];
  
  let testsPresent = 0;
  
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`  ✅ ${file}`, 'green');
      testsPresent++;
    } else {
      log(`  ⚠️  ${file} - Test manquant`, 'yellow');
    }
  });
  
  return { present: testsPresent, total: testFiles.length };
}

// Vérification de la documentation
function checkDocumentation() {
  log('\n📋 6. Vérification de la Documentation', 'blue');
  
  const docFiles = [
    'SECURISATION_PRODUCTION.md',
    'AUDIT_PRODUCTION_READINESS.md',
    'README.md'
  ];
  
  let docsPresent = 0;
  
  docFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`  ✅ ${file}`, 'green');
      docsPresent++;
    } else {
      log(`  ⚠️  ${file} - Documentation manquante`, 'yellow');
    }
  });
  
  return { present: docsPresent, total: docFiles.length };
}

// Analyse de la taille du projet
function analyzeProjectSize() {
  log('\n📋 7. Analyse de la Taille du Projet', 'blue');
  
  function getDirectorySize(dir) {
    let size = 0;
    let fileCount = 0;
    
    if (!fs.existsSync(dir)) return { size: 0, fileCount: 0 };
    
    function scanDir(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(itemPath);
        } else if (stat.isFile()) {
          size += stat.size;
          fileCount++;
        }
      });
    }
    
    scanDir(dir);
    return { size, fileCount };
  }
  
  const { size, fileCount } = getDirectorySize('.');
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  
  log(`  📊 Taille du projet: ${sizeMB} MB`);
  log(`  📊 Nombre de fichiers: ${fileCount}`);
  
  if (size < 100 * 1024 * 1024) { // 100MB
    log(`  ✅ Taille acceptable pour la production`, 'green');
  } else {
    log(`  ⚠️  Projet volumineux - optimisation recommandée`, 'yellow');
  }
  
  return { sizeMB: parseFloat(sizeMB), fileCount };
}

// Génération du rapport final
function generateReport(results) {
  log('\n📊 RAPPORT FINAL DE VALIDATION', 'blue');
  log('='.repeat(50), 'blue');
  
  const {
    securityFiles,
    apiStructure,
    dependencies,
    securityConfig,
    tests,
    documentation,
    projectSize
  } = results;
  
  // Calcul du score global
  let totalScore = 0;
  let maxScore = 0;
  
  // Fichiers de sécurité (20 points)
  maxScore += 20;
  totalScore += securityFiles ? 20 : 0;
  
  // APIs sécurisées (25 points)
  maxScore += 25;
  if (apiStructure.total > 0) {
    totalScore += Math.round((apiStructure.secured / apiStructure.total) * 25);
  }
  
  // Configuration de sécurité (25 points)
  maxScore += 25;
  totalScore += Math.round((securityConfig.passed / securityConfig.total) * 25);
  
  // Tests (15 points)
  maxScore += 15;
  totalScore += Math.round((tests.present / tests.total) * 15);
  
  // Documentation (15 points)
  maxScore += 15;
  totalScore += Math.round((documentation.present / documentation.total) * 15);
  
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  log(`\n🎯 Score Global: ${totalScore}/${maxScore} (${percentage}%)`);
  
  if (percentage >= 90) {
    log('\n🎉 EXCELLENT - Prêt pour la production !', 'green');
    log('Le système répond aux standards de sécurité et de performance.', 'green');
  } else if (percentage >= 75) {
    log('\n✅ BON - Quelques améliorations recommandées', 'yellow');
    log('Le système est fonctionnel mais peut être optimisé.', 'yellow');
  } else if (percentage >= 60) {
    log('\n⚠️  MOYEN - Améliorations nécessaires', 'yellow');
    log('Des corrections sont recommandées avant la production.', 'yellow');
  } else {
    log('\n❌ INSUFFISANT - Corrections critiques requises', 'red');
    log('Le système nécessite des améliorations importantes.', 'red');
  }
  
  // Recommandations
  log('\n📋 RECOMMANDATIONS:', 'blue');
  
  if (!securityFiles) {
    log('  • Implémenter tous les fichiers de sécurité', 'yellow');
  }
  
  if (apiStructure.secured < apiStructure.total) {
    log(`  • Sécuriser ${apiStructure.total - apiStructure.secured} API(s) restante(s)`, 'yellow');
  }
  
  if (securityConfig.passed < securityConfig.total) {
    log('  • Compléter la configuration de sécurité', 'yellow');
  }
  
  if (tests.present < tests.total) {
    log('  • Ajouter les tests manquants', 'yellow');
  }
  
  if (documentation.present < documentation.total) {
    log('  • Compléter la documentation', 'yellow');
  }
  
  if (projectSize.sizeMB > 50) {
    log('  • Optimiser la taille du projet', 'yellow');
  }
  
  log('\n✨ Validation terminée !', 'green');
}

// Exécution principale
async function main() {
  try {
    const results = {
      securityFiles: checkSecurityFiles(),
      apiStructure: checkApiStructure(),
      dependencies: checkDependencies(),
      securityConfig: checkSecurityConfig(),
      tests: checkTests(),
      documentation: checkDocumentation(),
      projectSize: analyzeProjectSize()
    };
    
    generateReport(results);
    
  } catch (error) {
    log(`\n❌ Erreur lors de la validation: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Lancer la validation
main();
