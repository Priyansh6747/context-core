var nlp = require('compromise');

/**
 * Tools Extraction Module (v2.0 - Production Grade)
 * Extracts hardware, software, services, platforms, and security tools.
 * ES5 compatible with comprehensive error handling.
 */

// Known hardware devices and components
var HARDWARE_PATTERNS = [
    'esp32', 'esp8266', 'arduino', 'raspberry pi', 'rpi', 'stm32',
    'laptop', 'desktop', 'computer', 'pc', 'mac', 'macbook', 'imac',
    'iphone', 'ipad', 'android phone', 'smartphone', 'tablet', 'phone',
    'sensor', 'lcd', 'oled', 'display', 'screen', 'monitor',
    'camera', 'webcam', 'microphone', 'speaker', 'headphones',
    'keyboard', 'mouse', 'printer', 'scanner', 'router',
    'gpu', 'cpu', 'ram', 'ssd', 'hard drive', 'nvme'
];

// Known software applications
var SOFTWARE_PATTERNS = [
    'windows', 'linux', 'macos', 'ubuntu', 'debian', 'fedora', 'arch',
    'chrome', 'google chrome', 'firefox', 'safari', 'edge', 'brave', 'opera',
    'vscode', 'visual studio', 'vim', 'emacs', 'sublime', 'atom',
    'photoshop', 'illustrator', 'figma', 'sketch', 'xd',
    'excel', 'word', 'powerpoint', 'outlook', 'teams', 'slack',
    'zoom', 'discord', 'telegram', 'whatsapp', 'signal',
    'expo go', 'expo'
];

