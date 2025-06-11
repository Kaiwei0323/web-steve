// Test function to verify Super Mode display
function testSuperModeDisplay() {
    console.log('Testing Super Mode display...');
    
    // Test cases
    const testCases = [
        { status: null, expected: 'Super Mode: Disabled' },
        { status: 'Enable', expected: 'Super Mode: Enabled' },
        { status: 'enable', expected: 'Super Mode: Enabled' },
        { status: 'enabled', expected: 'Super Mode: Enabled' },
        { status: 'Disable', expected: 'Super Mode: Disabled' },
        { status: 'disable', expected: 'Super Mode: Disabled' },
        { status: 'disabled', expected: 'Super Mode: Disabled' },
        { status: '', expected: 'Super Mode: Disabled' }
    ];
    
    // Run tests
    let passedTests = 0;
    let failedTests = 0;
    
    testCases.forEach((testCase, index) => {
        const result = formatStatus(testCase.status);
        const passed = result === testCase.expected;
        
        console.log(`Test ${index + 1}: ${passed ? 'PASSED' : 'FAILED'}`);
        console.log(`  Input: ${testCase.status === null ? 'null' : testCase.status}`);
        console.log(`  Expected: ${testCase.expected}`);
        console.log(`  Got: ${result}`);
        
        if (passed) {
            passedTests++;
        } else {
            failedTests++;
        }
    });
    
    // Print summary
    console.log('\nTest Summary:');
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    
    return passedTests === testCases.length;
}

// Run the test
testSuperModeDisplay(); 