var nlp = require('compromise');

/**
 * Experiences Extraction Module (v2.0 - Production Grade)
 * Extracts past events with lasting relevance.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var EXPERIENCE_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing',
    'stuff', 'things', 'one', 'way'
];

var EXPERIENCE_PATTERNS = [
    'worked with', 'worked on', 'dealt with', 'faced', 'experienced',
    'built', 'created', 'developed', 'implemented', 'designed',
    'learned', 'used to', 'once', 'previously', 'in the past',
    'back when', 'years ago', 'before', 'earlier', 'have experience'
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
// 3. EXTRACTION
// ==========================================

function extractExperiencesFromText(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundExperiences = {};

        // Check for "worked with X" pattern (Test 5)
        var workedWithMatch = text.match(/(?:i've|i have|we've|we have)?\s*worked with\s+([^.]+)/i);
        if (workedWithMatch && workedWithMatch[1]) {
            var desc = safeTrim(workedWithMatch[1]);
            desc = desc.split(/\b(and|but|however)\b/)[0];
            desc = safeTrim(desc);

            if (desc.length > 3 && desc.length < 100) {
                var key = safeLowerCase(desc).substring(0, 50);
                if (!foundExperiences[key]) {
                    foundExperiences[key] = true;
                    results.push({
                        description: 'worked with ' + safeLowerCase(desc),
                        confidence: 0.90
                    });
                }
            }
        }

        // Check for "built X before" pattern (Test 10)
        var builtMatch = text.match(/(?:i've|i have|we've|we have)?\s*built\s+([^.]+)\s+before/i);
        if (builtMatch && builtMatch[1]) {
            var desc = safeTrim(builtMatch[1]);
            desc = desc.split(/\b(and|but|however)\b/)[0];
            desc = safeTrim(desc);

            if (desc.length > 3 && desc.length < 100) {
                var key = 'built_' + safeLowerCase(desc).substring(0, 40);
                if (!foundExperiences[key]) {
                    foundExperiences[key] = true;
                    results.push({
                        description: 'built ' + safeLowerCase(desc) + ' previously',
                        confidence: 0.85
                    });
                }
            }
        }

        // NLP-based extraction strategies
        var strategies = [
            {
                match: '(i|we) have worked with .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, 'have');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(and|but|however|before)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (faced|experienced|encountered) .+',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(and|but|which|when)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (previously|once|used to) .+',
                confidence: 0.80,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(previously|once|used to)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|however|and then)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) have experience (with|in) .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(with|in)\b/i);
                        if (parts.length < 2) return null;

                        var expPart = safeTrim(parts[parts.length - 1]);
                        var candidate = expPart.split(/[.;]/)[0];

                        return 'experience with ' + safeTrim(candidate);
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
                        var rawExp = strat.parse(m);
                        if (!rawExp) return;

                        var desc = safeLowerCase(rawExp);
                        if (desc.length < 5 || desc.length > 200) return;
                        if (arrayContains(EXPERIENCE_BLOCKLIST, desc)) return;

                        var key = desc.substring(0, 50);
                        if (foundExperiences[key]) return;

                        foundExperiences[key] = true;
                        results.push({
                            description: desc,
                            confidence: strat.confidence
                        });
                    } catch (e) { }
                });
            } catch (e) {
                continue;
            }
        }

        // Fallback: Check for experience-indicating phrases
        if (results.length === 0 && containsAny(lowerText, EXPERIENCE_PATTERNS)) {
            // Extract the main experience description
            var expMatch = text.match(/(?:before|previously|experience with|worked with)\s+([^.]+)/i);
            if (expMatch && expMatch[1]) {
                var desc = safeLowerCase(safeTrim(expMatch[1]));
                if (desc.length > 5 && desc.length < 100) {
                    results.push({
                        description: desc,
                        confidence: 0.75
                    });
                }
            }
        }
    } catch (e) { }

    return results;
}

// ==========================================
// 4. DEDUPLICATION
// ==========================================

function deduplicateExperiences(experiences) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < experiences.length; i++) {
            var item = experiences[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.description) continue;

            var key = safeLowerCase(item.description).substring(0, 50);

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
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
// 5. MAIN EXECUTION
// ==========================================

function extractExperiences(text) {
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

        var experiences = extractExperiencesFromText(doc, text);

        return deduplicateExperiences(experiences);
    } catch (e) {
        return [];
    }
}

module.exports = { extractExperiences: extractExperiences };
