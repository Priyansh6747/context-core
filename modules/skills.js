var nlp = require('compromise');

/**
 * Skills Extraction Module (v3.0 - Production Grade)
 * Extracts capabilities and competencies - what the user CAN DO.
 * ES5 compatible, production-hardened.
 */

// ==========================================
// 0. CONFIGURATION & CONSTANTS
// ==========================================

var CONFIG = {
    MAX_INPUT_LENGTH: 50000,
    MIN_SKILL_LENGTH: 2,
    MAX_SKILL_LENGTH: 50,
    DEFAULT_CONFIDENCE: 0.60,
    HEDGE_CONFIDENCE_PENALTY: 0.8,
    MAX_CONFIDENCE: 0.95
};

var ERROR_MESSAGES = {
    INVALID_INPUT: 'Invalid input provided to extractSkills',
    NLP_PARSE_FAILED: 'NLP parsing failed',
    STRATEGY_FAILED: 'Strategy execution failed'
};

// ==========================================
// 1. KNOWLEDGE BASES (Dictionaries)
// ==========================================

var TECHNICAL_SKILLS = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'rust', 'go', 'swift', 'kotlin',
    'react', 'reactjs', 'react.js', 'vue', 'vuejs', 'angular', 'svelte', 'next.js', 'nuxt', 'gatsby',
    'node.js', 'node', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'asp.net',
    'sql', 'nosql', 'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'sqlite', 'cassandra', 'elasticsearch',
    'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'terraform', 'ansible', 'chef', 'puppet',
    'git', 'github', 'gitlab', 'ci/cd', 'jenkins', 'circleci', 'travis', 'github actions',
    'html', 'html5', 'css', 'css3', 'tailwind', 'bootstrap', 'sass', 'less', 'styled-components',
    'webpack', 'vite', 'babel', 'npm', 'yarn', 'pnpm',
    'linux', 'bash', 'shell', 'powershell', 'unix',
    'graphql', 'rest api', 'restful api', 'soap', 'grpc', 'websockets',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'opencv', 'pandas', 'numpy', 'scipy',
    'backend', 'frontend', 'fullstack', 'devops', 'mobile development', 'web development',
    'android', 'ios', 'react native', 'flutter', 'ionic'
];

var LANGUAGE_SKILLS = [
    'english', 'hindi', 'spanish', 'french', 'german', 'chinese', 'japanese',
    'arabic', 'russian', 'portuguese', 'italian', 'korean', 'dutch', 'swedish',
    'javascript', 'python', 'java', 'c++', 'typescript', 'rust', 'go', 'php', 'ruby'
];

var GENERAL_SKILLS = [
    'debugging', 'problem solving', 'teaching', 'mentoring', 'leading',
    'designing', 'architecting', 'planning', 'organizing', 'communicating',
    'writing', 'documentation', 'presenting', 'analysis', 'research',
    'agile', 'scrum', 'kanban', 'jira', 'confluence',
    'testing', 'unit testing', 'integration testing', 'e2e testing', 'tdd', 'bdd',
    'memory management', 'optimization', 'performance tuning', 'system design'
];

var SKILL_INDICATORS = {
    explicit: {
        patterns: [
            'know', 'knows', 'can', 'able to', 'capable of', 'proficient',
            'proficient in', 'experienced in', 'skilled at', 'comfortable with',
            'familiar with', 'understand', 'understands', 'good at', 'great at', 'expert in'
        ],
        confidence: 0.90
    },
    moderate: {
        patterns: ['work with', 'working with', 'used', 'have used', 'worked with', 'built', 'writing', 'coding', 'developing'],
        confidence: 0.70
    },
    weak: {
        patterns: ['tried', 'played with', 'dabbled in', 'exposure to', 'checked out'],
        confidence: 0.50
    }
};

