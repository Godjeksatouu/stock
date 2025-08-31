// Test script for barcode validation utilities
const { 
  validateBarcode, 
  isSaleBarcode, 
  formatBarcodeForDisplay, 
  generateSaleBarcode, 
  parseSaleBarcode,
  cleanBarcodeInput 
} = require('./lib/barcode-utils.ts');

function testBarcodeValidation() {
  console.log('🧪 Testing barcode validation utilities...\n');

  // Test 1: validateBarcode function
  console.log('1️⃣ Testing validateBarcode function:');
  
  const testCases = [
    { input: '1234567890123', expected: true, description: 'Valid 13-digit barcode' },
    { input: '20250807000001', expected: true, description: 'Valid sale barcode' },
    { input: '12345', expected: false, description: 'Too short (5 digits)' },
    { input: '123456789012345678901', expected: false, description: 'Too long (21 digits)' },
    { input: 'abc123def', expected: false, description: 'Contains letters' },
    { input: '', expected: false, description: 'Empty string' },
    { input: '   ', expected: false, description: 'Only spaces' },
    { input: '123456', expected: true, description: 'Minimum valid length' },
    { input: '12345678901234567890', expected: true, description: 'Maximum valid length' }
  ];

  testCases.forEach(testCase => {
    const result = validateBarcode(testCase.input);
    const passed = result.isValid === testCase.expected;
    console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}: "${testCase.input}" -> ${result.isValid ? 'Valid' : result.error}`);
  });

  // Test 2: isSaleBarcode function
  console.log('\n2️⃣ Testing isSaleBarcode function:');
  
  const saleBarcodeTests = [
    { input: '20250807000001', expected: true, description: 'Valid sale barcode' },
    { input: '20241225000123', expected: true, description: 'Christmas sale barcode' },
    { input: '1234567890123', expected: false, description: 'Regular 13-digit barcode' },
    { input: '202508070000', expected: false, description: 'Too short for sale barcode' },
    { input: '202508070000123', expected: false, description: 'Too long for sale barcode' },
    { input: '20251301000001', expected: false, description: 'Invalid month (13)' },
    { input: '20250832000001', expected: false, description: 'Invalid day (32)' },
    { input: '19990101000001', expected: false, description: 'Year too old (1999)' }
  ];

  saleBarcodeTests.forEach(testCase => {
    const result = isSaleBarcode(testCase.input);
    const passed = result === testCase.expected;
    console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}: "${testCase.input}" -> ${result}`);
  });

  // Test 3: formatBarcodeForDisplay function
  console.log('\n3️⃣ Testing formatBarcodeForDisplay function:');
  
  const formatTests = [
    { input: '20250807000001', expected: '2025-08-07-000001', description: 'Sale barcode formatting' },
    { input: '1234567890123', expected: '1234 5678 9012 3', description: 'Regular barcode formatting' },
    { input: '123456', expected: '1234 56', description: 'Short barcode formatting' }
  ];

  formatTests.forEach(testCase => {
    const result = formatBarcodeForDisplay(testCase.input);
    const passed = result === testCase.expected;
    console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}: "${testCase.input}" -> "${result}"`);
  });

  // Test 4: generateSaleBarcode function
  console.log('\n4️⃣ Testing generateSaleBarcode function:');
  
  const testDate = new Date('2025-08-07');
  const generatedBarcode = generateSaleBarcode(123, testDate);
  const expectedPattern = /^20250807000123$/;
  const passed = expectedPattern.test(generatedBarcode);
  console.log(`  ${passed ? '✅' : '❌'} Generate sale barcode for ID 123 on 2025-08-07: "${generatedBarcode}"`);

  // Test 5: parseSaleBarcode function
  console.log('\n5️⃣ Testing parseSaleBarcode function:');
  
  const parseResult = parseSaleBarcode('20250807000123');
  if (parseResult) {
    const dateMatches = parseResult.date.getFullYear() === 2025 && 
                       parseResult.date.getMonth() === 7 && // August (0-indexed)
                       parseResult.date.getDate() === 7;
    const idMatches = parseResult.saleId === 123;
    console.log(`  ${dateMatches && idMatches ? '✅' : '❌'} Parse sale barcode: Date=${parseResult.date.toISOString().split('T')[0]}, ID=${parseResult.saleId}`);
  } else {
    console.log('  ❌ Failed to parse sale barcode');
  }

  // Test 6: cleanBarcodeInput function
  console.log('\n6️⃣ Testing cleanBarcodeInput function:');
  
  const cleanTests = [
    { input: '1234567890', expected: '1234567890', description: 'Already clean numeric' },
    { input: 'é"\'(-è_ç', expected: '2345678', description: 'French keyboard mapping' },
    { input: '123-456-789', expected: '123456789', description: 'Remove dashes' },
    { input: 'ABC123DEF456', expected: '123456', description: 'Extract numbers from mixed' }
  ];

  cleanTests.forEach(testCase => {
    const result = cleanBarcodeInput(testCase.input);
    const passed = result === testCase.expected;
    console.log(`  ${passed ? '✅' : '❌'} ${testCase.description}: "${testCase.input}" -> "${result}"`);
  });

  console.log('\n✅ Barcode validation utilities test completed!');
}

// Run the tests
try {
  testBarcodeValidation();
} catch (error) {
  console.error('❌ Error running tests:', error.message);
  console.log('⚠️ Note: This test requires the barcode-utils module to be compiled from TypeScript');
}
