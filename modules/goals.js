var nlp = require('compromise');

/**
 * Goals Extraction Module (v1.0 - Production Grade)
 * Extracts personal, professional, and life goals from text.
 * ES5 compatible with comprehensive error handling and edge case coverage.
 */

var GOAL_BLOCKLIST = [
    'nothing', 'nowhere', 'something', 'everything', 'anything', 'somewhere',
    'it', 'that', 'this', 'there', 'here', 'now', 'then', 'what', 'why',
    'bed', 'sleep', 'bathroom', 'home', 'back', 'away', 'out', 'in'
];

var VAGUE_GOALS = [
    'better', 'more', 'less', 'good', 'great', 'best', 'fine', 'okay',
    'happy', 'sad', 'rich', 'successful', 'famous', 'things', 'stuff'
];

var TIME_INDICATORS = {
    'short_term': ['today', 'tonight', 'tomorrow', 'this week', 'next week', 'soon', 'by tomorrow'],
    'medium_term': ['this month', 'next month', 'this year', 'by summer', 'by spring', 'by fall', 'by winter'],
    'long_term': ['next year', 'in 5 years', 'in 10 years', 'someday', 'eventually', 'one day', 'future']
};

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
 * Checks if string contains any phrase from array
 */
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

/**
 * Determines time frame for a goal
 */
function determineTimeFrame(text, raw) {
    try {
        var fullText = safeLowerCase(raw + ' ' + text);

        if (containsAny(fullText, TIME_INDICATORS.short_term)) {
            return 'short_term';
        }
        if (containsAny(fullText, TIME_INDICATORS.medium_term)) {
            return 'medium_term';
        }
        if (containsAny(fullText, TIME_INDICATORS.long_term)) {
            return 'long_term';
        }

        return 'unspecified';
    } catch (e) {
        return 'unspecified';
    }
}

/**
 * Determines goal category
 */
function categorizeGoal(text) {
    try {
        var lowerText = safeLowerCase(text);

        var categories = {
            'career': ['career', 'job', 'work', 'business', 'company', 'startup', 'promotion', 'salary'],
            'education': ['learn', 'study', 'degree', 'course', 'school', 'university', 'education', 'training', 'skill'],
            'health': ['health', 'fit', 'exercise', 'weight', 'gym', 'workout', 'diet', 'meditate', 'yoga'],
            'financial': ['money', 'save', 'invest', 'buy', 'purchase', 'afford', 'financial', 'income', 'debt'],
            'relationship': ['relationship', 'family', 'friend', 'marry', 'marriage', 'partner', 'spouse', 'dating'],
            'personal': ['read', 'travel', 'hobby', 'creative', 'write', 'paint', 'music', 'art'],
            'lifestyle': ['move', 'house', 'home', 'live', 'relocate', 'organize', 'declutter']
        };

        for (var category in categories) {
            if (categories.hasOwnProperty(category)) {
                if (containsAny(lowerText, categories[category])) {
                    return category;
                }
            }
        }

        return 'general';
    } catch (e) {
        return 'general';
    }
}

/**
 * Validates and cleans a potential goal
 */