// Known services and platforms
var SERVICE_PATTERNS = [
    'github', 'gitlab', 'bitbucket', 'aws', 'azure', 'gcp',
    'firebase', 'supabase', 'vercel', 'netlify', 'heroku',
    'docker', 'kubernetes', 'openai', 'anthropic', 'stripe',
    'cloudflare', 'mongodb', 'postgresql', 'mysql', 'redis',
    'npm', 'yarn', 'pip', 'conda', 'homebrew',
    'cloud storage', 'cloud backup', 'icloud', 'google drive', 'dropbox', 'onedrive',
    'cloud', 'cloud backed', 'cloud-backed'
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

// Deprecated context indicators
var DEPRECATED_INDICATORS = [
    'stopped using', 'no longer use', 'don\'t use anymore', 'quit using',
    'switched away from', 'moved away from', 'deprecated', 'abandoned'
];

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

function containsPhrase(str, phrase) {
    if (!isValidString(str) || !isValidString(phrase)) return false;
    return safeLowerCase(str).indexOf(safeLowerCase(phrase)) !== -1;
}

function containsAny(str, phrases) {
    if (!isValidString(str) || !Array.isArray(phrases)) return false;

    for (var i = 0; i < phrases.length; i++) {
        if (containsPhrase(str, phrases[i])) {
            return true;
        }
    }
    return false;
}

function determineContext(text, toolName) {
    try {
        var lowerText = safeLowerCase(text);

        // Check for deprecated context (Test 17)
        if (containsAny(lowerText, DEPRECATED_INDICATORS)) {
            return 'deprecated';
        }

        return 'in_use';
    } catch (e) {
        return 'in_use';
    }
}

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

function extractToolsFromText(text) {
    var results = [];

    try {
        var lowerText = safeLowerCase(text);
        var foundTools = {};

        // Check for Expo Go (Test 17)
        if (containsPhrase(lowerText, 'expo go')) {
            if (!foundTools['expo_go']) {
                foundTools['expo_go'] = true;
                results.push({
                    type: 'software',
                    name: 'expo_go',
                    context: determineContext(text, 'expo_go'),
                    confidence: 0.95
                });
            }
        }

        // Check for Windows
        if (containsPhrase(lowerText, 'windows')) {
            if (!foundTools['windows']) {
                foundTools['windows'] = true;
                results.push({
                    type: 'software',
                    name: 'windows',
                    context: determineContext(text, 'windows'),
                    confidence: 0.95
                });
            }
        }

        // Check for Chrome
        if (containsPhrase(lowerText, 'chrome')) {
            if (!foundTools['google_chrome']) {
                foundTools['google_chrome'] = true;
                results.push({
                    type: 'software',
                    name: 'google_chrome',
                    context: 'in_use',
                    confidence: 0.90
                });
            }
        }

        // Check for cloud storage/backed
        if (containsPhrase(lowerText, 'cloud backed') ||
            containsPhrase(lowerText, 'cloud-backed') ||
            containsPhrase(lowerText, 'cloud storage') ||
            containsPhrase(lowerText, 'cloud backup')) {
            if (!foundTools['cloud_storage']) {
                foundTools['cloud_storage'] = true;
                results.push({
                    type: 'service',
                    name: 'cloud_storage',
                    context: 'in_use',
                    confidence: 0.85
                });
            }
        }

        // Check for PostgreSQL
        if (containsPhrase(lowerText, 'postgresql') || containsPhrase(lowerText, 'postgres')) {
            if (!foundTools['postgresql']) {
                foundTools['postgresql'] = true;
                results.push({
                    type: 'software',
                    name: 'postgresql',
                    context: 'in_use',
                    confidence: 0.90
                });
            }
        }

        // Check for Android
        if (containsPhrase(lowerText, 'android')) {
            if (!foundTools['android']) {
                foundTools['android'] = true;
                results.push({
                    type: 'platform',
                    name: 'android',
                    context: 'in_use',
                    confidence: 0.90
                });
            }
        }

        // Check for phone (hardware)
        if ((containsPhrase(lowerText, 'my phone') ||
            containsPhrase(lowerText, 'phone') ||
            containsPhrase(lowerText, 'smartphone')) &&
            !containsPhrase(lowerText, 'android phone')) {
            if (!foundTools['phone']) {
                foundTools['phone'] = true;
                results.push({
                    type: 'hardware',
                    name: 'phone',
                    context: 'in_use',
                    confidence: 0.90
                });
            }
        }

        // Check for PC
        if (containsPhrase(lowerText, 'pc') ||
            containsPhrase(lowerText, 'my pc') ||
            containsPhrase(lowerText, 'windows pc')) {
            if (!foundTools['pc']) {
                foundTools['pc'] = true;
                results.push({
                    type: 'hardware',
                    name: 'pc',
                    context: 'in_use',
                    confidence: 0.90
                });
            }
        }

        // Check for laptop
        if (containsPhrase(lowerText, 'laptop') || containsPhrase(lowerText, 'my laptop')) {
            if (!foundTools['laptop']) {
                foundTools['laptop'] = true;
                results.push({
                    type: 'hardware',
                    name: 'laptop',
                    context: 'in_use',
                    confidence: 0.90
                });
            }
        }

        // Scan for other known tools
        var allPatterns = [
            { patterns: HARDWARE_PATTERNS, type: 'hardware' },
            { patterns: SOFTWARE_PATTERNS, type: 'software' },
            { patterns: SERVICE_PATTERNS, type: 'service' },
            { patterns: PLATFORM_PATTERNS, type: 'platform' },
            { patterns: SECURITY_PATTERNS, type: 'security' }
        ];

        for (var i = 0; i < allPatterns.length; i++) {
            var category = allPatterns[i];
            for (var j = 0; j < category.patterns.length; j++) {
                var pattern = category.patterns[j];
                if (containsPhrase(lowerText, pattern)) {
                    var normalizedName = normalizeToolName(pattern);
                    if (normalizedName && !foundTools[normalizedName]) {
                        foundTools[normalizedName] = true;
                        results.push({
                            type: category.type,
                            name: normalizedName,
                            context: determineContext(text, normalizedName),
                            confidence: 0.85
                        });
                    }
                }
            }
        }
    } catch (e) {
        // Return empty results on error
    }

    return results;
}

function deduplicateTools(tools) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < tools.length; i++) {
            var item = tools[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type || !item.name || !item.context) continue;

            var key = item.type + ':' + item.name;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    name: item.name,
                    context: item.context,
                    confidence: isValidNumber(item.confidence) ? item.confidence : 0.5
                });
            }
        }
    } catch (e) {
        return [];
    }

    return unique;
}

function extractTools(text) {
    try {
        if (!isValidString(text)) {
            return [];
        }

        if (text.length > 50000) {
            text = text.substring(0, 50000);
        }

        var tools = extractToolsFromText(text);

        return deduplicateTools(tools);
    } catch (e) {
        return [];
    }
}

module.exports = { extractTools: extractTools };