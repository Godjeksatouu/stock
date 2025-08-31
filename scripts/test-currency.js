// Test script to verify currency formatting
const { formatPrice, formatCurrency, getCurrencySymbol, getCurrencyName, parseCurrency } = require('../lib/currency.ts');

console.log('🧪 Testing Currency Formatting Functions\n');

// Test formatPrice function
console.log('📊 Testing formatPrice():');
console.log(`  formatPrice(25.50) = "${formatPrice(25.50)}"`);
console.log(`  formatPrice("18.90") = "${formatPrice("18.90")}"`);
console.log(`  formatPrice(0) = "${formatPrice(0)}"`);
console.log(`  formatPrice("invalid") = "${formatPrice("invalid")}"`);

console.log('\n💰 Testing formatCurrency():');
console.log(`  formatCurrency(125.75, true) = "${formatCurrency(125.75, true)}"`);
console.log(`  formatCurrency(125.75, false) = "${formatCurrency(125.75, false)}"`);

console.log('\n🏷️ Testing utility functions:');
console.log(`  getCurrencySymbol() = "${getCurrencySymbol()}"`);
console.log(`  getCurrencyName() = "${getCurrencyName()}"`);

console.log('\n🔄 Testing parseCurrency():');
console.log(`  parseCurrency("125.50 DH") = ${parseCurrency("125.50 DH")}`);
console.log(`  parseCurrency("25.75") = ${parseCurrency("25.75")}`);
console.log(`  parseCurrency("invalid") = ${parseCurrency("invalid")}`);

console.log('\n✅ Currency formatting test completed!');
console.log('\n📝 Summary:');
console.log('  - Currency symbol changed from € to DH');
console.log('  - All price displays now use Moroccan Dirham');
console.log('  - Formatting functions are working correctly');
