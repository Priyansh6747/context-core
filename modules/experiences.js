var nlp = require('compromise');

/**
 * Experiences Extraction Module (v1.0 - Production Grade)
 * Extracts past events with lasting relevance.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. BLOCKLISTS AND KNOWLEDGE BASES
// ==========================================

var EXPERIENCE_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing',
    'stuff', 'things', 'one', 'way'
];

var DOMAIN_KEYWORDS = {
    'technology': ['software', 'code', 'programming', 'development', 'system', 'database', 'api', 'server', 'cloud', 'infrastructure'],
    'business': ['startup', 'company', 'management', 'leadership', 'team', 'project', 'client', 'sales'],
    'creative': ['design', 'art', 'music', 'writing', 'content', 'video', 'photography'],
    'education': ['teaching', 'training', 'course', 'university', 'school', 'learning'],
    'engineering': ['hardware', 'electronics', 'mechanical', 'electrical', 'manufacturing'],
    'data': ['data', 'analytics', 'machine learning', 'ai', 'statistics', 'research']
};

var EXPERIENCE_INDICATORS = [
    'worked with', 'worked on', 'dealt with', 'faced', 'experienced',
    'built', 'created', 'developed', 'implemented', 'designed',
    'learned', 'used to', 'once', 'previously', 'in the past',
    'back when', 'years ago', 'before', 'earlier'
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

function validateExperience(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 5) return null;
        if (clean.length > 200) return null;

        if (arrayContains(EXPERIENCE_BLOCKLIST, clean)) return null;

        if (!/[a-zA-Z]{3,}/.test(clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function determineDomain(text) {
    try {
        var lowerText = safeLowerCase(text);

        for (var domain in DOMAIN_KEYWORDS) {
            if (DOMAIN_KEYWORDS.hasOwnProperty(domain)) {
                if (containsAny(lowerText, DOMAIN_KEYWORDS[domain])) {
                    return domain;
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

function extractPastExperiences(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(i|we) (have|\'ve) (worked|dealt|played) with .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(have|\'ve)');
                        d = safeRemove(d, '(worked|dealt|played) with');

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
                        d = safeRemove(d, '(faced|experienced|encountered)');

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
                match: '(i|we) (built|created|developed|implemented|designed) .+ (before|previously|in the past)',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(before|previously|in the past)');

                        var text = safeGetText(d);
                        return safeTrim(text);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(back when|years ago|in the past) (i|we) .+',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(back when|years ago|in the past)');
                        d = safeRemove(d, '(i|we)');

                        var text = safeGetText(d);
                        var candidate = text.split(/[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (have|\'ve) experience (with|in) .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(with|in)\b/i);
                        if (parts.length < 2) return null;

                        var expPart = safeTrim(parts[parts.length - 1]);
                        var candidate = expPart.split(/[.;]/)[0];

                        return safeTrim(candidate);
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

                        var validExp = validateExperience(rawExp);
                        if (!validExp) return;

                        results.push({
                            description: validExp,
                            domain: determineDomain(validExp),
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

function deduplicateExperiences(exps) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < exps.length; i++) {
            var item = exps[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.description) continue;

            var normalizedDesc = safeLowerCase(item.description).replace(/\s+/g, ' ');
            var key = normalizedDesc.substring(0, 60);

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    description: item.description,
                    domain: item.domain || null,
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
 * @param {string} text - Input text to extract experiences from
 * @returns {Array} Array of extracted experiences
 */
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

        var experiences = extractPastExperiences(doc);

        return deduplicateExperiences(experiences);
    } catch (e) {
        return [];
    }
}

module.exports = { extractExperiences: extractExperiences };