var CONTEXTUAL_TRIGGERS = [
    'writing', 'write', 'written',
    'building', 'build', 'built',
    'coding', 'code', 'coded',
    'developing', 'develop', 'developed',
    'debugging', 'debug', 'debugged',
    'implementing', 'implement', 'implemented',
    'creating', 'create', 'created',
    'maintaining', 'maintain', 'maintained',
    'deploying', 'deploy', 'deployed'
];

var LEVEL_INDICATORS = {
    basic: ['basics', 'basic', 'beginner', 'learning', 'new to', 'just started', 'starting with', 'little bit', 'a little', 'junior'],
    intermediate: ['comfortable', 'decent', 'okay at', 'working knowledge', 'some experience', 'fairly well', 'pretty well', 'mid-level'],
    advanced: ['expert', 'advanced', 'very good', 'excellent', 'master', 'deep knowledge', 'highly skilled', 'proficient', 'extensively', 'very well', 'fluent', 'senior', 'lead', 'architect', 'pro']
};

var IDENTITY_INDICATORS = [
    'i am', 'im a', 'i\'m a', 'i am a', 'my role', 'my job',
    'working as', 'employed as', 'position'
];

var GOAL_INDICATORS = [
    'want to learn', 'planning to learn', 'will learn', 'hoping to learn',
    'going to learn', 'need to learn', 'should learn', 'aim to'
];

var HEDGE_WORDS = ['kind of', 'sort of', 'maybe', 'perhaps', 'possibly', 'might'];

// ==========================================
// 2. UTILITY FUNCTIONS (Enhanced Safety)
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

function containsPhrase(str, phrase) {
    if (!isValidString(str) || !isValidString(phrase)) return false;
    try {
        return safeLowerCase(str).indexOf(safeLowerCase(phrase)) !== -1;
    } catch (e) {
        return false;
    }
}

