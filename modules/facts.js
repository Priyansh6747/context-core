var nlp = require('compromise');

/**
 * Facts Extraction Module (v1.0 - Production Grade)
 * Extracts asserted objective claims.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. BLOCKLISTS AND KNOWLEDGE BASES
// ==========================================

var FACT_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing',
    'stuff', 'things', 'one', 'okay', 'fine', 'good', 'bad'
];

var SUBJECTIVE_WORDS = [
    'think', 'believe', 'feel', 'guess', 'suppose', 'hope',
    'prefer', 'like', 'want', 'wish', 'maybe', 'perhaps'
];

var FACT_CATEGORIES = {
    'location': ['live', 'based', 'located', 'from', 'in', 'at', 'work at'],
    'possession': ['have', 'own', 'got', 'use', 'using'],
    'state': ['is', 'are', 'am', 'was', 'were'],
    'identity': ['called', 'named', 'known as']
};

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

function validateFact(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 2) return null;
        if (clean.length > 200) return null;

        if (arrayContains(FACT_BLOCKLIST, clean)) return null;

        if (!/[a-zA-Z]{2,}/.test(clean)) return null;

        // Check if it contains subjective language
        if (containsAny(clean, SUBJECTIVE_WORDS)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function extractFactKey(text, raw) {
    try {
        var lowerRaw = safeLowerCase(raw);

        // Try to extract key from possessive patterns
        var myMatch = lowerRaw.match(/\b(my|our)\s+(\w+)/);
        if (myMatch && myMatch[2]) {
            return myMatch[2];
        }

        // Try common subject patterns
        var thisMatch = lowerRaw.match(/\b(this|the)\s+(\w+)/);
        if (thisMatch && thisMatch[2]) {
            return thisMatch[2];
        }

        // Default to subject category detection
        for (var category in FACT_CATEGORIES) {
            if (FACT_CATEGORIES.hasOwnProperty(category)) {
                if (containsAny(lowerRaw, FACT_CATEGORIES[category])) {
                    return category;
                }
            }
        }

        return 'general';
    } catch (e) {
        return 'general';
    }
}

function parseFactValue(text) {
    try {
        var clean = safeTrim(text);

        // Try to parse as boolean
        var lowerClean = safeLowerCase(clean);
        if (lowerClean === 'true' || lowerClean === 'yes') return true;
        if (lowerClean === 'false' || lowerClean === 'no') return false;

        // Try to parse as number
        var num = parseFloat(clean);
        if (!isNaN(num) && isFinite(num) && String(num) === clean) {
            return num;
        }

        // Return as string
        return clean;
    } catch (e) {
        return text;
    }
}

// ==========================================
// 4. EXTRACTION STRATEGIES
// ==========================================

function extractObjectiveFacts(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(my|our) .+ (is|are|was|were) .+',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(is|are|was|were)\b/i);
                        if (parts.length < 2) return null;

                        var keyPart = safeTrim(parts[0]);
                        var valuePart = safeTrim(parts[parts.length - 1]);

                        valuePart = valuePart.split(/\b(but|and|however)\b|[.;]/)[0];

                        return {
                            key: keyPart.replace(/^(my|our)\s+/i, ''),
                            value: safeTrim(valuePart)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(this|the) .+ (is|are) .+',
                confidence: 0.80,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(is|are)\b/i);
                        if (parts.length < 2) return null;

                        var keyPart = safeTrim(parts[0]);
                        var valuePart = safeTrim(parts[parts.length - 1]);

                        valuePart = valuePart.split(/\b(but|and|however)\b|[.;]/)[0];

                        return {
                            key: keyPart.replace(/^(this|the)\s+/i, ''),
                            value: safeTrim(valuePart)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (live|work|am based|am located) (in|at) .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(in|at)\b/i);
                        if (parts.length < 2) return null;

                        var locationPart = safeTrim(parts[parts.length - 1]);
                        locationPart = locationPart.split(/\b(but|and|however)\b|[.;]/)[0];

                        return {
                            key: 'location',
                            value: safeTrim(locationPart)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (have|own|use|got) (a|an|the)? .+',
                confidence: 0.80,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(have|own|use|got)');
                        d = safeRemove(d, '(a|an|the)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|and|however|that)\b|[.;]/)[0];

                        return {
                            key: 'possession',
                            value: safeTrim(candidate)
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) am (a|an)? [#Noun+]',
                confidence: 0.75,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, 'am');
                        d = safeRemove(d, '(a|an)');

                        var text = safeGetText(d);

                        return {
                            key: 'identity',
                            value: safeTrim(text)
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
                        if (!parsed || !parsed.value) return;

                        var validValue = validateFact(parsed.value);
                        if (!validValue) return;

                        results.push({
                            key: parsed.key || extractFactKey(validValue, safeGetText(m)),
                            value: parseFactValue(validValue),
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

function deduplicateFacts(facts) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < facts.length; i++) {
            var item = facts[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.key) continue;

            var normalizedKey = safeLowerCase(item.key);
            var normalizedValue = safeLowerCase(String(item.value)).substring(0, 50);
            var key = normalizedKey + ':' + normalizedValue;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    key: item.key,
                    value: item.value,
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
 * @param {string} text - Input text to extract facts from
 * @returns {Array} Array of extracted facts
 */
function extractFacts(text) {
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

        var facts = extractObjectiveFacts(doc);

        return deduplicateFacts(facts);
    } catch (e) {
        return [];
    }
}

module.exports = { extractFacts: extractFacts };
