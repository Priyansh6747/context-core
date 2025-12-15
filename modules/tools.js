var nlp = require('compromise');

/**
 * Tools Extraction Module (v1.0 - Production Grade)
 * Extracts hardware, software, services, platforms, and security tools.
 * ES5 compatible with comprehensive error handling and edge case coverage.
 *
 * RULES:
 * - Explicit mention only, no guessing from context
 * - Tools are external things the user operates or depends on
 * - NOT skills, NOT identity, NOT goals, NOT abilities
 * - Conservative extraction: silence > wrong structure
 */

// Known hardware devices and components
var HARDWARE_PATTERNS = [
    'esp32', 'esp8266', 'arduino', 'raspberry pi', 'rpi', 'stm32',
    'laptop', 'desktop', 'computer', 'pc', 'mac', 'macbook', 'imac',
    'iphone', 'ipad', 'android phone', 'smartphone', 'tablet',
    'sensor', 'lcd', 'oled', 'display', 'screen', 'monitor',
    'camera', 'webcam', 'microphone', 'speaker', 'headphones',
    'keyboard', 'mouse', 'printer', 'scanner', 'router',
    'gpu', 'cpu', 'ram', 'ssd', 'hard drive', 'nvme'
];

// Known software applications
var SOFTWARE_PATTERNS = [
    'windows', 'linux', 'macos', 'ubuntu', 'debian', 'fedora', 'arch',
    'chrome', 'firefox', 'safari', 'edge', 'brave', 'opera',
    'vscode', 'visual studio', 'vim', 'emacs', 'sublime', 'atom',
    'photoshop', 'illustrator', 'figma', 'sketch', 'xd',
    'excel', 'word', 'powerpoint', 'outlook', 'teams', 'slack',
    'zoom', 'discord', 'telegram', 'whatsapp', 'signal'
];

// Known services and platforms
var SERVICE_PATTERNS = [
    'github', 'gitlab', 'bitbucket', 'aws', 'azure', 'gcp',
    'firebase', 'supabase', 'vercel', 'netlify', 'heroku',
    'docker', 'kubernetes', 'openai', 'anthropic', 'stripe',
    'cloudflare', 'mongodb', 'postgresql', 'mysql', 'redis',
    'npm', 'yarn', 'pip', 'conda', 'homebrew'
];

// Known platforms
var PLATFORM_PATTERNS = [
    'android', 'ios', 'web', 'mobile', 'desktop',
    'react native', 'flutter', 'expo', 'cordova',
    'electron', 'tauri', 'pwa'
];

// Known security tools
var SECURITY_PATTERNS = [
    'passkey', 'passkeys', 'password manager', '1password', 'lastpass',
    'bitwarden', 'keepass', 'authy', 'google authenticator',
    '2fa', 'mfa', 'yubikey', 'vpn', 'firewall'
];

// Words that indicate skills/abilities, NOT tools
var SKILL_INDICATORS = [
    'know', 'learned', 'learning', 'understand', 'master', 'expert',
    'proficient', 'familiar', 'experienced', 'skilled', 'good at',
    'able to', 'can', 'could', 'capability'
];

// Words that indicate identity, NOT tools
var IDENTITY_INDICATORS = [
    'i am', 'im a', 'i\'m a', 'working as', 'job as', 'role as',
    'position as', 'title is', 'called a'
];

