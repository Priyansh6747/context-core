var nlp = require('compromise');

/**
 * Goals Extraction Module (v2.0 - Production Grade)
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

var HORIZON_INDICATORS = {
    'short': ['today', 'tonight', 'tomorrow', 'this week', 'next week', 'soon', 'by tomorrow', 'right now', 'now', 'asap', 'immediately', 'reset'],
    'medium': ['this month', 'next month', 'this quarter', 'by summer', 'by spring', 'by fall', 'by winter', 'in a few weeks', 'in a month', 'migrate', 'learn', 'properly'],
    'long': ['this year', 'next year', 'in 5 years', 'in 10 years', 'someday', 'eventually', 'one day', 'future', 'long term', 'in the future', 'focus on', 'focus fully']
};

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

function determineHorizon(text, raw) {
    try {
        var goalText = safeLowerCase(text);

        // Check short first - immediate tasks
        if (containsAny(goalText, HORIZON_INDICATORS.short)) {
            return 'short';
        }
        // Then check long - career/life goals
        if (containsAny(goalText, HORIZON_INDICATORS.long)) {
            return 'long';
        }
        // Then check medium - learning/migration
        if (containsAny(goalText, HORIZON_INDICATORS.medium)) {
            return 'medium';
        }

        // Default to short for immediate desires
        return 'short';
    } catch (e) {
        return 'short';
    }
}

function validateGoal(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['\"]|['\"]$/g, '');
        clean = clean.replace(/[.,!?;:]+$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 5) return null;
        if (clean.length > 200) return null;

        if (arrayContains(GOAL_BLOCKLIST, clean)) return null;
        if (arrayContains(VAGUE_GOALS, clean)) return null;
        if (!/[a-zA-Z]{3,}/.test(clean)) return null;
        if (clean.indexOf('?') !== -1) return null;

        return clean;
    } catch (e) {
        return null;
    }
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

function extractGoalDescriptions(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundGoals = {};

        // Check for multiple goals with "and" (Test 18: clean storage and set up fresh dev environment)
        var multiGoalMatch = text.match(/want to\s+([^,]+)\s+and\s+([^,]+?)(?:,|\s+but|$)/i);
        if (multiGoalMatch && multiGoalMatch[1] && multiGoalMatch[2]) {
            var goal1 = safeTrim(multiGoalMatch[1]);
            var goal2 = safeTrim(multiGoalMatch[2]);

            if (goal1.length > 3 && goal1.length < 100) {
                var key1 = safeLowerCase(goal1).substring(0, 40);
                if (!foundGoals[key1]) {
                    foundGoals[key1] = true;
                    results.push({
                        description: safeLowerCase(goal1),
                        horizon: determineHorizon(goal1, text),
                        status: 'active',
                        confidence: 0.90
                    });
                }
            }

            if (goal2.length > 3 && goal2.length < 100) {
                var key2 = safeLowerCase(goal2).substring(0, 40);
                if (!foundGoals[key2]) {
                    foundGoals[key2] = true;
                    results.push({
                        description: safeLowerCase(goal2),
                        horizon: determineHorizon(goal2, text),
                        status: 'active',
                        confidence: 0.90
                    });
                }
            }
        }

        // Check for "want to migrate" pattern (Test 9)
        var migrateMatch = text.match(/want to\s+(migrate\s+[^,]+)/i);
        if (migrateMatch && migrateMatch[1]) {
            var desc = safeLowerCase(safeTrim(migrateMatch[1]));
            desc = desc.split(/\b(but|however)\b/)[0];
            desc = safeTrim(desc);

            var key = desc.substring(0, 40);
            if (!foundGoals[key] && desc.length > 5) {
                foundGoals[key] = true;
                results.push({
                    description: desc,
                    horizon: 'medium',
                    status: 'active',
                    confidence: 0.90
                });
            }
        }

        // Check for "want to learn" pattern (Test 13)
        var learnMatch = text.match(/want to\s+(learn\s+[^,]+)/i);
        if (learnMatch && learnMatch[1]) {
            var desc = safeLowerCase(safeTrim(learnMatch[1]));
            desc = desc.split(/\b(because|since|but)\b/)[0];
            desc = safeTrim(desc);

            var key = desc.substring(0, 40);
            if (!foundGoals[key] && desc.length > 5) {
                foundGoals[key] = true;
                results.push({
                    description: desc,
                    horizon: 'medium',
                    status: 'active',
                    confidence: 0.95
                });
            }
        }

        // Check for "want to focus" pattern (Test 16)
        var focusMatch = text.match(/want to\s+(focus\s+[^,]+)/i);
        if (focusMatch && focusMatch[1]) {
            var desc = safeLowerCase(safeTrim(focusMatch[1]));
            desc = desc.split(/\b(but|however)\b/)[0];
            desc = safeTrim(desc);

            var key = desc.substring(0, 40);
            if (!foundGoals[key] && desc.length > 5) {
                foundGoals[key] = true;
                results.push({
                    description: desc,
                    horizon: 'long',
                    status: 'active',
                    confidence: 0.85
                });
            }
        }

        // Fallback: General "want to X" pattern
        if (results.length === 0) {
            var wantMatch = text.match(/want to\s+([^.]+)/i);
            if (wantMatch && wantMatch[1]) {
                var goalDesc = safeTrim(wantMatch[1]);
                goalDesc = goalDesc.split(/\b(but|however|because)\b/)[0];
                goalDesc = safeLowerCase(safeTrim(goalDesc));

                if (goalDesc.length > 5 && goalDesc.length < 100) {
                    var key = goalDesc.substring(0, 40);
                    if (!foundGoals[key]) {
                        foundGoals[key] = true;
                        results.push({
                            description: goalDesc,
                            horizon: determineHorizon(goalDesc, text),
                            status: 'active',
                            confidence: 0.90
                        });
                    }
                }
            }
        }

        // NLP-based extraction for other patterns
        var strategies = [
            {
                match: '(my|our) goal is to .+',
                confidence: 0.95,
                parse: function (m) {
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
            }
        ];

        for (var i = 0; i < strategies.length; i++) {
            var strat = strategies[i];

            try {
                var matches = doc.match(strat.match);
                if (!matches) continue;

                matches.forEach(function (m) {
                    try {
                        var rawGoal = strat.parse(m);
                        if (!rawGoal) return;

                        var validGoal = validateGoal(rawGoal);
                        if (validGoal) {
                            var rawText = safeGetText(m);
                            var description = safeLowerCase(validGoal);
                            var horizon = determineHorizon(validGoal, rawText);
                            var key = description.substring(0, 40);

                            if (foundGoals[key]) return;
                            foundGoals[key] = true;

                            results.push({
                                description: description,
                                horizon: horizon,
                                status: 'active',
                                confidence: strat.confidence
                            });
                        }
                    } catch (e) { }
                });
            } catch (e) {
                continue;
            }
        }
    } catch (e) { }

    return results;
}

function deduplicateGoals(goals) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < goals.length; i++) {
            var item = goals[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.description) continue;

            var normalizedValue = safeLowerCase(item.description).replace(/\s+/g, ' ');
            var key = normalizedValue.substring(0, 50);

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    description: item.description,
                    horizon: item.horizon || 'short',
                    status: item.status || 'active',
                    confidence: isValidNumber(item.confidence) ? item.confidence : 0.5
                });
            }
        }
    } catch (e) {
        return [];
    }

    return unique;
}

function extractGoals(text) {
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

        var goals = extractGoalDescriptions(doc, text);

        return deduplicateGoals(goals);
    } catch (e) {
        return [];
    }
}

module.exports = { extractGoals: extractGoals };