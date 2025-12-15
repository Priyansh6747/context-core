var nlp = require('compromise');

/**
 * Identity Extraction Module (v1.0 - Production Grade)
 * Extracts Roles (Engineer), Names (John), and Age (25 years old).
 * ES5 compatible with comprehensive error handling and edge case coverage.
 */

var ROLE_BLOCKLIST = [
    'bit', 'lot', 'little', 'fan', 'believer', 'skeptic', 'mess', 'hurry',
    'joke', 'mistake', 'while', 'second', 'moment', 'participant', 'student of life',
    'person', 'one', 'someone', 'nobody', 'everybody', 'thing', 'nothing'
];

var NOT_NAMES = [
    'here', 'there', 'now', 'later', 'soon', 'confidential', 'unknown',
    'hidden', 'secret', 'mine', 'yours', 'missing', 'changing', 'important',
    'available', 'busy', 'ready', 'happy', 'sad', 'hungry', 'thirsty', 'tired'
];

var TEMPORAL_WORDS = [
    'later', 'tomorrow', 'tonight', 'soon', 'yesterday', 'morning', 'evening',
    'afternoon', 'back', 'asap', 'now', 'today'
];

/**
 * Safely checks if a value is a valid string
 */
function isValidString(val) {
    return typeof val === 'string' && val.length > 0;
}

/**
 * Safely checks if a value is a valid number
 */
function isValidNumber(val) {
    return typeof val === 'number' && !isNaN(val) && isFinite(val);
}

/**
 * Safely trims a string
 */
function safeTrim(str) {
    try {
        if (!isValidString(str)) return '';
        return str.trim();
    } catch (e) {
        return '';
    }
}

/**
 * Safely converts to lowercase
 */
function safeLowerCase(str) {
    try {
        if (!isValidString(str)) return '';
        return str.toLowerCase();
    } catch (e) {
        return '';
    }
}

/**
 * Checks if array contains value (case-insensitive for strings)
 */
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

/**
 * Validates and cleans a potential name
 */
function validateName(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        // Strip trailing punctuation and quotes
        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]|['"]$/g, '');
        clean = clean.replace(/[.,!?;:]$/g, '');
        clean = safeTrim(clean);

        // Basic validation checks
        if (clean.length < 2) return null;
        if (clean.length > 100) return null; // Sanity check for max length

        // Check blocklist
        if (arrayContains(NOT_NAMES, clean)) return null;

        // Check if purely numeric
        if (/^\d+$/.test(clean)) return null;

        // Check if contains only special characters
        if (/^[^a-zA-Z0-9]+$/.test(clean)) return null;

        // Check for temporal words
        if (arrayContains(TEMPORAL_WORDS, clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

/**
 * Safely extracts text from compromise match
 */
function safeGetText(match, method) {
    try {
        if (!match || typeof match.text !== 'function') return '';
        return safeTrim(match.text(method || 'text'));
    } catch (e) {
        return '';
    }
}

/**
 * Safely clones a compromise match
 */
function safeClone(match) {
    try {
        if (!match || typeof match.clone !== 'function') return null;
        return match.clone();
    } catch (e) {
        return null;
    }
}

/**
 * Safely removes patterns from compromise match
 */
function safeRemove(match, pattern) {
    try {
        if (!match || typeof match.remove !== 'function') return match;
        return match.remove(pattern);
    } catch (e) {
        return match;
    }
}

/**
 * Safely checks if match has a tag
 */
function safeHas(match, tag) {
    try {
        if (!match || typeof match.has !== 'function') return false;
        return match.has(tag);
    } catch (e) {
        return false;
    }
}

/**
 * Extracts names from document
 */
function extractNames(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(my|his|her|the) (real|full|legal|first|last) name is .+',
                type: 'name',
                subtype: 'legal',
                confidence: 0.95,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/name is/i);
                        if (parts.length < 2) return null;

                        var namePart = safeTrim(parts[1]);
                        if (!namePart) return null;

                        // Split by conjunctions and punctuation
                        var candidate = namePart.split(/\b(and|but|which|who|that)\b|[.,;:]/)[0];
                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(my name is|i am|im) [#Noun+]',
                type: 'name',
                subtype: 'legal',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(my name is|i am|im)');

                        // Skip if it's an adjective without TitleCase
                        if (safeHas(d, '#Adjective') && !safeHas(d, '#TitleCase')) {
                            return null;
                        }

                        return safeGetText(d);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(go by|goes by|known as|alias is|nickname is|username is) (the)? (alias|handle|nickname|name)? [#Noun+]',
                type: 'name',
                subtype: 'alias',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(go by|goes by|known as|alias is|nickname is|username is)');
                        d = safeRemove(d, '(the|an|a)');
                        d = safeRemove(d, '(alias|handle|nickname|name)');

                        return safeGetText(d);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: 'call me [#Noun+]',
                type: 'name',
                subtype: 'alias',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, 'call me');

                        // Skip temporal expressions
                        if (safeHas(d, '#Date') || safeHas(d, '#Time') || safeHas(d, '#Expression')) {
                            return null;
                        }

                        var text = safeGetText(d);
                        if (arrayContains(TEMPORAL_WORDS, text)) {
                            return null;
                        }

                        return text;
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
                        var rawName = strat.parse(m);
                        if (!rawName) return;

                        var validName = validateName(rawName);
                        if (validName) {
                            results.push({
                                value: validName,
                                raw: safeGetText(m),
                                type: strat.type,
                                subtype: strat.subtype,
                                confidence: strat.confidence
                            });
                        }
                    } catch (e) {
                        // Skip individual match errors
                    }
                });
            } catch (e) {
                // Skip strategy errors and continue to next
                continue;
            }
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

