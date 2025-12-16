var nlp = require('compromise');

/**
 * Constraints Extraction Module (v1.0 - Production Grade)
 * Extracts temporary limitations or blockers.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var CONSTRAINT_TYPES = {
    device: {
        patterns: ['on mobile', 'on phone', 'on tablet', 'using phone', 'using tablet', 'mobile device', 'on my phone', 'from phone'],
        keywords: ['mobile', 'phone', 'tablet', 'iphone', 'android', 'ipad']
    },
    connectivity: {
        patterns: ['no internet', 'no wifi', 'no connection', 'offline', 'bad connection', 'slow internet', 'limited internet', 'poor connection'],
        keywords: ['internet', 'wifi', 'offline', 'connection', 'network']
    },
    power: {
        patterns: ['low battery', 'battery dying', 'about to die', 'running out of battery', 'need to charge'],
        keywords: ['battery', 'power', 'charge', 'charging']
    },
    time: {
        patterns: ['short on time', 'in a hurry', 'no time', 'limited time', 'running late', 'only have', 'quick', 'urgent', 'asap'],
        keywords: ['time', 'hurry', 'urgent', 'quick', 'rush', 'deadline']
    },
    access: {
        patterns: ['can\'t access', 'no access', 'don\'t have access', 'locked out', 'can\'t use', 'can\'t open', 'blocked', 'restricted'],
        keywords: ['access', 'locked', 'blocked', 'restricted', 'unavailable']
    },
    resource: {
        patterns: ['low memory', 'low storage', 'out of space', 'limited resources', 'low disk', 'running low'],
        keywords: ['memory', 'storage', 'space', 'disk', 'ram']
    }
};

var CONSTRAINT_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing'
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

function validateConstraint(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 3) return null;
        if (clean.length > 150) return null;

        if (arrayContains(CONSTRAINT_BLOCKLIST, clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function detectConstraintType(text) {
    try {
        var lowerText = safeLowerCase(text);

        for (var constraintType in CONSTRAINT_TYPES) {
            if (CONSTRAINT_TYPES.hasOwnProperty(constraintType)) {
                var config = CONSTRAINT_TYPES[constraintType];
                if (containsAny(lowerText, config.patterns)) {
                    return { type: constraintType, confidence: 0.90 };
                }
                if (containsAny(lowerText, config.keywords)) {
                    return { type: constraintType, confidence: 0.75 };
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// 4. EXTRACTION STRATEGIES
// ==========================================

function extractConstraints(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(i\'m|im|i am) (on|using) (my)? (mobile|phone|tablet)',
                type: 'device',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(no|don\'t have|without) (internet|wifi|connection)',
                type: 'connectivity',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(low|dying|dead) battery',
                type: 'power',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(short on|limited|no|don\'t have much) time',
                type: 'time',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(in a|i\'m in a) (hurry|rush)',
                type: 'time',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(can\'t|cannot|don\'t have) access (to)?',
                type: 'access',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(low|limited|out of) (memory|storage|space|disk)',
                type: 'resource',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(right now|currently|at the moment) (i|we)? (can\'t|cannot|don\'t)',
                type: 'access',
                confidence: 0.80,
                parse: function (m) {
                    try {
                        return safeGetText(m);
                    } catch (e) {
                        return null;
                    }
                }
            }
        ];

        var foundConstraints = {};

        for (var i = 0; i < strategies.length; i++) {
            var strat = strategies[i];

            try {
                var matches = doc.match(strat.match);
                if (!matches) continue;

                matches.forEach(function (m) {
                    try {
                        var description = strat.parse(m);
                        var validDesc = validateConstraint(description);

                        if (validDesc && !foundConstraints[strat.type]) {
                            foundConstraints[strat.type] = true;

                            results.push({
                                type: strat.type,
                                description: validDesc,
                                raw: safeGetText(m),
                                confidence: strat.confidence
                            });
                        }
                    } catch (e) {
                        // Skip individual match errors
                    }
                });
            } catch (e) {
                continue;
            }
        }

        // Also do a general scan for constraint keywords
        if (results.length === 0) {
            var detectedType = detectConstraintType(text);
            if (detectedType) {
                var description = text.substring(0, 100);
                results.push({
                    type: detectedType.type,
                    description: safeTrim(description),
                    raw: description,
                    confidence: detectedType.confidence
                });
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

function deduplicateConstraints(constraints) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < constraints.length; i++) {
            var item = constraints[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type || !item.description) continue;

            var key = item.type;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    description: item.description,
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
 * @param {string} text - Input text to extract constraints from
 * @returns {Array} Array of extracted constraints
 */
function extractConstraintsFromText(text) {
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

        var constraints = extractConstraints(doc, text);

        return deduplicateConstraints(constraints);
    } catch (e) {
        return [];
    }
}

module.exports = { extractConstraints: extractConstraintsFromText };
