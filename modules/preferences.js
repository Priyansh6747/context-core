var nlp = require('compromise');

/**
 * Preferences Extraction Module (v1.0 - Production Grade)
 * Extracts subjective likes, dislikes, and defaults.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. BLOCKLISTS AND KNOWLEDGE BASES
// ==========================================

var PREFERENCE_BLOCKLIST = [
    'it', 'that', 'this', 'something', 'anything', 'nothing', 'everything',
    'stuff', 'things', 'way', 'one', 'what', 'how', 'when', 'where', 'why'
];

var PREFERENCE_VERBS = {
    positive: ['prefer', 'like', 'love', 'enjoy', 'favor', 'choose', 'want', 'appreciate'],
    negative: ['dislike', 'hate', 'avoid', 'despise', 'loathe', 'detest']
};

var DEFAULT_INDICATORS = [
    'usually', 'normally', 'typically', 'always', 'by default', 'generally',
    'most of the time', 'tend to', 'default to', 'go with', 'stick to'
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

function validatePreference(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]/g, '');
        clean = clean.replace(/['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 2) return null;
        if (clean.length > 150) return null;

        if (arrayContains(PREFERENCE_BLOCKLIST, clean)) return null;

        // Must contain meaningful content
        if (!/[a-zA-Z]{2,}/.test(clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function extractPreferenceKey(text) {
    try {
        var lowerText = safeLowerCase(text);

        // Common preference domains
        var domains = {
            'mode': ['dark mode', 'light mode', 'dark theme', 'light theme'],
            'os': ['windows', 'linux', 'mac', 'macos', 'ubuntu'],
            'editor': ['vim', 'emacs', 'vscode', 'sublime', 'atom', 'neovim'],
            'language': ['python', 'javascript', 'typescript', 'rust', 'go', 'java'],
            'framework': ['react', 'vue', 'angular', 'svelte'],
            'browser': ['chrome', 'firefox', 'safari', 'edge'],
            'time': ['morning', 'night', 'evening', 'afternoon', 'daytime', 'nighttime'],
            'communication': ['email', 'slack', 'teams', 'phone', 'in-person', 'text']
        };

        for (var key in domains) {
            if (domains.hasOwnProperty(key)) {
                if (containsAny(lowerText, domains[key])) {
                    return key;
                }
            }
        }

        return 'general';
    } catch (e) {
        return 'general';
    }
}

// ==========================================
// 4. EXTRACTION STRATEGIES
// ==========================================

function extractExplicitPreferences(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(i|we) prefer .+ (over|to|than) .+',
                polarity: 'positive',
                confidence: 0.95,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(prefer)\b/i);
                        if (parts.length < 2) return null;

                        var prefPart = safeTrim(parts[2] || parts[1]);
                        var candidates = prefPart.split(/\b(over|to|than)\b/i);

                        return {
                            value: safeTrim(candidates[0]),
                            comparison: candidates[2] ? safeTrim(candidates[2]) : null
                        };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (like|love|enjoy) .+',
                polarity: 'positive',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(like|love|enjoy)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|however|and|when|because)\b|[.;]/)[0];

                        return { value: safeTrim(candidate) };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (don\'t like|dislike|hate|avoid) .+',
                polarity: 'negative',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(don\'t like|dislike|hate|avoid)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|however|and|because)\b|[.;]/)[0];

                        return { value: safeTrim(candidate) };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (usually|normally|typically|always|generally) (use|choose|pick|go with) .+',
                polarity: 'positive',
                confidence: 0.80,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(usually|normally|typically|always|generally)');
                        d = safeRemove(d, '(use|choose|pick|go with)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|however|and|because)\b|[.;]/)[0];

                        return { value: safeTrim(candidate) };
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(my|our) (preference|default|favorite|favourite) is .+',
                polarity: 'positive',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/\b(is)\b/i);
                        if (parts.length < 2) return null;

                        var candidate = safeTrim(parts[parts.length - 1]);
                        candidate = candidate.split(/[.;]/)[0];

                        return { value: safeTrim(candidate) };
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

                matches.forEach(function(m) {
                    try {
                        var parsed = strat.parse(m);
                        if (!parsed || !parsed.value) return;

                        var validValue = validatePreference(parsed.value);
                        if (!validValue) return;

                        results.push({
                            key: extractPreferenceKey(validValue),
                            value: validValue,
                            polarity: strat.polarity,
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

function extractDefaultPreferences(text) {
    var results = [];

    try {
        if (!isValidString(text)) return results;

        var lowerText = safeLowerCase(text);

        // Check for default indicator patterns
        for (var i = 0; i < DEFAULT_INDICATORS.length; i++) {
            var indicator = DEFAULT_INDICATORS[i];

            if (lowerText.indexOf(indicator) !== -1) {
                // Extract context around the indicator
                var pattern = new RegExp(indicator + '\\s+(?:use|choose|go with|pick|work with)\\s+([^.,;!?]+)', 'i');
                var match = text.match(pattern);

                if (match && match[1]) {
                    var validValue = validatePreference(match[1]);
                    if (validValue) {
                        results.push({
                            key: extractPreferenceKey(validValue),
                            value: validValue,
                            polarity: 'positive',
                            raw: match[0],
                            confidence: 0.75
                        });
                    }
                }
            }
        }
    } catch (e) {
        // Return empty results
    }

    return results;
}

// ==========================================
// 5. DEDUPLICATION
// ==========================================

function deduplicatePreferences(prefs) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < prefs.length; i++) {
            var item = prefs[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.key || !item.value) continue;

            var normalizedValue = safeLowerCase(item.value).replace(/\s+/g, ' ');
            var key = item.key + ':' + normalizedValue.substring(0, 50);

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

/**
 * Main Extraction Function
 * @param {string} text - Input text to extract preferences from
 * @returns {Array} Array of extracted preferences
 */
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

        var explicit = extractExplicitPreferences(doc);
        var defaults = extractDefaultPreferences(text);

        var all = [];

        if (Array.isArray(explicit)) {
            all = all.concat(explicit);
        }
        if (Array.isArray(defaults)) {
            all = all.concat(defaults);
        }

        return deduplicatePreferences(all);
    } catch (e) {
        return [];
    }
}

module.exports = { extractPreferences: extractPreferences };