function containsAny(str, phrases) {
    if (!isValidString(str) || !Array.isArray(phrases)) return false;
    try {
        for (var i = 0; i < phrases.length; i++) {
            if (containsPhrase(str, phrases[i])) return true;
        }
        return false;
    } catch (e) {
        return false;
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

function sanitizeInput(text) {
    try {
        if (!isValidString(text)) return '';

        // Trim and limit length
        var sanitized = safeTrim(text);
        if (sanitized.length > CONFIG.MAX_INPUT_LENGTH) {
            sanitized = sanitized.substring(0, CONFIG.MAX_INPUT_LENGTH);
        }

        // Remove null bytes and other problematic characters
        sanitized = sanitized.replace(/\0/g, '');

        return sanitized;
    } catch (e) {
        return '';
    }
}

function logError(context, error) {
    // Production logging hook - replace with your logger
    if (typeof console !== 'undefined' && console.error) {
        console.error('[SkillsExtractor][' + context + ']', error);
    }
}

// ==========================================
// 3. CORE LOGIC (Enhanced)
// ==========================================

function cleanSkillCandidate(raw) {
    try {
        if (!isValidString(raw)) return '';
        var s = safeTrim(raw);

        // Remove proficiency adverbs
        s = s.replace(/\s+(fairly|very|pretty|quite|really|extremely|moderately)?\s*well$/i, '');

        // Remove single adverbs
        s = s.replace(/\s+(extensively|fluently|proficiently|expertly|badly|professionally)$/i, '');

        // Remove duration patterns
        s = s.replace(/\s+(for|since)\s+(\d+|a|an|last)\s+.*$/i, '');

        // Remove context phrases
        s = s.replace(/\s+(in production|at scale|on the job|daily|weekly|monthly|projects?|apps?|services?|systems?)$/i, '');

        // Remove problem indicators
        s = s.replace(/\s+(issues|problems|bugs|errors|challenges|difficulties)$/i, '');

        // Remove articles and conjunctions at start
        s = s.replace(/^(a|an|the|and|or|but)\s+/i, '');

        return safeTrim(s);
    } catch (e) {
        logError('cleanSkillCandidate', e);
        return raw;
    }
}

function determineSkillType(skillName) {
    try {
        if (!isValidString(skillName)) return 'technical';
        var lowerName = safeLowerCase(skillName);

        // Check spoken languages (excluding programming languages)
        var spokenLanguages = ['english', 'hindi', 'spanish', 'french', 'german', 'chinese', 'japanese', 'arabic', 'russian', 'portuguese', 'italian', 'korean', 'dutch', 'swedish'];
        for (var i = 0; i < spokenLanguages.length; i++) {
            if (containsPhrase(lowerName, spokenLanguages[i])) {
                return 'language';
            }
        }

        // Check technical skills
        for (var j = 0; j < TECHNICAL_SKILLS.length; j++) {
            if (lowerName === TECHNICAL_SKILLS[j] || containsPhrase(lowerName, TECHNICAL_SKILLS[j])) {
                return 'technical';
            }
        }

        // Check general skills
        for (var k = 0; k < GENERAL_SKILLS.length; k++) {
            if (containsPhrase(lowerName, GENERAL_SKILLS[k])) {
                return 'general';
            }
        }

        // Heuristic fallback
        if (lowerName.indexOf('ing') !== -1 || lowerName.indexOf('tion') !== -1) {
            return 'general';
        }

        return 'technical';
    } catch (e) {
        logError('determineSkillType', e);
        return 'technical';
    }
}

function determineSkillLevel(raw) {
    try {
        if (!isValidString(raw)) return null;
        var lowerRaw = safeLowerCase(raw);

        if (containsAny(lowerRaw, LEVEL_INDICATORS.advanced)) return 'advanced';
        if (containsAny(lowerRaw, LEVEL_INDICATORS.intermediate)) return 'intermediate';
        if (containsAny(lowerRaw, LEVEL_INDICATORS.basic)) return 'basic';

        return null;
    } catch (e) {
        logError('determineSkillLevel', e);
        return null;
    }
}

function getIndicatorConfidence(raw) {
    try {
        if (!isValidString(raw)) return CONFIG.DEFAULT_CONFIDENCE;
        var lowerRaw = safeLowerCase(raw);

        if (containsAny(lowerRaw, SKILL_INDICATORS.explicit.patterns)) {
            return SKILL_INDICATORS.explicit.confidence;
        }
        if (containsAny(lowerRaw, SKILL_INDICATORS.moderate.patterns)) {
            return SKILL_INDICATORS.moderate.confidence;
        }
        if (containsAny(lowerRaw, SKILL_INDICATORS.weak.patterns)) {
            return SKILL_INDICATORS.weak.confidence;
        }

        return CONFIG.DEFAULT_CONFIDENCE;
    } catch (e) {
        logError('getIndicatorConfidence', e);
        return CONFIG.DEFAULT_CONFIDENCE;
    }
}

function normalizeSkillName(rawName) {
    try {
        if (!isValidString(rawName)) return null;

        var clean = safeTrim(rawName);
        clean = safeLowerCase(clean);

        // Remove noise words from start
        var startPattern = /^(a|an|the|my|some|good|great|basic|advanced|complex|simple|proficient|experienced|speak|speaks|speaking|write|writes|writing|use|using|build|builds|building|code|coding|develop|developing|implement|implementing|create|creating)\s+/g;
        clean = clean.replace(startPattern, '');

        // Remove end descriptors
        clean = clean.replace(/\s+(language|programming|skill|framework|library|tech|stack|tool|platform)$/g, '');

        // Handle trailing punctuation (preserve .js, .net, c++, c#)
        if (clean.endsWith('.') && !clean.endsWith('.js') && !clean.endsWith('.net')) {
            clean = clean.slice(0, -1);
        }

        // Normalize spacing
        clean = clean.replace(/\s+/g, ' ');
        clean = safeTrim(clean);

        // Validation
        if (clean.length < CONFIG.MIN_SKILL_LENGTH) return null;
        if (clean.length > CONFIG.MAX_SKILL_LENGTH) return null;

        // Filter out common non-skills
        var invalidSkills = ['the', 'and', 'but', 'with', 'from', 'that', 'this', 'have', 'been', 'more'];
        for (var i = 0; i < invalidSkills.length; i++) {
            if (clean === invalidSkills[i]) return null;
        }

        return clean;
    } catch (e) {
        logError('normalizeSkillName', e);
        return null;
    }
}

function isValidSkill(raw) {
    try {
        if (!isValidString(raw)) return false;
        var lowerRaw = safeLowerCase(raw);

        // Reject identity statements
        if (containsAny(lowerRaw, IDENTITY_INDICATORS)) return false;

        // Reject goals (unless explicit ability included)
        if (containsAny(lowerRaw, GOAL_INDICATORS) &&
            !containsAny(lowerRaw, SKILL_INDICATORS.explicit.patterns)) {
            return false;
        }

        return true;
    } catch (e) {
        logError('isValidSkill', e);
        return false;
    }
}

function applyHedgePenalty(confidence, rawText) {
    try {
        if (!isValidString(rawText)) return confidence;
        var lowerText = safeLowerCase(rawText);

        if (containsAny(lowerText, HEDGE_WORDS)) {
            return confidence * CONFIG.HEDGE_CONFIDENCE_PENALTY;
        }

        return confidence;
    } catch (e) {
        logError('applyHedgePenalty', e);
        return confidence;
    }
}

function createSkillObject(name, type, level, confidence, raw) {
    try {
        return {
            type: type || 'technical',
            name: name || '',
            level: level || null,
            confidence: Math.min(confidence || CONFIG.DEFAULT_CONFIDENCE, CONFIG.MAX_CONFIDENCE),
            raw: raw || ''
        };
    } catch (e) {
        logError('createSkillObject', e);
        return null;
    }
}

// ==========================================
// 4. EXTRACTION STRATEGIES (Enhanced)
// ==========================================

function extractExplicitSkills(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(i|i\'m|im) (know|knows|can|able to|capable of|proficient|proficient in|experienced in|skilled at|good at|great at|expert in) .+',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        var parts = text.split(/\b(know|knows|can|able to|capable of|proficient|proficient in|experienced in|skilled at|good at|great at|expert in)\b/i);
                        if (parts.length < 3) return null;

                        var skillPart = safeTrim(parts[2]);
                        var candidate = skillPart.split(/\b(and|but|however|although|whilst|while)\b|[.;]/)[0];
                        return cleanSkillCandidate(candidate);
                    } catch (e) {
                        logError('strategy1.parse', e);
                        return null;
                    }
                }
            },
            {
                match: '(comfortable|familiar) with .+',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;
                        d = safeRemove(d, '(comfortable|familiar) with');
                        var text = safeGetText(d);
                        var candidate = text.split(/[.;]/)[0];
                        return cleanSkillCandidate(candidate);
                    } catch (e) {
                        logError('strategy2.parse', e);
                        return null;
                    }
                }
            },
            {
                match: '(i|we) (have|has|got) (experience|expertise|knowledge) (in|with|of) .+',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);
                        var parts = text.split(/\b(in|with|of)\b/i);
                        if (parts.length < 2) return null;
                        var skillPart = safeTrim(parts[parts.length - 1]);
                        var candidate = skillPart.split(/[.;]/)[0];
                        return cleanSkillCandidate(candidate);
                    } catch (e) {
                        logError('strategy3.parse', e);
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
                        if (!isValidSkill(rawText)) return;

                        var rawSkill = strat.parse(m);
                        if (!rawSkill) return;

                        var normalizedName = normalizeSkillName(rawSkill);
                        if (!normalizedName) return;

                        var skillType = determineSkillType(normalizedName);
                        var level = determineSkillLevel(rawText);
                        var confidence = getIndicatorConfidence(rawText);
                        confidence = applyHedgePenalty(confidence, rawText);

                        var skillObj = createSkillObject(normalizedName, skillType, level, confidence, rawText);
                        if (skillObj) results.push(skillObj);
                    } catch (e) {
                        logError('extractExplicitSkills.forEach', e);
                    }
                });
            } catch (e) {
                logError('extractExplicitSkills.strategy', e);
            }
        }
    } catch (e) {
        logError('extractExplicitSkills', e);
    }

    return results;
}

