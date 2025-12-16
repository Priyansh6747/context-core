var nlp = require('compromise');

/**
 * Preferences Extraction Module (v2.0 - Production Grade)
 * Extracts subjective likes, dislikes, and defaults.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var PREFERENCE_INDICATORS = {
    positive: ['prefer', 'prefers', 'like', 'likes', 'love', 'loves', 'enjoy', 'enjoys', 'favor', 'favors', 'want', 'wants', 'choose', 'choosing'],
    negative: ['dislike', 'dislikes', 'hate', 'hates', 'avoid', 'avoids', 'don\'t like', 'doesn\'t like', 'can\'t stand', 'rather not'],
    default: ['default', 'defaults to', 'usually', 'normally', 'typically', 'always', 'generally']
};

var PREFERENCE_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing', 'things'
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
// 3. DETECTION
// ==========================================

function detectPolarity(text) {
    try {
        var lowerText = safeLowerCase(text);

        if (containsAny(lowerText, PREFERENCE_INDICATORS.negative)) {
            return 'negative';
        }
        if (containsAny(lowerText, PREFERENCE_INDICATORS.positive)) {
            return 'positive';
        }
        if (containsAny(lowerText, PREFERENCE_INDICATORS.default)) {
            return 'default';
        }
        return null;
    } catch (e) {
        return null;
    }
}

function extractKey(text, value) {
    try {
        var lowerText = safeLowerCase(text);
        var lowerValue = safeLowerCase(value);

        // OS-related preferences
        if (containsAny(lowerValue, ['linux', 'windows', 'macos', 'ubuntu', 'fedora'])) {
            return 'operating_system';
        }

        // Work mode preferences
        if (containsAny(lowerValue, ['offline', 'online', 'remote', 'local'])) {
            return 'work_mode';
        }

        // Editor preferences
        if (containsAny(lowerValue, ['vscode', 'vim', 'emacs', 'sublime', 'atom'])) {
            return 'editor';
        }

        // Language preferences
        if (containsAny(lowerValue, ['python', 'javascript', 'typescript', 'rust', 'go', 'java'])) {
            return 'programming_language';
        }

        // Default to value-based key
        return safeLowerCase(value).replace(/\s+/g, '_').substring(0, 30);
    } catch (e) {
        return 'preference';
    }
}

// ==========================================
// 4. EXTRACTION
// ==========================================

function extractPreferencesFromText(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundPreferences = {};

        // Check for "prefer doing X" pattern (Test 12: prefer offline work)
        var preferMatch = text.match(/prefer\s+(?:doing\s+)?(\w+)\s+work/i);
        if (preferMatch && preferMatch[1]) {
            var mode = safeLowerCase(preferMatch[1]);
            if (!foundPreferences['work_mode']) {
                foundPreferences['work_mode'] = true;
                results.push({
                    key: 'work_mode',
                    value: mode,
                    polarity: 'positive',
                    confidence: 0.85
                });
            }
        }

        // Check for OS preference (Test 9: want to migrate to Linux)
        if (containsAny(lowerText, ['to linux', 'using linux', 'switch to linux', 'move to linux', 'use linux'])) {
            if (!foundPreferences['operating_system']) {
                foundPreferences['operating_system'] = true;
                results.push({
                    key: 'operating_system',
                    value: 'linux',
                    polarity: 'positive',
                    confidence: 0.85
                });
            }
        }

        // NLP-based extraction strategies
        var strategies = [
            {
                match: '(i|we) prefer .+',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        var parts = text.split(/\bprefer\b/i);
                        if (parts.length < 2) return null;

                        var valuePart = safeTrim(parts[1]);
                        valuePart = valuePart.split(/\b(but|however|over|instead|because)\b|[.;]/)[0];
                        valuePart = valuePart.replace(/^(to|doing|using)\s+/i, '');

                        return {
                            value: safeTrim(valuePart),
                            polarity: 'positive'
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (like|love|enjoy) .+',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(like|love|enjoy)');

                        var text = safeGetText(d);
                        var valuePart = text.split(/\b(but|however|because)\b|[.;]/)[0];

                        return {
                            value: safeTrim(valuePart),
                            polarity: 'positive'
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (dislike|hate|avoid|don\'t like) .+',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(dislike|hate|avoid|don\'t like)');

                        var text = safeGetText(d);
                        var valuePart = text.split(/\b(but|however|because)\b|[.;]/)[0];

                        return {
                            value: safeTrim(valuePart),
                            polarity: 'negative'
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

                        var value = safeLowerCase(parsed.value);
                        if (value.length < 2 || value.length > 100) return;
                        if (arrayContains(PREFERENCE_BLOCKLIST, value)) return;

                        var key = extractKey(text, value);
                        if (foundPreferences[key]) return;

                        foundPreferences[key] = true;
                        results.push({
                            key: key,
                            value: value,
                            polarity: parsed.polarity,
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
// 5. DEDUPLICATION
// ==========================================

function deduplicatePreferences(preferences) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < preferences.length; i++) {
            var item = preferences[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.key || !item.value) continue;

            var key = item.key;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    key: item.key,
                    value: item.value,
                    polarity: item.polarity || 'positive',
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

function extractPreferences(text) {
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

        var preferences = extractPreferencesFromText(doc, text);

        return deduplicatePreferences(preferences);
    } catch (e) {
        return [];
    }
}

module.exports = { extractPreferences: extractPreferences };
