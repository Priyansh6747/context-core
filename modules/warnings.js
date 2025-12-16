var nlp = require('compromise');

/**
 * Warnings Extraction Module (v1.0 - Production Grade)
 * Extracts risk signals or danger awareness.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var WARNING_TYPES = {
    data_loss: {
        patterns: ['lose data', 'losing data', 'data loss', 'wipe data', 'delete data', 'erase data', 'lose files', 'losing files', 'lost data', 'lost files', 'don\'t want to lose'],
        keywords: ['data', 'files', 'documents', 'backup', 'wipe', 'delete', 'erase', 'lost']
    },
    security: {
        patterns: ['is it safe', 'is this safe', 'is it secure', 'security risk', 'security concern', 'privacy concern', 'worried about security', 'data breach', 'hack', 'hacked', 'malware', 'virus'],
        keywords: ['security', 'secure', 'safe', 'privacy', 'breach', 'hack', 'malware', 'virus', 'password']
    },
    irreversible: {
        patterns: ['can\'t undo', 'cannot undo', 'no undo', 'irreversible', 'permanent', 'can\'t go back', 'cannot go back', 'point of no return', 'no way back'],
        keywords: ['undo', 'irreversible', 'permanent', 'forever', 'revert']
    },
    breaking: {
        patterns: ['might break', 'could break', 'will break', 'break things', 'breaking change', 'breaking something', 'cause issues', 'cause problems'],
        keywords: ['break', 'breaking', 'broken', 'crash', 'fail']
    },
    general: {
        patterns: ['worried about', 'concerned about', 'afraid of', 'fear of', 'scared of', 'nervous about', 'risky', 'dangerous', 'be careful'],
        keywords: ['worried', 'concerned', 'afraid', 'fear', 'scared', 'nervous', 'risky', 'dangerous', 'careful', 'warning']
    }
};

var WARNING_BLOCKLIST = [
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

function validateRelatedTo(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 2) return null;
        if (clean.length > 100) return null;

        if (arrayContains(WARNING_BLOCKLIST, clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function detectWarningType(text) {
    try {
        var lowerText = safeLowerCase(text);

        // Check patterns first (higher confidence)
        for (var warningType in WARNING_TYPES) {
            if (WARNING_TYPES.hasOwnProperty(warningType)) {
                var config = WARNING_TYPES[warningType];
                if (containsAny(lowerText, config.patterns)) {
                    return { type: warningType, confidence: 0.90 };
                }
            }
        }

        // Check keywords (lower confidence)
        for (var warningType2 in WARNING_TYPES) {
            if (WARNING_TYPES.hasOwnProperty(warningType2)) {
                var config2 = WARNING_TYPES[warningType2];
                if (containsAny(lowerText, config2.keywords)) {
                    return { type: warningType2, confidence: 0.70 };
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

function extractWarningSignals(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(i\'m|im|i am) (worried|concerned|afraid|scared|nervous) (about|of) .+',
                type: 'general',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i\'m|im|i am)');
                        d = safeRemove(d, '(worried|concerned|afraid|scared|nervous)');
                        d = safeRemove(d, '(about|of)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|and|because)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) don\'t want to (lose|delete|wipe|erase) .+',
                type: 'data_loss',
                confidence: 0.95,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, 'don\'t want to');
                        d = safeRemove(d, '(lose|delete|wipe|erase)');

                        var text = safeGetText(d);
                        return safeTrim(text);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(is this|is it) (safe|secure)',
                type: 'security',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        return null; // No specific target, general security concern
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(this is|it\'s|its) (irreversible|permanent)',
                type: 'irreversible',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        return 'action';
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(can\'t|cannot|won\'t be able to) undo',
                type: 'irreversible',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        return 'action';
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(might|could|will) (break|crash|fail) .+',
                type: 'breaking',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(might|could|will)');
                        d = safeRemove(d, '(break|crash|fail)');

                        var text = safeGetText(d);
                        return safeTrim(text);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(data|file) (loss|deletion)',
                type: 'data_loss',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        return 'data';
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(careful|caution|warning|danger)',
                type: 'general',
                confidence: 0.75,
                parse: function (m) {
                    try {
                        return null;
                    } catch (e) {
                        return null;
                    }
                }
            }
        ];

        var foundTypes = {};

        for (var i = 0; i < strategies.length; i++) {
            var strat = strategies[i];

            try {
                var matches = doc.match(strat.match);
                if (!matches) continue;

                matches.forEach(function (m) {
                    try {
                        var relatedTo = strat.parse(m);
                        var validRelatedTo = validateRelatedTo(relatedTo);

                        // Override type based on content
                        var rawText = safeGetText(m);
                        var detectedType = detectWarningType(rawText);
                        var finalType = detectedType ? detectedType.type : strat.type;

                        if (!foundTypes[finalType]) {
                            foundTypes[finalType] = true;

                            results.push({
                                type: finalType,
                                related_to: validRelatedTo,
                                raw: rawText,
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

        // Also do a general scan for warning keywords
        if (results.length === 0) {
            var detectedWarning = detectWarningType(text);
            if (detectedWarning) {
                results.push({
                    type: detectedWarning.type,
                    related_to: null,
                    raw: text.substring(0, 100),
                    confidence: detectedWarning.confidence
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

function deduplicateWarnings(warnings) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < warnings.length; i++) {
            var item = warnings[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type) continue;

            var key = item.type;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    related_to: item.related_to || null,
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
 * @param {string} text - Input text to extract warnings from
 * @returns {Array} Array of extracted warnings
 */
function extractWarnings(text) {
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

        var warnings = extractWarningSignals(doc, text);

        return deduplicateWarnings(warnings);
    } catch (e) {
        return [];
    }
}

module.exports = { extractWarnings: extractWarnings };