function extractContextualSkills(text) {
    var results = [];

    try {
        if (!isValidString(text)) return results;
        var lowerText = safeLowerCase(text);

        // Check for triggers
        var hasTrigger = false;
        var allTriggers = CONTEXTUAL_TRIGGERS
            .concat(SKILL_INDICATORS.explicit.patterns)
            .concat(SKILL_INDICATORS.moderate.patterns);

        for (var i = 0; i < allTriggers.length; i++) {
            if (containsPhrase(lowerText, allTriggers[i])) {
                hasTrigger = true;
                break;
            }
        }

        if (!hasTrigger) return results;

        // Scan technical skills
        for (var j = 0; j < TECHNICAL_SKILLS.length; j++) {
            try {
                var skill = TECHNICAL_SKILLS[j];
                var regex;

                // Handle special cases
                if (skill === 'c++') {
                    regex = /c\+\+/i;
                } else if (skill === 'c#') {
                    regex = /c\#/i;
                } else if (skill.indexOf('.') !== -1) {
                    regex = new RegExp('\\b' + skill.replace(/\./g, '\\.') + '\\b', 'i');
                } else {
                    regex = new RegExp('\\b' + skill + '\\b', 'i');
                }

                if (regex.test(text)) {
                    var skillObj = createSkillObject(
                        skill,
                        'technical',
                        determineSkillLevel(text),
                        0.85,
                        text
                    );
                    if (skillObj) results.push(skillObj);
                }
            } catch (e) {
                logError('extractContextualSkills.technical', e);
            }
        }

        // Scan general skills
        for (var k = 0; k < GENERAL_SKILLS.length; k++) {
            try {
                var generalSkill = GENERAL_SKILLS[k];
                var generalRegex = new RegExp('\\b' + generalSkill + '\\b', 'i');

                if (generalRegex.test(text)) {
                    var generalSkillObj = createSkillObject(
                        generalSkill,
                        'general',
                        determineSkillLevel(text),
                        0.85,
                        text
                    );
                    if (generalSkillObj) results.push(generalSkillObj);
                }
            } catch (e) {
                logError('extractContextualSkills.general', e);
            }
        }
    } catch (e) {
        logError('extractContextualSkills', e);
    }

    return results;
}

