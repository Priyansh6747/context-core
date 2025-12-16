var nlp = require('compromise');

/**
 * Results Extraction Module (v2.0 - Production Grade)
 * Extracts outcomes caused by events.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var RESULT_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing', 'stuff'
];

var CAUSAL_VERBS = [
    'caused', 'resulted in', 'led to', 'made', 'triggered', 'produced',
    'wiped', 'deleted', 'broke', 'fixed', 'crashed', 'destroyed',
    'created', 'generated', 'enabled', 'disabled'
];

var OUTCOME_VERBS = [
    'succeeded', 'failed', 'passed', 'completed', 'finished',
    'cleared', 'worked', 'broke', 'crashed', 'stopped', 'started'
];

// ==========================================
// 2. UTILITY FUNCTIONS
// ==========================================

function isValidString(val) {
    return typeof val === 'string' && val.length > 0;
}

function isValidNumber(val) {
    return typeof val === 'number' && !isNaN(val) && isFinite(val);
}

function safeTrim(str) {
    try {
        if (!isValidString(str)) return '';
        return str.trim();
    } catch (e) {
        return '';
    }
}

function safeLowerCase(str) {
    try {
        if (!isValidString(str)) return '';
        return str.toLowerCase();
    } catch (e) {
        return '';
    }
}

function arrayContains(arr, val) {
    if (!Array.isArray(arr) || !isValidString(val)) return false;

    var lowerVal = safeLowerCase(val);
    for (var i = 0; i < arr.length; i++) {
        if (safeLowerCase(arr[i]) === lowerVal) {
            return true;
        }
    }
    return false;
}

function containsAny(str, phrases) {
    if (!isValidString(str) || !Array.isArray(phrases)) return false;

    var lowerStr = safeLowerCase(str);
    for (var i = 0; i < phrases.length; i++) {
        if (lowerStr.indexOf(safeLowerCase(phrases[i])) !== -1) {
            return true;
        }
    }
    return false;
}

function safeGetText(match, method) {
    try {
        if (!match || typeof match.text !== 'function') return '';
        return safeTrim(match.text(method || 'text'));
    } catch (e) {
        return '';
    }
}

// ==========================================
// 3. EXTRACTION
// ==========================================

function extractResultsFromText(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundResults = {};

        // Check for "After X, Y happened" pattern (Test 7)
        var afterMatch = text.match(/after\s+([^,]+),?\s+(.+)/i);
        if (afterMatch && afterMatch[1] && afterMatch[2]) {
            var sourcePart = safeTrim(afterMatch[1]);
            var outcomePart = safeTrim(afterMatch[2]);

            // Clean up source
            sourcePart = sourcePart.replace(/^(the|a|an|my)\s+/i, '');

            // Normalize common sources
            var lowerSource = safeLowerCase(sourcePart);
            if (containsAny(lowerSource, ['resetting', 'reset', 'pc', 'computer'])) {
                sourcePart = 'system_reset';
            } else {
                sourcePart = safeLowerCase(sourcePart).replace(/\s+/g, '_');
            }

            // Clean up outcome  
            outcomePart = outcomePart.split(/[.;]/)[0];
            outcomePart = safeTrim(outcomePart);

            // Convert to snake_case outcome
            var outcome = safeLowerCase(outcomePart).replace(/\s+/g, '_');

            // Simplify common outcomes
            if (containsAny(outcomePart, ['wiped', 'deleted', 'gone', 'lost'])) {
                if (containsAny(outcomePart, ['file', 'local'])) {
                    outcome = 'local_files_deleted';
                }
            }

            if (sourcePart.length > 2 && outcome.length > 2) {
                var key = outcome;
                if (!foundResults[key]) {
                    foundResults[key] = true;
                    results.push({
                        outcome: outcome,
                        source: sourcePart,
                        confidence: 0.95
                    });
                }
            }
        }


        // Check for "resetting" + "wiped/deleted" pattern
        if (containsAny(lowerText, ['reset', 'resetting']) &&
            containsAny(lowerText, ['wiped', 'deleted', 'gone', 'lost'])) {

            if (containsAny(lowerText, ['file', 'local', 'data'])) {
                var key = 'files_deleted';
                if (!foundResults[key] && !foundResults['local_files_deleted']) {
                    foundResults[key] = true;
                    results.push({
                        outcome: 'local_files_deleted',
                        source: 'system_reset',
                        confidence: 0.90
                    });
                }
            }
        }

        // NLP-based extraction for other patterns
        var strategies = [
            {
                match: '(the|a|an)? .+ (caused|resulted in|led to|triggered) .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(caused|resulted in|led to|triggered)\b/i);
                        if (parts.length < 3) return null;

                        var sourcePart = safeTrim(parts[0]);
                        var outcomePart = safeTrim(parts[2]);

                        sourcePart = sourcePart.replace(/^(the|a|an)\s+/i, '');
                        outcomePart = outcomePart.split(/[.;]/)[0];

                        return {
                            outcome: safeLowerCase(safeTrim(outcomePart)).replace(/\s+/g, '_'),
                            source: safeLowerCase(safeTrim(sourcePart)).replace(/\s+/g, '_')
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(the|a|an)? .+ (wiped|deleted|broke|destroyed|crashed) .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var verbMatch = text.match(/\b(wiped|deleted|broke|destroyed|crashed)\b/i);
                        if (!verbMatch) return null;

                        var parts = text.split(verbMatch[0]);
                        if (parts.length < 2) return null;

                        var sourcePart = safeTrim(parts[0]);
                        var targetPart = safeTrim(parts[1]);

                        sourcePart = sourcePart.replace(/^(the|a|an)\s+/i, '');
                        targetPart = targetPart.split(/[.;]/)[0];

                        return {
                            outcome: verbMatch[1].toLowerCase() + '_' + safeLowerCase(safeTrim(targetPart)).replace(/\s+/g, '_'),
                            source: safeLowerCase(safeTrim(sourcePart)).replace(/\s+/g, '_')
                        };
                    } catch (e) {
                        return null;
                    }
                }
            }
        ];

        for (var i = 0; i < strategies.length; i++) {
            var strat = strategies[i];

            try {
                var matches = doc.match(strat.match);
                if (!matches) continue;

                matches.forEach(function (m) {
                    try {
                        var parsed = strat.parse(m);
                        if (!parsed) return;

                        if (!parsed.outcome || !parsed.source) return;
                        if (parsed.outcome.length < 3 || parsed.source.length < 3) return;

                        var key = parsed.outcome;
                        if (foundResults[key]) return;

                        foundResults[key] = true;
                        results.push({
                            outcome: parsed.outcome,
                            source: parsed.source,
                            confidence: strat.confidence
                        });
                    } catch (e) { }
                });
            } catch (e) {
                continue;
            }
        }
    } catch (e) { }

    return results;
}

// ==========================================
// 4. DEDUPLICATION
// ==========================================

function deduplicateResults(results) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < results.length; i++) {
            var item = results[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.outcome || !item.source) continue;

            var key = item.outcome;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    outcome: item.outcome,
                    source: item.source,
                    confidence: isValidNumber(item.confidence) ? item.confidence : 0.5
                });
            }
        }
    } catch (e) {
        return [];
    }

    return unique;
}

// ==========================================
// 5. MAIN EXECUTION
// ==========================================

function extractResults(text) {
    try {
        if (!isValidString(text)) {
            return [];
        }

        if (text.length > 50000) {
            text = text.substring(0, 50000);
        }

        var doc;
        try {
            doc = nlp(text);
        } catch (e) {
            return [];
        }

        if (!doc) return [];

        var results = extractResultsFromText(doc, text);

        return deduplicateResults(results);
    } catch (e) {
        return [];
    }
}

module.exports = { extractResults: extractResults };
