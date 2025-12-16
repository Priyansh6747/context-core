var nlp = require('compromise');

/**
 * Results Extraction Module (v1.0 - Production Grade)
 * Extracts outcomes caused by events.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. BLOCKLISTS AND KNOWLEDGE BASES
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

function safeClone(match) {
    try {
        if (!match || typeof match.clone !== 'function') return null;
        return match.clone();
    } catch (e) {
        return null;
    }
}

function safeRemove(match, pattern) {
    try {
        if (!match || typeof match.remove !== 'function') return match;
        return match.remove(pattern);
    } catch (e) {
        return match;
    }
}

// ==========================================
// 3. CORE VALIDATION
// ==========================================

function validateResult(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 3) return null;
        if (clean.length > 200) return null;

        if (arrayContains(RESULT_BLOCKLIST, clean)) return null;

        if (!/[a-zA-Z]{2,}/.test(clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

// ==========================================
// 4. EXTRACTION STRATEGIES
// ==========================================

function extractCausalResults(doc) {
    var results = [];

    try {
        if (!doc) return results;

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
                            outcome: safeTrim(outcomePart),
                            source: safeTrim(sourcePart)
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
                            outcome: verbMatch[1].toLowerCase() + ' ' + safeTrim(targetPart),
                            source: safeTrim(sourcePart)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(the|a|an)? .+ (succeeded|failed|passed|completed|finished|worked)',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var verbMatch = text.match(/\b(succeeded|failed|passed|completed|finished|worked)\b/i);
                        if (!verbMatch) return null;

                        var sourcePart = text.split(verbMatch[0])[0];
                        sourcePart = safeTrim(sourcePart);
                        sourcePart = sourcePart.replace(/^(the|a|an)\s+/i, '');

                        return {
                            outcome: verbMatch[1].toLowerCase(),
                            source: safeTrim(sourcePart)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (passed|cleared|completed|finished|failed) .+',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var verbMatch = text.match(/\b(passed|cleared|completed|finished|failed)\b/i);
                        if (!verbMatch) return null;

                        var parts = text.split(verbMatch[0]);
                        if (parts.length < 2) return null;

                        var targetPart = safeTrim(parts[1]);
                        targetPart = targetPart.split(/[.;]/)[0];

                        return {
                            outcome: verbMatch[1].toLowerCase() + ' ' + safeTrim(targetPart),
                            source: 'user action'
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(after|when|once) .+ (,|then)? .+ (happened|occurred|worked|broke)',
                confidence: 0.80,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var triggerMatch = text.match(/\b(after|when|once)\b/i);
                        var outcomeMatch = text.match(/\b(happened|occurred|worked|broke)\b/i);

                        if (!triggerMatch || !outcomeMatch) return null;

                        var middlePart = text.substring(
                            text.indexOf(triggerMatch[0]) + triggerMatch[0].length,
                            text.indexOf(outcomeMatch[0])
                        );

                        middlePart = safeTrim(middlePart.replace(/[,]/g, ''));

                        return {
                            outcome: outcomeMatch[1].toLowerCase(),
                            source: safeTrim(middlePart)
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

                        var validOutcome = validateResult(parsed.outcome);
                        var validSource = validateResult(parsed.source);

                        if (!validOutcome || !validSource) return;

                        results.push({
                            outcome: validOutcome,
                            source: validSource,
                            raw: safeGetText(m),
                            confidence: strat.confidence
                        });
                    } catch (e) {
                        // Skip individual match errors
                    }
                });
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

// ==========================================
// 5. DEDUPLICATION
// ==========================================

function deduplicateResults(results) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < results.length; i++) {
            var item = results[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.outcome || !item.source) continue;

            var normalizedOutcome = safeLowerCase(item.outcome).substring(0, 50);
            var key = normalizedOutcome;

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
// 6. MAIN EXECUTION
// ==========================================

/**
 * Main Extraction Function
 * @param {string} text - Input text to extract results from
 * @returns {Array} Array of extracted results
 */
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

        var results = extractCausalResults(doc);

        return deduplicateResults(results);
    } catch (e) {
        return [];
    }
}

module.exports = { extractResults: extractResults };