function extractLanguageSkills(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var patterns = [
            {
                match: '(speak|speaks|speaking|fluent in|native) .+',
                confidence: 0.90,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;
                        d = safeRemove(d, '(speak|speaks|speaking|fluent in|native)');
                        var text = safeGetText(d);
                        return cleanSkillCandidate(text.split(/\b(and|but)\b|[.;]/)[0]);
                    } catch (e) {
                        logError('extractLanguageSkills.parse', e);
                        return null;
                    }
                }
            }
        ];

        for (var i = 0; i < patterns.length; i++) {
            try {
                var p = patterns[i];
                var matches = doc.match(p.match);
                if (!matches) continue;

                matches.forEach(function(m) {
                    try {
                        var rawText = safeGetText(m);
                        var rawSkill = p.parse(m);
                        if (!rawSkill) return;

                        var normalized = normalizeSkillName(rawSkill);
                        if (!normalized) return;

                        // Validate it's a language
                        var isLang = false;
                        for (var j = 0; j < LANGUAGE_SKILLS.length; j++) {
                            if (containsPhrase(normalized, LANGUAGE_SKILLS[j])) {
                                isLang = true;
                                break;
                            }
                        }
                        if (!isLang) return;

                        var skillObj = createSkillObject(
                            normalized,
                            'language',
                            determineSkillLevel(rawText),
                            p.confidence,
                            rawText
                        );
                        if (skillObj) results.push(skillObj);
                    } catch (e) {
                        logError('extractLanguageSkills.forEach', e);
                    }
                });
            } catch (e) {
                logError('extractLanguageSkills.pattern', e);
            }
        }
    } catch (e) {
        logError('extractLanguageSkills', e);
    }

    return results;
}