function validateGoal(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['"]|['"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        // Basic validation
        if (clean.length < 5) return null;
        if (clean.length > 200) return null;

        // Check blocklist
        if (arrayContains(GOAL_BLOCKLIST, clean)) return null;

        // Check if it's just a vague word
        if (arrayContains(VAGUE_GOALS, clean)) return null;

        // Must contain at least one verb or noun
        if (!/[a-zA-Z]{3,}/.test(clean)) return null;

        // Check for question marks (goals shouldn't be questions)
        if (clean.indexOf('?') !== -1) return null;

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
 * Extracts explicit goals (direct statements)
 */
function extractExplicitGoals(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(my|our) goal is to [#Verb+] .+',
                type: 'goal',
                subtype: 'explicit',
                confidence: 0.95,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/goal is to/i);
                        if (parts.length < 2) return null;

                        var goalPart = safeTrim(parts[1]);
                        var candidate = goalPart.split(/\b(but|however|although|unless)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) want to [#Verb+] .+',
                type: 'goal',
                subtype: 'desire',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we) want to');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|however|and then|because)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (aim|aspire|hope|plan|intend) to [#Verb+] .+',
                type: 'goal',
                subtype: 'intention',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(aim|aspire|hope|plan|intend) to');

                        var text = safeGetText(d);
                        var candidate = text.split(/[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (will|would like to|would love to) [#Verb+] .+',
                type: 'goal',
                subtype: 'commitment',
                confidence: 0.80,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(will|would like to|would love to)');

                        var text = safeGetText(d);
                        var candidate = text.split(/[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(looking to|trying to|working to|planning to) [#Verb+] .+',
                type: 'goal',
                subtype: 'active',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(looking to|trying to|working to|planning to)');

                        var text = safeGetText(d);
                        var candidate = text.split(/[.;]/)[0];

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

                matches.forEach(function(m) {
                    try {
                        var rawGoal = strat.parse(m);
                        if (!rawGoal) return;

                        var validGoal = validateGoal(rawGoal);
                        if (validGoal) {
                            var rawText = safeGetText(m);

                            results.push({
                                value: validGoal,
                                raw: rawText,
                                type: strat.type,
                                subtype: strat.subtype,
                                category: categorizeGoal(validGoal),
                                timeframe: determineTimeFrame(validGoal, rawText),
                                confidence: strat.confidence
                            });
                        }
                    } catch (e) {
                        // Skip individual match errors
                    }
                });
            } catch (e) {
                // Skip strategy errors and continue
                continue;
            }
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

/**
 * Extracts achievement-oriented goals
 */
function extractAchievementGoals(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var patterns = [
            {
                match: '(achieve|accomplish|reach|attain) .+',
                conf: 0.85,
                subtype: 'achievement'
            },
            {
                match: 'become (a|an)? [#Adjective? #Noun+]',
                conf: 0.80,
                subtype: 'transformation'
            },
            {
                match: 'get (a|an|my|the)? [#Noun+]',
                conf: 0.75,
                subtype: 'acquisition'
            }
        ];

        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i];

            try {
                var matches = doc.match(p.match);
                if (!matches) continue;

                matches.forEach(function(m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return;

                        // Extract the goal part
                        var goalText = text;
                        if (p.subtype === 'achievement') {
                            var parts = text.split(/\b(achieve|accomplish|reach|attain)\b/i);
                            if (parts.length > 2) {
                                goalText = safeTrim(parts[2]);
                            }
                        }

                        var candidate = goalText.split(/[.;]/)[0];
                        var validGoal = validateGoal(candidate);

                        if (validGoal) {
                            results.push({
                                value: validGoal,
                                raw: text,
                                type: 'goal',
                                subtype: p.subtype,
                                category: categorizeGoal(validGoal),
                                timeframe: determineTimeFrame(validGoal, text),
                                confidence: p.conf
                            });
                        }
                    } catch (e) {
                        // Skip individual match
                    }
                });
            } catch (e) {
                // Skip pattern errors
                continue;
            }
        }
    } catch (e) {
        // Return empty results on catastrophic failure
    }

    return results;
}

/**
 * Extracts future-oriented goals
 */
function extractFutureGoals(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var patterns = [
            {
                match: '(next year|in the future|someday|eventually) (i|we)? (will|want to|plan to)? [#Verb+] .+',
                conf: 0.75,
                subtype: 'future'
            },
            {
                match: 'by [#Date+] (i|we) (will|want to)? [#Verb+] .+',
                conf: 0.80,
                subtype: 'deadline'
            }
        ];

        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i];

            try {
                var matches = doc.match(p.match);
                if (!matches) continue;

                matches.forEach(function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return;

                        d = safeRemove(d, '(next year|in the future|someday|eventually|by)');
                        d = safeRemove(d, '(i|we)');
                        d = safeRemove(d, '(will|want to|plan to)');
                        d = safeRemove(d, '#Date');

                        var text = safeGetText(d);
                        var candidate = text.split(/[.;]/)[0];
                        var validGoal = validateGoal(candidate);

                        if (validGoal) {
                            var rawText = safeGetText(m);

                            results.push({
                                value: validGoal,
                                raw: rawText,
                                type: 'goal',
                                subtype: p.subtype,
                                category: categorizeGoal(validGoal),
                                timeframe: determineTimeFrame(validGoal, rawText),
                                confidence: p.conf
                            });
                        }
                    } catch (e) {
                        // Skip individual match
                    }
                });
            } catch (e) {
                // Skip pattern errors
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
 * @param {string} text - Input text to extract goals from
 * @returns {Array} Array of extracted goals
 */
function extractGoals(text) {
    try {
        // Input validation
        if (!isValidString(text)) {
            return [];
        }

        // Sanity check for text length
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

        var explicitGoals = extractExplicitGoals(doc);
        var achievementGoals = extractAchievementGoals(doc);
        var futureGoals = extractFutureGoals(doc);

        // Merge all results
        var all = [];

        if (Array.isArray(explicitGoals)) {
            all = all.concat(explicitGoals);
        }
        if (Array.isArray(achievementGoals)) {
            all = all.concat(achievementGoals);
        }
        if (Array.isArray(futureGoals)) {
            all = all.concat(futureGoals);
        }

        // Deduplicate by normalized value
        var unique = [];
        var seen = {};

        for (var i = 0; i < all.length; i++) {
            var item = all[i];

            // Validate item structure
            if (!item || typeof item !== 'object') continue;
            if (!item.type || !item.value) continue;

            var normalizedValue = safeLowerCase(item.value).replace(/\s+/g, ' ');
            var key = normalizedValue.substring(0, 50); // Use first 50 chars as key

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    value: item.value,
                    type: item.type,
                    subtype: item.subtype || null,
                    category: item.category || 'general',
                    timeframe: item.timeframe || 'unspecified',
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

module.exports = { extractGoals: extractGoals };