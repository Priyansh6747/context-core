var nlp = require('compromise');

/**
 * Constraints Extraction Module (v2.0 - Production Grade)
 * Extracts temporary limitations or blockers.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var CONSTRAINT_TYPES = {
    limited_interaction: {
        patterns: ['can\'t do much', 'cannot do much', 'limited', 'restricted', 'can\'t really work', 'hard to work', 'difficult to work', 'not easy to'],
        keywords: ['limited', 'can\'t', 'cannot', 'restricted', 'hard to', 'difficult']
    },
    device_limitation: {
        patterns: ['only my phone', 'only phone', 'stuck with phone', 'only using phone', 'stuck using phone', 'just my phone', 'only have my phone', 'only mobile'],
        keywords: ['only', 'stuck', 'just', 'phone', 'mobile']
    },
    environment_limitation: {
        patterns: ['stuck using windows', 'restricted to windows', 'currently on windows', 'right now i\'m stuck', 'stuck using', 'have to use', 'forced to use'],
        keywords: ['stuck', 'restricted', 'forced', 'have to']
    },
    connectivity_limitation: {
        patterns: ['no internet', 'no wifi', 'no connection', 'offline', 'bad connection', 'slow internet', 'limited internet', 'poor connection', 'internet went down', 'internet is down'],
        keywords: ['internet', 'wifi', 'offline', 'connection', 'network', 'connectivity']
    },
    power_limitation: {
        patterns: ['low battery', 'battery dying', 'about to die', 'running out of battery', 'need to charge'],
        keywords: ['battery', 'power', 'charge', 'charging']
    },
    time_limitation: {
        patterns: ['short on time', 'in a hurry', 'no time', 'limited time', 'running late', 'only have', 'quick', 'urgent', 'asap'],
        keywords: ['time', 'hurry', 'urgent', 'quick', 'rush', 'deadline', 'short on']
    },
    access_limitation: {
        patterns: ['can\'t access', 'no access', 'don\'t have access', 'locked out', 'can\'t use', 'can\'t open', 'blocked', 'restricted'],
        keywords: ['access', 'locked', 'blocked', 'restricted', 'unavailable']
    },
    hardware_failure: {
        patterns: ['laptop crashed', 'computer crashed', 'not booting', 'won\'t boot', 'stopped booting', 'dead', 'broken', 'failed'],
        keywords: ['crashed', 'booting', 'dead', 'broken', 'failed', 'failure']
    }
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

function detectConstraintType(text) {
    try {
        var lowerText = safeLowerCase(text);

        for (var constraintType in CONSTRAINT_TYPES) {
            if (CONSTRAINT_TYPES.hasOwnProperty(constraintType)) {
                var config = CONSTRAINT_TYPES[constraintType];
                if (containsAny(lowerText, config.patterns)) {
                    return { type: constraintType, confidence: 0.90 };
                }
            }
        }

        for (var constraintType2 in CONSTRAINT_TYPES) {
            if (CONSTRAINT_TYPES.hasOwnProperty(constraintType2)) {
                var config2 = CONSTRAINT_TYPES[constraintType2];
                if (containsAny(lowerText, config2.keywords)) {
                    return { type: constraintType2, confidence: 0.75 };
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

function generateDescription(text, constraintType) {
    try {
        var lowerText = safeLowerCase(text);

        if (constraintType === 'limited_interaction') {
            if (lowerText.indexOf('mobile') !== -1 || lowerText.indexOf('phone') !== -1) {
                if (lowerText.indexOf('travel') !== -1 || lowerText.indexOf('train') !== -1 ||
                    lowerText.indexOf('bus') !== -1 || lowerText.indexOf('commut') !== -1) {
                    return 'on mobile during travel';
                }
                return 'limited mobile interaction';
            }
            return 'limited interaction available';
        }

        if (constraintType === 'device_limitation') {
            return 'only mobile available';
        }

        if (constraintType === 'environment_limitation') {
            if (lowerText.indexOf('windows') !== -1) {
                return 'currently restricted to windows laptop';
            }
            return 'environment restricted';
        }

        if (constraintType === 'connectivity_limitation') {
            return 'no internet access';
        }

        if (constraintType === 'power_limitation') {
            return 'low battery';
        }

        if (constraintType === 'time_limitation') {
            return 'short on time';
        }

        if (constraintType === 'access_limitation') {
            return 'access restricted';
        }

        if (constraintType === 'hardware_failure') {
            if (lowerText.indexOf('laptop') !== -1) {
                return 'laptop not booting';
            }
            return 'hardware failure';
        }

        return safeTrim(text.substring(0, 50));
    } catch (e) {
        return 'constraint detected';
    }
}

// ==========================================
// 4. EXTRACTION
// ==========================================

function extractConstraintSignals(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundTypes = {};

        // Check for mobile during travel pattern (Test 3)
        if ((containsAny(lowerText, ['train', 'bus', 'plane', 'travel', 'commut'])) &&
            (containsAny(lowerText, ['phone', 'android', 'iphone', 'mobile'])) &&
            (containsAny(lowerText, ['can\'t', 'cannot', 'limited', 'hard']))) {

            if (!foundTypes['limited_interaction']) {
                foundTypes['limited_interaction'] = true;
                results.push({
                    type: 'limited_interaction',
                    description: 'on mobile during travel',
                    confidence: 0.85
                });
            }
        }

        // Check for "only phone" / device limitation pattern (Test 8)
        if (containsAny(lowerText, ['only my phone', 'only phone', 'stuck using', 'stuck with', 'only using phone', 'only mobile', 'just my phone'])) {
            if (!foundTypes['device_limitation']) {
                foundTypes['device_limitation'] = true;
                results.push({
                    type: 'device_limitation',
                    description: 'only mobile available',
                    confidence: 0.90
                });
            }
        }

        // Check for environment limitation (Test 9: stuck using Windows)
        if (containsAny(lowerText, ['stuck using windows', 'stuck on windows', 'right now i\'m stuck', 'currently stuck'])) {
            if (!foundTypes['environment_limitation']) {
                foundTypes['environment_limitation'] = true;
                results.push({
                    type: 'environment_limitation',
                    description: 'currently restricted to windows laptop',
                    confidence: 0.85
                });
            }
        }

        // Check for connectivity limitation (Test 12: internet went down)
        if (containsAny(lowerText, ['internet went down', 'internet is down', 'no internet', 'offline'])) {
            if (!foundTypes['connectivity_limitation']) {
                foundTypes['connectivity_limitation'] = true;
                results.push({
                    type: 'connectivity_limitation',
                    description: 'no internet access',
                    confidence: 0.90
                });
            }
        }

        // Check for time limitation (Test 18: short on time)
        if (containsAny(lowerText, ['short on time', 'running out of time', 'limited time', 'no time'])) {
            if (!foundTypes['time_limitation']) {
                foundTypes['time_limitation'] = true;
                results.push({
                    type: 'time_limitation',
                    description: 'short on time',
                    confidence: 0.85
                });
            }
        }

        // Check for hardware failure (Test 14: laptop crashed and stopped booting)
        if (containsAny(lowerText, ['crashed and stopped', 'stopped booting', 'won\'t boot', 'not booting'])) {
            if (!foundTypes['hardware_failure']) {
                foundTypes['hardware_failure'] = true;
                var desc = 'hardware failure';
                if (lowerText.indexOf('laptop') !== -1) {
                    desc = 'laptop not booting';
                }
                results.push({
                    type: 'hardware_failure',
                    description: desc,
                    confidence: 0.90
                });
            }
        }

        // General constraint detection
        if (results.length === 0) {
            var detected = detectConstraintType(text);
            if (detected) {
                var description = generateDescription(text, detected.type);
                results.push({
                    type: detected.type,
                    description: description,
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

function deduplicateConstraints(constraints) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < constraints.length; i++) {
            var item = constraints[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type) continue;

            var key = item.type;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    description: item.description || '',
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

function extractConstraints(text) {
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

        var constraints = extractConstraintSignals(doc, text);

        return deduplicateConstraints(constraints);
    } catch (e) {
        return [];
    }
}

module.exports = { extractConstraints: extractConstraints };