/**
 * Extracts age from document
 */
function extractAge(doc) {
    var results = [];

    try {
        if (!doc) return results;

        // Explicit age pattern
        try {
            var explicitAge = doc.match('[#Value+] (years|yrs|yr|yo) (old)?');

            if (explicitAge) {
                explicitAge.forEach(function(m) {
                    try {
                        if (typeof m.numbers !== 'function') return;

                        var valArr = m.numbers().get();
                        if (!Array.isArray(valArr) || valArr.length === 0) return;

                        var val = valArr[0];
                        if (!isValidNumber(val)) return;

                        if (val > 0 && val < 120) {
                            results.push({
                                value: val,
                                raw: safeGetText(m),
                                type: 'age',
                                confidence: 0.95
                            });
                        }
                    } catch (e) {
                        // Skip individual match
                    }
                });
            }
        } catch (e) {
            // Continue to fallback
        }

        // Fallback for implicit age
        if (results.length === 0) {
            try {
                var implicitAge = doc.match('(i am|im|i\'m) [#Value+]').not('#Date');

                if (implicitAge) {
                    implicitAge.forEach(function(m) {
                        try {
                            // Check if there's a following word
                            if (typeof m.lookAhead === 'function') {
                                var nextWord = m.lookAhead(1);
                                if (nextWord && nextWord.found) return;
                            }

                            if (typeof m.numbers !== 'function') return;

                            var valArr = m.numbers().get();
                            if (!Array.isArray(valArr) || valArr.length === 0) return;

                            var val = valArr[0];
                            if (!isValidNumber(val)) return;

                            if (val >= 18 && val < 100) {
                                results.push({
                                    value: val,
                                    raw: safeGetText(m),
                                    type: 'age',
                                    confidence: 0.60
                                });
                            }
                        } catch (e) {
                            // Skip individual match
                        }
                    });
                }
            } catch (e) {
                // Age extraction failed
            }
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

/**
 * Extracts roles from document
 */
function extractRoles(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var patterns = [
            { match: '(i|i\'m|im) (am|was) (a|an)? [#Adjective? #Noun+] .?', conf: 0.85 },
            { match: '(as|speaking as) (a|an) [#Adjective? #Noun+] .?', conf: 0.85 },
            { match: '(i|i\'m|im) work as (a|an)? [#Adjective? #Noun+] .?', conf: 0.90 }
        ];

        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i];

            try {
                var matches = doc.match(p.match);
                if (!matches) continue;

                matches.forEach(function(m) {
                    try {
                        var roleDoc = safeClone(m);
                        if (!roleDoc) return;

                        roleDoc = safeRemove(roleDoc, '(i|i\'m|im|we)');
                        roleDoc = safeRemove(roleDoc, '(am|was|are)');
                        roleDoc = safeRemove(roleDoc, '(work|working|speaking) as');
                        roleDoc = safeRemove(roleDoc, '(a|an|the)');

                        if (typeof roleDoc.text !== 'function') return;

                        var role = safeTrim(roleDoc.text('normal'));
                        if (!role || role.length < 2 || role.length > 100) return;

                        if (arrayContains(ROLE_BLOCKLIST, role)) return;

                        results.push({
                            value: role,
                            raw: safeTrim(safeGetText(m)),
                            type: 'role',
                            confidence: p.conf
                        });
                    } catch (e) {
                        // Skip individual match
                    }
                });
            } catch (e) {
                // Skip pattern errors and continue
                continue;
            }
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

/**
 * Main Extraction Function
 * @param {string} text - Input text to extract identity information from
 * @returns {Array} Array of extracted identity items
 */
function extractIdentity(text) {
    try {
        // Input validation
        if (!isValidString(text)) {
            return [];
        }

        // Sanity check for text length
        if (text.length > 50000) {
            text = text.substring(0, 50000); // Prevent memory issues
        }

        var doc;
        try {
            doc = nlp(text);
        } catch (e) {
            return [];
        }

        if (!doc) return [];

        var names = extractNames(doc);
        var ages = extractAge(doc);
        var roles = extractRoles(doc);

        // Merge all results
        var all = [];

        if (Array.isArray(names)) {
            all = all.concat(names);
        }
        if (Array.isArray(ages)) {
            all = all.concat(ages);
        }
        if (Array.isArray(roles)) {
            all = all.concat(roles);
        }

        // Deduplicate
        var unique = [];
        var seen = {};

        for (var i = 0; i < all.length; i++) {
            var item = all[i];

            // Validate item structure
            if (!item || typeof item !== 'object') continue;
            if (!item.type || !item.value) continue;

            var key = item.type + ':' + String(item.value).toLowerCase();

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    value: item.value,
                    type: item.type,
                    subtype: item.subtype || null,
                    confidence: isValidNumber(item.confidence) ? item.confidence : 0.5
                });
            }
        }

        return unique;
    } catch (e) {
        // Catastrophic failure - return empty array
        return [];
    }
}

module.exports = { extractIdentity: extractIdentity };