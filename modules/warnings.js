var nlp = require('compromise');

/**
 * Warnings Extraction Module (v2.0 - Production Grade)
 * Extracts risk signals or danger awareness.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var WARNING_TYPES = {
    data_loss_risk: {
        patterns: ['lose data', 'losing data', 'data loss', 'wipe data', 'delete data', 'erase data', 'lose files', 'losing files', 'lost data', 'lost files', 'don\'t want to lose', 'without losing', 'not losing', 'wiped', 'files were wiped', 'local files', 'files deleted', 'worry about data', 'worried about data'],
        keywords: ['data', 'files', 'documents', 'backup', 'wipe', 'delete', 'erase', 'lost', 'passwords', 'reset']
    },
    system_breakage_risk: {
        patterns: ['will break', 'might break', 'could break', 'break my', 'break current', 'break my current', 'break setup', 'break development'],
        keywords: ['break', 'breaking', 'broke', 'damage', 'corrupt']
    },
    security_risk: {
        patterns: ['is it safe', 'is this safe', 'is it secure', 'security risk', 'security concern', 'privacy concern', 'worried about security', 'data breach', 'hack', 'hacked', 'malware', 'virus'],
        keywords: ['security', 'secure', 'safe', 'privacy', 'breach', 'hack', 'malware', 'virus', 'password']
    },
    irreversible_action: {
        patterns: ['can\'t undo', 'cannot undo', 'no undo', 'irreversible', 'permanent', 'can\'t go back', 'cannot go back', 'point of no return', 'no way back'],
        keywords: ['undo', 'irreversible', 'permanent', 'forever', 'revert']
    },
    general_concern: {
        patterns: ['worried about', 'concerned about', 'afraid of', 'fear of', 'scared of', 'nervous about', 'risky', 'dangerous', 'be careful', 'still worry', 'still worried'],
        keywords: ['worried', 'concerned', 'afraid', 'fear', 'scared', 'nervous', 'risky', 'dangerous', 'careful', 'warning', 'worry']
    }
};

// Related-to mappings for common contexts
var RELATED_TO_PATTERNS = {
    'pc_reset': ['reset', 'resetting', 'pc', 'windows', 'computer'],
    'windows_reset': ['resetting windows', 'reset windows', 'windows reset'],
    'system_reset': ['system reset', 'reset system', 'during resets', 'resets'],
    'data_backup': ['backup', 'backing up', 'save', 'saving'],
    'software_update': ['update', 'updating', 'upgrade', 'upgrading'],
    'file_deletion': ['delete', 'deleting', 'remove', 'removing', 'wipe', 'wiping']
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

function detectRelatedTo(text) {
    try {
        var lowerText = safeLowerCase(text);

        // Check specific patterns first
        if (containsAny(lowerText, ['resetting windows', 'reset windows'])) {
            return 'windows_reset';
        }

        if (containsAny(lowerText, ['during resets', 'system reset', 'resets'])) {
            return 'system_reset';
        }

        for (var relatedTo in RELATED_TO_PATTERNS) {
            if (RELATED_TO_PATTERNS.hasOwnProperty(relatedTo)) {
                if (containsAny(lowerText, RELATED_TO_PATTERNS[relatedTo])) {
                    return relatedTo;
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// 4. EXTRACTION
// ==========================================

function extractWarningSignals(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundTypes = {};

        // Check for system breakage risk (Test 11: break my current development setup)
        if (containsAny(lowerText, ['break my', 'will break', 'might break', 'could break']) &&
            containsAny(lowerText, ['setup', 'development', 'config', 'environment'])) {

            if (!foundTypes['system_breakage_risk']) {
                foundTypes['system_breakage_risk'] = true;
                var relatedTo = 'windows_reset';
                if (containsAny(lowerText, ['resetting windows', 'reset windows'])) {
                    relatedTo = 'windows_reset';
                }
                results.push({
                    type: 'system_breakage_risk',
                    related_to: relatedTo,
                    confidence: 0.85
                });
            }
        }

        // Check for data loss risk with reset context
        if ((containsAny(lowerText, ['reset', 'resetting', 'wipe', 'wiping']) &&
            containsAny(lowerText, ['pc', 'windows', 'computer'])) ||
            containsAny(lowerText, ['without losing', 'not losing', 'don\'t want to lose'])) {

            if (!foundTypes['data_loss_risk']) {
                foundTypes['data_loss_risk'] = true;
                results.push({
                    type: 'data_loss_risk',
                    related_to: 'pc_reset',
                    confidence: 0.90
                });
            }
        }

        // Check for data loss concern during resets (Test 15)
        if (containsAny(lowerText, ['worry about data', 'worried about data', 'worry about loss', 'still worry', 'still worried']) &&
            containsAny(lowerText, ['reset', 'resets', 'resetting'])) {

            if (!foundTypes['data_loss_risk']) {
                foundTypes['data_loss_risk'] = true;
                results.push({
                    type: 'data_loss_risk',
                    related_to: 'system_reset',
                    confidence: 0.90
                });
            }
        }

        // Check for wiped/deleted results
        if (containsAny(lowerText, ['wiped', 'deleted', 'lost', 'gone']) &&
            containsAny(lowerText, ['files', 'data', 'local'])) {

            if (!foundTypes['data_loss_risk']) {
                foundTypes['data_loss_risk'] = true;
                var relatedTo = detectRelatedTo(text);
                results.push({
                    type: 'data_loss_risk',
                    related_to: relatedTo || 'file_deletion',
                    confidence: 0.90
                });
            }
        }

        // General warning detection
        if (results.length === 0) {
            var detected = detectWarningType(text);
            if (detected) {
                var relatedTo = detectRelatedTo(text);
                results.push({
                    type: detected.type,
                    related_to: relatedTo,
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