// ==========================================
// 5. DEDUPLICATION & MERGING (Enhanced)
// ==========================================

function deduplicateAndMerge(skills) {
    try {
        if (!Array.isArray(skills)) return [];

        var unique = [];
        var seen = {};

        for (var i = 0; i < skills.length; i++) {
            try {
                var item = skills[i];
                if (!item || !item.name) continue;

                var key = item.type + ':' + safeLowerCase(item.name);

                if (!seen[key]) {
                    seen[key] = true;
                    unique.push(item);
                } else {
                    // Find existing and merge
                    for (var j = 0; j < unique.length; j++) {
                        var existing = unique[j];
                        if (safeLowerCase(existing.name) === safeLowerCase(item.name) &&
                            existing.type === item.type) {

                            // Update level if existing doesn't have one
                            if (!existing.level && item.level) {
                                existing.level = item.level;
                            }

                            // Keep higher confidence
                            if (isValidNumber(item.confidence) &&
                                item.confidence > existing.confidence) {
                                existing.confidence = item.confidence;
                            }

                            break;
                        }
                    }
                }
            } catch (e) {
                logError('deduplicateAndMerge.loop', e);
            }
        }

        return unique;
    } catch (e) {
        logError('deduplicateAndMerge', e);
        return skills || [];
    }
}

// ==========================================
// 6. MAIN EXECUTION (Production Grade)
// ==========================================

function extractSkills(text) {
    try {
        // Input validation
        if (!isValidString(text)) {
            logError('extractSkills', new Error(ERROR_MESSAGES.INVALID_INPUT));
            return [];
        }

        // Sanitize input
        var sanitized = sanitizeInput(text);
        if (!sanitized) {
            logError('extractSkills', new Error('Sanitization failed'));
            return [];
        }

        // Parse with NLP
        var doc;
        try {
            doc = nlp(sanitized);
        } catch (e) {
            logError('extractSkills', new Error(ERROR_MESSAGES.NLP_PARSE_FAILED + ': ' + e.message));
            return [];
        }

        if (!doc) {
            logError('extractSkills', new Error('NLP returned null'));
            return [];
        }

        // Execute strategies
        var grammarSkills = [];
        var contextualSkills = [];
        var languageSkills = [];

        try {
            grammarSkills = extractExplicitSkills(doc);
        } catch (e) {
            logError('extractSkills.grammar', e);
        }

        try {
            contextualSkills = extractContextualSkills(sanitized);
        } catch (e) {
            logError('extractSkills.contextual', e);
        }

        try {
            languageSkills = extractLanguageSkills(doc);
        } catch (e) {
            logError('extractSkills.language', e);
        }

        // Combine all results
        var all = [].concat(grammarSkills).concat(contextualSkills).concat(languageSkills);

        // Deduplicate and merge
        var final = deduplicateAndMerge(all);

        return final;
    } catch (e) {
        logError('extractSkills', e);
        return [];
    }
}

// ==========================================
// 7. PUBLIC API
// ==========================================

module.exports = {
    extractSkills: extractSkills,
    // Expose for testing if needed
    _internal: {
        normalizeSkillName: normalizeSkillName,
        determineSkillType: determineSkillType,
        isValidSkill: isValidSkill,
        sanitizeInput: sanitizeInput
    }
};