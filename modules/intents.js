var nlp = require('compromise');

/**
 * Intents Extraction Module (v1.0 - Production Grade)
 * Extracts what the user is trying to do right now.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var INTENT_PATTERNS = {
    ask: {
        patterns: ['how do', 'how can', 'how to', 'what is', 'what are', 'why is', 'why does', 'where is', 'when should', 'can you', 'could you', 'would you', 'please help', 'i need help', 'help me'],
        indicators: ['?']
    },
    debug: {
        patterns: ['debugging', 'trying to fix', 'fixing', 'troubleshooting', 'not working', 'broken', 'error', 'bug', 'issue', 'problem with', 'failing', 'crashed', 'doesn\'t work', 'can\'t get', 'won\'t work'],
        indicators: []
    },
    explore: {
        patterns: ['exploring', 'looking into', 'researching', 'investigating', 'curious about', 'wondering about', 'checking out', 'learning about', 'trying out', 'experimenting with'],
        indicators: []
    },
    decide: {
        patterns: ['should i', 'which is better', 'or should', 'vs', 'versus', 'compare', 'comparing', 'between', 'choosing', 'decide', 'deciding', 'which one', 'what would you'],
        indicators: []
    },
    learn: {
        patterns: ['want to understand', 'trying to learn', 'learning', 'studying', 'teach me', 'explain', 'what does', 'how does', 'understanding', 'need to know'],
        indicators: []
    }
};

var INTENT_BLOCKLIST = [
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

function validateTarget(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 2) return null;
        if (clean.length > 150) return null;

        if (arrayContains(INTENT_BLOCKLIST, clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function detectIntentType(text) {
    try {
        var lowerText = safeLowerCase(text);

        // Check for question marks first (strong ask indicator)
        if (text.indexOf('?') !== -1) {
            // But also check for decision patterns
            if (containsAny(lowerText, INTENT_PATTERNS.decide.patterns)) {
                return { type: 'decide', confidence: 0.90 };
            }
            return { type: 'ask', confidence: 0.85 };
        }

        // Check each intent type
        for (var intentType in INTENT_PATTERNS) {
            if (INTENT_PATTERNS.hasOwnProperty(intentType)) {
                if (containsAny(lowerText, INTENT_PATTERNS[intentType].patterns)) {
                    var conf = 0.80;
                    if (intentType === 'debug') conf = 0.85;
                    if (intentType === 'decide') conf = 0.85;
                    return { type: intentType, confidence: conf };
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

function extractIntentTargets(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var intentInfo = detectIntentType(text);
        if (!intentInfo) return results;

        var strategies = [
            {
                match: '(how do i|how can i|how to) .+',
                intentType: 'ask',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(how do i|how can i|how to)');

                        var text = safeGetText(d);
                        var candidate = text.split(/[?]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i\'m|im|i am) (trying to|debugging|fixing|troubleshooting) .+',
                intentType: 'debug',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i\'m|im|i am)');
                        d = safeRemove(d, '(trying to|debugging|fixing|troubleshooting)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|and|because)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(should i|which is better|comparing) .+',
                intentType: 'decide',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(should i|which is better|comparing)');

                        var text = safeGetText(d);
                        var candidate = text.split(/[?]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i\'m|im|i am) (exploring|looking into|researching|investigating) .+',
                intentType: 'explore',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i\'m|im|i am)');
                        d = safeRemove(d, '(exploring|looking into|researching|investigating)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|and|because)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i want to|trying to) (understand|learn) .+',
                intentType: 'learn',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i want to|trying to)');
                        d = safeRemove(d, '(understand|learn)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|and|because)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            }
        ];

        var targetFound = false;

        for (var i = 0; i < strategies.length; i++) {
            var strat = strategies[i];

            try {
                var matches = doc.match(strat.match);
                if (!matches) continue;

                matches.forEach(function (m) {
                    try {
                        var rawTarget = strat.parse(m);
                        var validTarget = validateTarget(rawTarget);

                        results.push({
                            type: strat.intentType,
                            target: validTarget,
                            raw: safeGetText(m),
                            confidence: strat.confidence
                        });

                        targetFound = true;
                    } catch (e) {
                        // Skip individual match errors
                    }
                });
            } catch (e) {
                continue;
            }
        }

        // If no specific target found but we detected an intent type
        if (!targetFound && intentInfo) {
            results.push({
                type: intentInfo.type,
                target: null,
                raw: text.substring(0, 100),
                confidence: intentInfo.confidence
            });
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

// ==========================================
// 5. DEDUPLICATION
// ==========================================

function deduplicateIntents(intents) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < intents.length; i++) {
            var item = intents[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type) continue;

            var normalizedTarget = item.target ? safeLowerCase(item.target).substring(0, 40) : 'null';
            var key = item.type + ':' + normalizedTarget;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    target: item.target || null,
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
 * @param {string} text - Input text to extract intents from
 * @returns {Array} Array of extracted intents
 */
function extractIntents(text) {
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

        var intents = extractIntentTargets(doc, text);

        return deduplicateIntents(intents);
    } catch (e) {
        return [];
    }
}

module.exports = { extractIntents: extractIntents };