// Words that indicate goals, NOT current tools
var GOAL_INDICATORS = [
    'want to use', 'planning to use', 'will use', 'would like to use',
    'hoping to use', 'considering', 'thinking about', 'looking into'
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
 * Checks if string contains phrase (case-insensitive)
 */
function containsPhrase(str, phrase) {
    if (!isValidString(str) || !isValidString(phrase)) return false;
    return safeLowerCase(str).indexOf(safeLowerCase(phrase)) !== -1;
}

/**
 * Checks if string contains any phrase from array
 */
function containsAny(str, phrases) {
    if (!isValidString(str) || !Array.isArray(phrases)) return false;

    for (var i = 0; i < phrases.length; i++) {
        if (containsPhrase(str, phrases[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Determines tool type from name
 */
function determineToolType(toolName) {
    try {
        var lowerName = safeLowerCase(toolName);

        for (var i = 0; i < HARDWARE_PATTERNS.length; i++) {
            if (containsPhrase(lowerName, HARDWARE_PATTERNS[i])) {
                return 'hardware';
            }
        }

        for (var j = 0; j < SOFTWARE_PATTERNS.length; j++) {
            if (containsPhrase(lowerName, SOFTWARE_PATTERNS[j])) {
                return 'software';
            }
        }

        for (var k = 0; k < SERVICE_PATTERNS.length; k++) {
            if (containsPhrase(lowerName, SERVICE_PATTERNS[k])) {
                return 'service';
            }
        }

        for (var l = 0; l < PLATFORM_PATTERNS.length; l++) {
            if (containsPhrase(lowerName, PLATFORM_PATTERNS[l])) {
                return 'platform';
            }
        }

        for (var m = 0; m < SECURITY_PATTERNS.length; m++) {
            if (containsPhrase(lowerName, SECURITY_PATTERNS[m])) {
                return 'security';
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Determines context from surrounding text
 */
function determineContext(raw, toolName) {
    try {
        var lowerRaw = safeLowerCase(raw);

        // Check for blocked/deprecated indicators
        if (containsAny(lowerRaw, ['stopped', 'quit', 'removed', 'uninstalled', 'deleted', 'gone'])) {
            return 'deprecated';
        }

        if (containsAny(lowerRaw, ['blocked', 'broken', 'crashed', 'failed', 'not working', 'corrupted'])) {
            return 'blocked';
        }

        // Check for planned/future indicators
        if (containsAny(lowerRaw, ['will use', 'planning to', 'going to use', 'want to use', 'considering'])) {
            return 'planned';
        }

        // Check for current use indicators
        if (containsAny(lowerRaw, ['using', 'use', 'used', 'with', 'on', 'via', 'through', 'running'])) {
            return 'in_use';
        }

        // Default to in_use if tool is mentioned without negative context
        return 'in_use';
    } catch (e) {
        return 'in_use';
    }
}

/**
 * Extracts version if mentioned
 */
function extractVersion(raw, toolName) {
    try {
        var lowerRaw = safeLowerCase(raw);
        var lowerTool = safeLowerCase(toolName);

        // Pattern: "tool version X" or "tool X.X" or "tool vX"
        var versionPatterns = [
            new RegExp(lowerTool + '\\s+(version\\s+)?(\\d+(?:\\.\\d+)*)', 'i'),
            new RegExp(lowerTool + '\\s+v(\\d+(?:\\.\\d+)*)', 'i'),
            new RegExp(lowerTool + '-(\\d+(?:\\.\\d+)*)', 'i')
        ];

        for (var i = 0; i < versionPatterns.length; i++) {
            var match = raw.match(versionPatterns[i]);
            if (match && match[2]) {
                return match[2];
            }
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Normalizes tool name
 */
function normalizeToolName(rawName) {
    try {
        if (!isValidString(rawName)) return null;

        var clean = safeTrim(rawName);
        clean = safeLowerCase(clean);

        // Remove common articles and prepositions
        clean = clean.replace(/^(a|an|the|my|our)\s+/g, '');

        // Normalize spacing
        clean = clean.replace(/\s+/g, '_');

        // Remove special characters except underscore and dash
        clean = clean.replace(/[^a-z0-9_\-]/g, '');

        if (clean.length < 2) return null;
        if (clean.length > 50) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

/**
 * Validates that this is a tool, not a skill/identity/goal
 */
function isValidTool(raw) {
    try {
        if (!isValidString(raw)) return false;

        var lowerRaw = safeLowerCase(raw);

        // HARD NO: Skills
        if (containsAny(lowerRaw, SKILL_INDICATORS)) {
            return false;
        }

        // HARD NO: Identity
        if (containsAny(lowerRaw, IDENTITY_INDICATORS)) {
            return false;
        }

        // HARD NO: Pure goals without current use
        if (containsAny(lowerRaw, GOAL_INDICATORS) &&
            !containsAny(lowerRaw, ['using', 'use', 'with', 'on'])) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
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
 * Extracts explicit tool usage patterns
 */
function extractExplicitTools(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(using|use|used|with|on|via) [#Noun+]',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(using|use|used|with|on|via)');
                        d = safeRemove(d, '(a|an|the|my|our)');

                        return safeGetText(d);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(running|installed|have) [#Noun+] (on|installed)?',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(running|installed|have)');
                        d = safeRemove(d, '(on|installed)');
                        d = safeRemove(d, '(a|an|the|my|our)');

                        return safeGetText(d);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(my|our|the) [#Noun+] (device|phone|laptop|computer|system)',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        // Extract the noun before device/phone/etc
                        var parts = text.split(/\s+(device|phone|laptop|computer|system)/i);
                        if (parts.length > 0) {
                            var tool = safeTrim(parts[0]);
                            tool = tool.replace(/^(my|our|the)\s+/i, '');
                            return tool;
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '[#Noun+] (version|v) [#Value+]',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        var parts = text.split(/\s+(version|v)\s+/i);
                        if (parts.length > 0) {
                            return safeTrim(parts[0]);
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(in|for|through) [#Noun+] (app|application|software|platform)',
                confidence: 0.80,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        var parts = text.split(/\s+(app|application|software|platform)/i);
                        if (parts.length > 0) {
                            var tool = safeTrim(parts[0]);
                            tool = tool.replace(/^(in|for|through)\s+/i, '');
                            return tool;
                        }
                        return null;
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
                        var rawText = safeGetText(m);

                        // CRITICAL: Validate this is a tool, not skill/identity/goal
                        if (!isValidTool(rawText)) {
                            return;
                        }

                        var rawTool = strat.parse(m);
                        if (!rawTool) return;

                        var normalizedName = normalizeToolName(rawTool);
                        if (!normalizedName) return;

                        var toolType = determineToolType(rawTool);
                        if (!toolType) return; // MUST match known tool patterns

                        var context = determineContext(rawText, rawTool);
                        var version = extractVersion(rawText, rawTool);

                        var toolItem = {
                            type: toolType,
                            name: normalizedName,
                            context: context,
                            confidence: strat.confidence,
                            raw: rawText
                        };

                        if (version) {
                            toolItem.version = version;
                        }

                        results.push(toolItem);
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
 * Extracts tools from device/system mentions
 */
function extractDeviceTools(doc) {
    var results = [];

    try {
        if (!doc) return results;

        // Look for explicit device mentions
        var patterns = [
            {
                match: '[#Noun+] (specs|specifications)',
                confidence: 0.80
            },
            {
                match: '(cpu|gpu|processor|ram|memory|storage) .+',
                confidence: 0.85
            }
        ];

        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i];

            try {
                var matches = doc.match(p.match);
                if (!matches) continue;

                matches.forEach(function(m) {
                    try {
                        var rawText = safeGetText(m);

                        if (!isValidTool(rawText)) {
                            return;
                        }

                        var text = rawText.toLowerCase();
                        var toolName = null;

                        // Extract hardware component
                        if (text.indexOf('cpu') !== -1) toolName = 'cpu';
                        else if (text.indexOf('gpu') !== -1) toolName = 'gpu';
                        else if (text.indexOf('ram') !== -1) toolName = 'ram';
                        else if (text.indexOf('memory') !== -1) toolName = 'memory';
                        else if (text.indexOf('storage') !== -1) toolName = 'storage';

                        if (!toolName) return;

                        results.push({
                            type: 'hardware',
                            name: toolName,
                            context: 'in_use',
                            confidence: p.confidence,
                            raw: rawText
                        });
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
 * @param {string} text - Input text to extract tools from
 * @returns {Array} Array of extracted tools
 */
function extractTools(text) {
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

        var explicitTools = extractExplicitTools(doc);
        var deviceTools = extractDeviceTools(doc);

        // Merge all results
        var all = [];

        if (Array.isArray(explicitTools)) {
            all = all.concat(explicitTools);
        }
        if (Array.isArray(deviceTools)) {
            all = all.concat(deviceTools);
        }

        // Deduplicate by type:name:context
        var unique = [];
        var seen = {};

        for (var i = 0; i < all.length; i++) {
            var item = all[i];

            // Validate item structure - STRICT
            if (!item || typeof item !== 'object') continue;
            if (!item.type || !item.name || !item.context) continue;
            if (!isValidString(item.type) || !isValidString(item.name) || !isValidString(item.context)) continue;

            // Validate required fields have valid values
            var validTypes = ['hardware', 'software', 'service', 'platform', 'security'];
            var validContexts = ['in_use', 'planned', 'blocked', 'deprecated'];

            var typeValid = false;
            for (var j = 0; j < validTypes.length; j++) {
                if (item.type === validTypes[j]) {
                    typeValid = true;
                    break;
                }
            }

            var contextValid = false;
            for (var k = 0; k < validContexts.length; k++) {
                if (item.context === validContexts[k]) {
                    contextValid = true;
                    break;
                }
            }

            if (!typeValid || !contextValid) continue;

            var key = item.type + ':' + item.name + ':' + item.context;

            if (!seen[key]) {
                seen[key] = true;

                var toolItem = {
                    type: item.type,
                    name: item.name,
                    context: item.context,
                    confidence: isValidNumber(item.confidence) ? item.confidence : 0.5,
                };

                // Add optional fields if present
                if (item.version && isValidString(item.version)) {
                    toolItem.version = item.version;
                }
                if (item.scope && isValidString(item.scope)) {
                    toolItem.scope = item.scope;
                }

                unique.push(toolItem);
            }
        }

        return unique;
    } catch (e) {
        // Catastrophic failure - return empty array
        // CRITICAL: Never throw, never return invalid structure
        return [];
    }
}

module.exports = { extractTools: extractTools };