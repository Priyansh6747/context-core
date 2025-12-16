"use strict";

/**
 * Test file for context-core extraction modules
 */

var contextCore = require('./index');

// ==========================================
// TEST UTILITIES
// ==========================================

var testsPassed = 0;
var testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log('✓ ' + name);
        testsPassed++;
    } catch (e) {
        console.log('✗ ' + name);
        console.log('  Error: ' + e.message);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertArrayLength(arr, minLength, message) {
    if (!Array.isArray(arr) || arr.length < minLength) {
        throw new Error(message || 'Expected array with at least ' + minLength + ' items, got ' + (arr ? arr.length : 'not an array'));
    }
}

function assertHasProperty(obj, prop, message) {
    if (!obj || typeof obj !== 'object' || !(prop in obj)) {
        throw new Error(message || 'Expected object to have property: ' + prop);
    }
}

// ==========================================
// PREFERENCES TESTS
// ==========================================

console.log('\n=== PREFERENCES MODULE ===');

test('extracts positive preference with "prefer"', function () {
    var result = contextCore.extractPreferences('I prefer dark mode over light mode');
    assertArrayLength(result, 1, 'Should extract at least one preference');
    assert(result[0].polarity === 'positive', 'Should be positive polarity');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts negative preference with "dislike"', function () {
    var result = contextCore.extractPreferences('I dislike working at night');
    assertArrayLength(result, 1, 'Should extract at least one preference');
    assert(result[0].polarity === 'negative', 'Should be negative polarity');
});

test('extracts default preference with "usually"', function () {
    var result = contextCore.extractPreferences('I usually use Linux over Windows');
    assertArrayLength(result, 1, 'Should extract at least one preference');
});

// ==========================================
// EXPERIENCES TESTS
// ==========================================

console.log('\n=== EXPERIENCES MODULE ===');

test('extracts experience with "worked with"', function () {
    var result = contextCore.extractExperiences('I\'ve worked with distributed systems before');
    assertArrayLength(result, 1, 'Should extract at least one experience');
    assertHasProperty(result[0], 'description', 'Should have description');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts experience with "faced"', function () {
    var result = contextCore.extractExperiences('I faced data loss once');
    assertArrayLength(result, 1, 'Should extract at least one experience');
});

test('extracts experience with "previously built"', function () {
    var result = contextCore.extractExperiences('I previously built a game engine before');
    assertArrayLength(result, 1, 'Should extract at least one experience');
});

// ==========================================
// FACTS TESTS
// ==========================================

console.log('\n=== FACTS MODULE ===');

test('extracts fact with "my X is Y"', function () {
    var result = contextCore.extractFacts('My data is cloud backed');
    assertArrayLength(result, 1, 'Should extract at least one fact');
    assertHasProperty(result[0], 'key', 'Should have key');
    assertHasProperty(result[0], 'value', 'Should have value');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts fact with location', function () {
    var result = contextCore.extractFacts('I live in Bangalore');
    assertArrayLength(result, 1, 'Should extract at least one fact');
});

test('extracts fact with "this project"', function () {
    var result = contextCore.extractFacts('This project is open source');
    assertArrayLength(result, 1, 'Should extract at least one fact');
});

// ==========================================
// RESULTS TESTS
// ==========================================

console.log('\n=== RESULTS MODULE ===');

test('extracts result with causal verb', function () {
    var result = contextCore.extractResults('The reset wiped my data');
    assertArrayLength(result, 1, 'Should extract at least one result');
    assertHasProperty(result[0], 'outcome', 'Should have outcome');
    assertHasProperty(result[0], 'source', 'Should have source');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts result with "succeeded"', function () {
    var result = contextCore.extractResults('The build succeeded');
    assertArrayLength(result, 1, 'Should extract at least one result');
});

test('extracts result with "passed"', function () {
    var result = contextCore.extractResults('I passed the exam');
    assertArrayLength(result, 1, 'Should extract at least one result');
});

// ==========================================
// INTENTS TESTS
// ==========================================

console.log('\n=== INTENTS MODULE ===');

test('extracts ask intent from question', function () {
    var result = contextCore.extractIntents('How do I fix this error?');
    assertArrayLength(result, 1, 'Should extract at least one intent');
    assert(result[0].type === 'ask', 'Should be ask type');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts debug intent', function () {
    var result = contextCore.extractIntents('I\'m debugging this issue');
    assertArrayLength(result, 1, 'Should extract at least one intent');
    assert(result[0].type === 'debug', 'Should be debug type');
});

test('extracts decide intent', function () {
    var result = contextCore.extractIntents('Should I use React or Vue?');
    assertArrayLength(result, 1, 'Should extract at least one intent');
    assert(result[0].type === 'decide', 'Should be decide type');
});

test('extracts explore intent', function () {
    var result = contextCore.extractIntents('I\'m exploring new frameworks');
    assertArrayLength(result, 1, 'Should extract at least one intent');
    assert(result[0].type === 'explore', 'Should be explore type');
});

// ==========================================
// CONSTRAINTS TESTS
// ==========================================

console.log('\n=== CONSTRAINTS MODULE ===');

test('extracts device constraint', function () {
    var result = contextCore.extractConstraints('I\'m on mobile right now');
    assertArrayLength(result, 1, 'Should extract at least one constraint');
    assert(result[0].type === 'device', 'Should be device type');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts time constraint', function () {
    var result = contextCore.extractConstraints('I\'m in a hurry');
    assertArrayLength(result, 1, 'Should extract at least one constraint');
    assert(result[0].type === 'time', 'Should be time type');
});

test('extracts connectivity constraint', function () {
    var result = contextCore.extractConstraints('I have no internet right now');
    assertArrayLength(result, 1, 'Should extract at least one constraint');
    assert(result[0].type === 'connectivity', 'Should be connectivity type');
});

// ==========================================
// WARNINGS TESTS
// ==========================================

console.log('\n=== WARNINGS MODULE ===');

test('extracts data loss warning', function () {
    var result = contextCore.extractWarnings('I\'m worried about losing my files');
    assertArrayLength(result, 1, 'Should extract at least one warning');
    assert(result[0].type === 'data_loss' || result[0].type === 'general', 'Should be data_loss or general type');
    assert(result[0].confidence < 1, 'Confidence should be less than 1');
});

test('extracts security warning', function () {
    var result = contextCore.extractWarnings('Is this safe?');
    assertArrayLength(result, 1, 'Should extract at least one warning');
    assert(result[0].type === 'security', 'Should be security type');
});

test('extracts irreversible warning', function () {
    var result = contextCore.extractWarnings('This is irreversible');
    assertArrayLength(result, 1, 'Should extract at least one warning');
    assert(result[0].type === 'irreversible', 'Should be irreversible type');
});

// ==========================================
// UNIFIED EXTRACTION TEST
// ==========================================

console.log('\n=== UNIFIED extractContext() ===');

test('extracts multiple types from mixed input', function () {
    var input = 'I like dark mode. I\'m on mobile and short on time. How do I fix this error? I\'m worried about losing my data.';
    var result = contextCore.extractContext(input);

    assertHasProperty(result, 'preferences', 'Should have preferences');
    assertHasProperty(result, 'constraints', 'Should have constraints');
    assertHasProperty(result, 'intents', 'Should have intents');
    assertHasProperty(result, 'warnings', 'Should have warnings');
    assertHasProperty(result, 'meta', 'Should have meta');

    assertArrayLength(result.preferences, 1, 'Should extract preferences');
    assertArrayLength(result.constraints, 1, 'Should extract constraints');
    assertArrayLength(result.intents, 1, 'Should extract intents');
    assertArrayLength(result.warnings, 1, 'Should extract warnings');
});

test('returns empty arrays for no matches', function () {
    var result = contextCore.extractContext('Hello world.');

    assert(Array.isArray(result.preferences), 'Should return preferences array');
    assert(Array.isArray(result.intents), 'Should return intents array');
    assert(Array.isArray(result.constraints), 'Should return constraints array');
    assert(Array.isArray(result.warnings), 'Should return warnings array');
});

test('handles empty input gracefully', function () {
    var result = contextCore.extractContext('');

    assertHasProperty(result, 'meta', 'Should have meta even for empty input');
    assert(Array.isArray(result.preferences), 'Should return preferences array');
});

test('meta contains required fields', function () {
    var result = contextCore.extractContext('Test input', { source: 'test' });

    assertHasProperty(result.meta, 'source', 'Meta should have source');
    assertHasProperty(result.meta, 'parser_version', 'Meta should have parser_version');
    assertHasProperty(result.meta, 'timestamp', 'Meta should have timestamp');
    assert(result.meta.source === 'test', 'Source should match provided option');
});

// ==========================================
// SUMMARY
// ==========================================

console.log('\n===========================================');
console.log('Tests Passed: ' + testsPassed);
console.log('Tests Failed: ' + testsFailed);
console.log('===========================================\n');

process.exit(testsFailed > 0 ? 1 : 0);
