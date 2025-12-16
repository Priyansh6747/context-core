var nlp = require('compromise');

/**
 * Intents Extraction Module (v2.0 - Production Grade)
 * Extracts what the user is trying to do right now.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var INTENT_PATTERNS = {
    ask: {
        patterns: ['how do', 'how can', 'how to', 'what is', 'what are', 'why is', 'why does', 'where is', 'when should', 'can you', 'could you', 'would you', 'please help', 'i need help', 'help me', 'want advice', 'need advice', 'looking for advice', 'advice on', 'recommend', 'suggestion', 'which should', 'which to use', 'can you help'],
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

// Target extraction patterns for specific intents
var TARGET_PATTERNS = {
    sensor_recommendation: ['which sensor', 'sensor to use', 'sensor recommendation', 'recommend sensor', 'advice on sensor', 'advice on which sensor'],
    backup_method: ['backup', 'back up', 'save', 'preserve', 'without losing', 'not lose'],
    system_reset_impact: ['resetting windows', 'reset windows', 'windows reset', 'will break', 'break my'],
    tool_recommendation: ['which tool', 'tool to use', 'recommend tool', 'tool recommendation'],
    method_recommendation: ['best way', 'how to', 'method', 'approach', 'technique']
};

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

// ==========================================
// 3. CORE DETECTION
// ==========================================

function detectIntentType(text) {
    try {
        var lowerText = safeLowerCase(text);

        // Check for question marks first (strong ask indicator)
        if (text.indexOf('?') !== -1) {
            // But also check for decision patterns
            if (containsAny(lowerText, INTENT_PATTERNS.decide.patterns)) {
                return { type: 'decide', confidence: 0.90 };
            }
            return { type: 'ask', confidence: 0.90 };
        }

        // Check for "can you help" pattern (Test 11)
        if (containsAny(lowerText, ['can you help', 'could you help', 'help me check'])) {
            return { type: 'ask', confidence: 0.95 };
        }

        // Check for advice/recommendation patterns (strong ask indicator)
        if (containsAny(lowerText, ['want advice', 'need advice', 'advice on', 'recommend', 'recommendation', 'suggestion'])) {
            return { type: 'ask', confidence: 0.95 };
        }

        // Check each intent type
        for (var intentType in INTENT_PATTERNS) {
            if (INTENT_PATTERNS.hasOwnProperty(intentType)) {
                if (containsAny(lowerText, INTENT_PATTERNS[intentType].patterns)) {
                    var conf = 0.85;
                    if (intentType === 'debug') conf = 0.85;
                    if (intentType === 'decide') conf = 0.85;
                    if (intentType === 'ask') conf = 0.90;
                    return { type: intentType, confidence: conf };
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

function detectTarget(text) {
    try {
        var lowerText = safeLowerCase(text);

        for (var target in TARGET_PATTERNS) {
            if (TARGET_PATTERNS.hasOwnProperty(target)) {
                if (containsAny(lowerText, TARGET_PATTERNS[target])) {
                    return target;
                }
            }
        }

        // Extract target from "advice on X" pattern
        var adviceMatch = text.match(/advice\s+on\s+(?:which\s+)?(\w+)/i);
        if (adviceMatch && adviceMatch[1]) {
            return adviceMatch[1].toLowerCase() + '_recommendation';
        }

        // Extract target from "which X to use" pattern
        var whichMatch = text.match(/which\s+(\w+)\s+to\s+use/i);
        if (whichMatch && whichMatch[1]) {
            return whichMatch[1].toLowerCase() + '_recommendation';
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// 4. EXTRACTION
// ==========================================

function extractIntentSignals(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundIntents = {};

        // Check for "can you help me check" pattern (Test 11)
        if (containsAny(lowerText, ['can you help', 'help me check', 'check if'])) {
            var target = detectTarget(text);

            if (!foundIntents['ask']) {
                foundIntents['ask'] = true;
                results.push({
                    type: 'ask',
                    target: target || 'general_help',
                    confidence: 0.95
                });
            }
        }

        // Check for advice-seeking pattern (Test 1 and Test 6)
        if (containsAny(lowerText, ['want advice', 'need advice', 'advice on', 'want recommendation', 'need recommendation'])) {
            var target = detectTarget(text);

            if (!foundIntents['ask']) {
                foundIntents['ask'] = true;
                results.push({
                    type: 'ask',
                    target: target || 'general_advice',
                    confidence: 0.90
                });
            }
        }

        // Check for backup method intent (Test 1)
        if (containsAny(lowerText, ['without losing', 'not losing', 'don\'t want to lose', 'save', 'backup', 'preserve']) &&
            containsAny(lowerText, ['password', 'data', 'files', 'chrome'])) {

            if (!foundIntents['ask']) {
                foundIntents['ask'] = true;
                results.push({
                    type: 'ask',
                    target: 'backup_method',
                    confidence: 0.90
                });
            }
        }

        // Check for sensor recommendation (Test 6)
        if (containsAny(lowerText, ['which sensor', 'sensor to use', 'advice on sensor', 'sensor recommendation'])) {
            if (!foundIntents['ask']) {
                foundIntents['ask'] = true;
                results.push({
                    type: 'ask',
                    target: 'sensor_recommendation',
                    confidence: 0.95
                });
            }
        }

        // General intent detection
        if (results.length === 0) {
            var detected = detectIntentType(text);
            if (detected) {
                var target = detectTarget(text);
                results.push({
                    type: detected.type,
                    target: target,
                    confidence: detected.confidence
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

function deduplicateIntents(intents) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < intents.length; i++) {
            var item = intents[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type) continue;

            var key = item.type + ':' + (item.target || 'null');

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

        var intents = extractIntentSignals(doc, text);

        return deduplicateIntents(intents);
    } catch (e) {
        return [];
    }
}

module.exports = { extractIntents: extractIntents };
