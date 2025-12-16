var nlp = require('compromise');

/**
 * Jobs Extraction Module (v1.1 - Fixed)
 * Extracts ongoing commitments, projects, and long-running work.
 * ES5 compatible with comprehensive error handling and edge case coverage.
 *
 * RULES:
 * - Jobs are ACTIVITIES (building, working on, researching)
 * - Jobs are ONGOING (not single events, not completed work)
 * - NOT skills, NOT tools, NOT identity, NOT goals
 * - Conservative extraction: silence > wrong job
 */

// ==========================================
// 0. CONFIGURATION & CONSTANTS
// ==========================================

var CONFIG = {
    MAX_INPUT_LENGTH: 50000,
    MIN_TITLE_LENGTH: 3,
    MAX_TITLE_LENGTH: 200,
    MIN_CONFIDENCE: 0.5,
    MAX_CONFIDENCE: 0.98,
    DEFAULT_CONFIDENCE: 0.85
};

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

// Technical skills that when mentioned alone are NOT jobs
var TECHNICAL_SKILLS = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'rust', 'go', 'swift', 'kotlin',
    'react', 'reactjs', 'react.js', 'vue', 'vuejs', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby',
    'node.js', 'node', 'nodejs', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'asp.net',
    'sql', 'nosql', 'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'sqlite', 'cassandra', 'elasticsearch',
    'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'terraform', 'ansible', 'chef', 'puppet',
    'git', 'github', 'gitlab', 'bitbucket', 'ci/cd', 'jenkins', 'circleci', 'travis', 'github actions',
    'html', 'html5', 'css', 'css3', 'tailwind', 'bootstrap', 'sass', 'less', 'styled-components',
    'webpack', 'vite', 'rollup', 'babel', 'npm', 'yarn', 'pnpm', 'bower',
    'linux', 'windows', 'macos', 'bash', 'shell', 'powershell', 'unix',
    'graphql', 'rest', 'rest api', 'restful', 'soap', 'grpc', 'websockets',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'keras', 'opencv', 'pandas', 'numpy', 'scipy',
    'backend', 'frontend', 'fullstack', 'full-stack', 'devops', 'mobile', 'web',
    'android', 'ios', 'react native', 'flutter', 'ionic', 'cordova', 'expo'
];

// Valid job activity triggers
var JOB_TRIGGERS = {
    'high_confidence': {
        patterns: ['working on', 'building', 'developing', 'creating', 'making', 'implementing', 'designing', 'architecting'],
        confidence: 0.92
    },
    'medium_confidence': {
        patterns: ['studying', 'studying for', 'researching', 'exploring', 'investigating', 'analyzing', 'preparing for', 'writing'],
        confidence: 0.85
    },
    'maintenance': {
        patterns: ['maintaining', 'managing', 'supporting', 'running', 'operating', 'handling'],
        confidence: 0.85
    },
    'employment': {
        patterns: ['working at', 'working for', 'employed at'],
        confidence: 0.80
    }
};

// Words that indicate GOALS, not current jobs
var GOAL_INDICATORS = [
    'want to', 'planning to', 'will', 'going to', 'hoping to', 'would like to',
    'aim to', 'intend to', 'plan to', 'wish to', 'need to', 'should', 'might',
    'thinking about', 'considering', 'looking to'
];

// Words that indicate IDENTITY, not jobs
var IDENTITY_INDICATORS = [
    'i am a', 'im a', 'i\'m a', 'my role', 'my position', 'my job title',
    'employed as', 'hired as'
];

// Words that indicate COMPLETED work, not ongoing jobs
var COMPLETED_INDICATORS = [
    'built', 'created', 'made', 'finished', 'completed', 'shipped', 'deployed',
    'released', 'launched', 'did', 'was working on', 'used to work on', 'previously'
];

// Words that indicate SINGLE EVENTS, not ongoing work
var EVENT_INDICATORS = [
    'yesterday', 'last night', 'this morning', 'earlier today', 'just now',
    'ago', 'once', 'one time'
];

// Vague titles that aren't real jobs
var VAGUE_TITLES = [
    'stuff', 'things', 'something', 'anything', 'everything', 'nothing',
    'it', 'this', 'that', 'what'
];

// Domain keywords for categorization
var DOMAIN_KEYWORDS = {
    'web': ['website', 'web app', 'webapp', 'frontend', 'backend', 'fullstack', 'api', 'server'],
    'mobile': ['app', 'mobile app', 'android', 'ios', 'react native', 'flutter'],
    'data': ['data', 'analytics', 'machine learning', 'ml', 'ai', 'analysis', 'pipeline'],
    'infrastructure': ['infrastructure', 'devops', 'ci/cd', 'deployment', 'cloud', 'kubernetes', 'docker'],
    'research': ['research', 'study', 'investigation', 'paper', 'thesis', 'analysis'],
    'design': ['design', 'ui', 'ux', 'interface', 'mockup', 'prototype', 'figma'],
    'content': ['blog', 'article', 'documentation', 'docs', 'tutorial', 'guide', 'book'],
    'business': ['startup', 'saas', 'product', 'business', 'company', 'service', 'platform']
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
        var sanitized = safeTrim(text);
        if (sanitized.length > CONFIG.MAX_INPUT_LENGTH) {
            sanitized = sanitized.substring(0, CONFIG.MAX_INPUT_LENGTH);
        }
        // Remove null bytes and other control characters
        sanitized = sanitized.replace(/[\0\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        return sanitized;
    } catch (e) {
        return '';
    }
}

function normalizeJobTitle(rawTitle) {
    try {
        if (!isValidString(rawTitle)) return null;

        var clean = safeTrim(rawTitle);

        // Remove leading articles and possessives
        clean = clean.replace(/^(a|an|the|my|our|your|his|her|their|some)\s+/i, '');

        // Remove trailing punctuation
        clean = clean.replace(/[.,!?;:]+$/g, '');

        // Normalize multiple spaces
        clean = clean.replace(/\s+/g, ' ');
        clean = safeTrim(clean);

        // Validation
        if (clean.length < CONFIG.MIN_TITLE_LENGTH) return null;
        if (clean.length > CONFIG.MAX_TITLE_LENGTH) return null;

        // Check if it's just a vague title
        if (arrayContains(VAGUE_TITLES, clean)) return null;

        // Check if it's purely numeric or symbols
        if (/^[\d\s\-_.,;:!?]+$/.test(clean)) return null;

        return clean;
    } catch (e) {
        return null;
    }
}

function determineDomain(title) {
    try {
        if (!isValidString(title)) return null;

        var lowerTitle = safeLowerCase(title);

        for (var domain in DOMAIN_KEYWORDS) {
            if (DOMAIN_KEYWORDS.hasOwnProperty(domain)) {
                var keywords = DOMAIN_KEYWORDS[domain];
                for (var i = 0; i < keywords.length; i++) {
                    if (containsPhrase(lowerTitle, keywords[i])) {
                        return domain;
                    }
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

function getTriggerConfidence(rawText) {
    try {
        var lowerText = safeLowerCase(rawText);

        for (var category in JOB_TRIGGERS) {
            if (JOB_TRIGGERS.hasOwnProperty(category)) {
                var trigger = JOB_TRIGGERS[category];
                if (containsAny(lowerText, trigger.patterns)) {
                    return trigger.confidence;
                }
            }
        }

        return CONFIG.DEFAULT_CONFIDENCE;
    } catch (e) {
        return CONFIG.DEFAULT_CONFIDENCE;
    }
}

function determineStatus(rawText) {
    try {
        var lowerText = safeLowerCase(rawText);

        // Check for paused/blocked indicators
        if (containsAny(lowerText, ['paused', 'on hold', 'blocked', 'stuck', 'waiting'])) {
            return 'paused';
        }

        // Check for near completion indicators
        if (containsAny(lowerText, ['almost done', 'nearly finished', 'wrapping up', 'finalizing'])) {
            return 'completing';
        }

        // Default to active for ongoing work
        return 'active';
    } catch (e) {
        return 'active';
    }
}

/**
 * CRITICAL: Validates that this is a JOB, not skill/tool/identity/goal/event
 */
function isValidJob(raw, title) {
    try {
        if (!isValidString(raw)) return false;

        var lowerRaw = safeLowerCase(raw);
        var lowerTitle = safeLowerCase(title || '');

        // HARD NO: Identity statements (but allow "working at")
        var identityCheck = IDENTITY_INDICATORS.filter(function(ind) {
            return ind !== 'working at' && ind !== 'working for';
        });
        if (containsAny(lowerRaw, identityCheck)) {
            return false;
        }

        // HARD NO: Goal statements (future intent without current activity)
        if (containsAny(lowerRaw, GOAL_INDICATORS)) {
            return false;
        }

        // HARD NO: Completed work (past tense)
        if (containsAny(lowerRaw, COMPLETED_INDICATORS)) {
            return false;
        }

        // HARD NO: Single events (not ongoing)
        if (containsAny(lowerRaw, EVENT_INDICATORS)) {
            return false;
        }

        // HARD NO: Just a technical skill name
        // "working on React" -> likely tool usage (reject)
        // "working on a React app" -> job (accept)
        if (lowerTitle && arrayContains(TECHNICAL_SKILLS, lowerTitle)) {
            return false;
        }

        // MUST have a job trigger
        var hasTrigger = false;
        for (var category in JOB_TRIGGERS) {
            if (JOB_TRIGGERS.hasOwnProperty(category)) {
                if (containsAny(lowerRaw, JOB_TRIGGERS[category].patterns)) {
                    hasTrigger = true;
                    break;
                }
            }
        }

        if (!hasTrigger) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

// ==========================================
// 3. JOB EXTRACTION LOGIC
// ==========================================

function extractExplicitJobs(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                // "I am working on X", "We are building Y"
                match: '(i|i\'m|im|we|we\'re|were) (am|are|re)? (currently|actively|now|presently)? (working on|building|developing|creating|making|implementing|designing|architecting) .+',
                confidence: 0.96,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);

                        // Build regex from all trigger patterns
                        var allPatterns = [];
                        for (var category in JOB_TRIGGERS) {
                            if (JOB_TRIGGERS.hasOwnProperty(category)) {
                                allPatterns = allPatterns.concat(JOB_TRIGGERS[category].patterns);
                            }
                        }

                        var triggerRegex = new RegExp('\\b(' + allPatterns.join('|').replace(/\s+/g, '\\s+') + ')\\b', 'i');
                        var parts = text.split(triggerRegex);

                        if (parts.length < 3) return null;

                        var content = parts.slice(2).join('');

                        // Stop at conjunctions or punctuation
                        var candidate = content.split(/\b(and|but|however|although|while|because|since)\b|[.;]/)[0];

                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                // "studying for X exams", "preparing for Y"
                match: '(i|i\'m|im|we|we\'re|were) (am|are|re)? (currently|actively|now)? (studying for|preparing for|researching) .+',
                confidence: 0.95,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);

                        var triggerRegex = /\b(studying for|preparing for|researching)\b/i;
                        var parts = text.split(triggerRegex);

                        if (parts.length < 3) return null;

                        var content = parts.slice(2).join('');
                        var candidate = content.split(/\b(and|but|however|although|while|because|since)\b|[.;]/)[0];

                        var normalized = safeTrim(candidate);

                        // Add context for better title
                        if (parts[1]) {
                            var trigger = safeTrim(parts[1]);
                            if (trigger === 'studying for' || trigger === 'preparing for') {
                                normalized = normalized + ' preparation';
                            }
                        }

                        return normalized;
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                // "I'm working at X handling Y"
                match: '(i|i\'m|im|we|we\'re|were) .* (working at|working for) .+',
                confidence: 0.94,
                parse: function(m) {
                    try {
                        var text = safeGetText(m);

                        // Check if there's an activity verb
                        var activityRegex = /\b(handling|managing|building|developing|working on|doing|creating|maintaining)\s+(.+)/i;
                        var activityMatch = text.match(activityRegex);

                        if (activityMatch && activityMatch[2]) {
                            // Has activity - extract it
                            var activity = activityMatch[2].split(/\b(and|but|while)\b|[.;]/)[0];
                            activity = safeTrim(activity);

                            // Extract company/context
                            var contextRegex = /\b(working at|working for)\s+([a-zA-Z\s]+?)\s+(handling|managing|building|developing|working on|doing|creating|maintaining)/i;
                            var contextMatch = text.match(contextRegex);

                            if (contextMatch && contextMatch[2]) {
                                var context = safeTrim(contextMatch[2]);
                                return context + ' ' + activity;
                            }

                            return activity;
                        }

                        return null;
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                // "currently building X", "actively researching Y"
                match: '(currently|actively|now|presently) (working on|building|developing|studying|researching|creating|making) .+',
                confidence: 0.92,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(currently|actively|now|presently)');

                        var text = safeGetText(d);

                        // Remove trigger
                        for (var category in JOB_TRIGGERS) {
                            if (JOB_TRIGGERS.hasOwnProperty(category)) {
                                var patterns = JOB_TRIGGERS[category].patterns;
                                for (var i = 0; i < patterns.length; i++) {
                                    text = text.replace(new RegExp('\\b' + patterns[i] + '\\b', 'i'), '');
                                }
                            }
                        }

                        var candidate = text.split(/[.;]/)[0];
                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                // "maintaining the X system", "managing Y project"
                match: '(maintaining|managing|supporting|running|operating|handling) (the|a|an|my|our)? [#Noun+] .+',
                confidence: 0.85,
                parse: function(m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(maintaining|managing|supporting|running|operating|handling)');
                        d = safeRemove(d, '(the|a|an|my|our)');

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
                        var rawText = safeGetText(m);

                        var rawTitle = strat.parse(m);
                        if (!rawTitle) return;

                        // CRITICAL: Validate this is a job
                        if (!isValidJob(rawText, rawTitle)) {
                            return;
                        }

                        var normalizedTitle = normalizeJobTitle(rawTitle);
                        if (!normalizedTitle) return;

                        var confidence = strat.confidence || getTriggerConfidence(rawText);
                        var status = determineStatus(rawText);
                        var domain = determineDomain(normalizedTitle);

                        var jobItem = {
                            title: normalizedTitle,
                            status: status,
                            confidence: confidence,
                            domain: domain,
                            raw: rawText
                        };

                        results.push(jobItem);
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

function extractProjectMentions(doc) {
    var results = [];

    try {
        if (!doc) return results;

        // Pattern: "my project is X", "our startup called Y", "side project"
        var patterns = [
            {
                match: '(my|our) (project|startup|company|business|service|platform|product) (is|called|named)? [#Noun+]',
                confidence: 0.75
            },
            {
                match: 'for (my|our|the) [#Noun+] (project|startup|company|product)',
                confidence: 0.70
            },
            {
                match: '(side|personal) (project|startup|business)',
                confidence: 0.80
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

                        if (!isValidJob(rawText, '')) {
                            return;
                        }

                        // Extract project type and name
                        var text = safeLowerCase(rawText);
                        var projectTypes = ['project', 'startup', 'company', 'business', 'service', 'platform', 'product'];

                        var foundType = null;
                        for (var j = 0; j < projectTypes.length; j++) {
                            if (containsPhrase(text, projectTypes[j])) {
                                foundType = projectTypes[j];
                                break;
                            }
                        }

                        if (!foundType) return;

                        // Title is the project type plus context
                        var d = safeClone(m);
                        if (!d) return;

                        d = safeRemove(d, '(is|called|named)');

                        var title = safeGetText(d);
                        var normalizedTitle = normalizeJobTitle(title);

                        if (!normalizedTitle) return;

                        var domain = determineDomain(normalizedTitle);

                        results.push({
                            title: normalizedTitle,
                            status: 'active',
                            confidence: p.confidence,
                            domain: domain,
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

// ==========================================
// 4. MAIN EXTRACTION FUNCTION
// ==========================================

function extractJobs(text) {
    try {
        // Input validation
        if (!isValidString(text)) {
            return [];
        }

        var sanitized = sanitizeInput(text);
        if (!sanitized) return [];

        var doc;
        try {
            doc = nlp(sanitized);
        } catch (e) {
            return [];
        }

        if (!doc) return [];

        var explicitJobs = extractExplicitJobs(doc);
        var projectMentions = extractProjectMentions(doc);

        // Merge all results
        var all = [];

        if (Array.isArray(explicitJobs)) {
            all = all.concat(explicitJobs);
        }
        if (Array.isArray(projectMentions)) {
            all = all.concat(projectMentions);
        }

        // Deduplicate by normalized title
        var unique = [];
        var seen = {};

        for (var i = 0; i < all.length; i++) {
            var item = all[i];

            // Validate item structure - STRICT
            if (!item || typeof item !== 'object') continue;
            if (!item.title || !item.status) continue;
            if (!isValidString(item.title) || !isValidString(item.status)) continue;

            // Validate status
            var validStatuses = ['active', 'paused', 'completing'];
            var statusValid = false;
            for (var j = 0; j < validStatuses.length; j++) {
                if (item.status === validStatuses[j]) {
                    statusValid = true;
                    break;
                }
            }

            if (!statusValid) continue;

            // Validate confidence
            if (!isValidNumber(item.confidence)) continue;
            if (item.confidence < CONFIG.MIN_CONFIDENCE || item.confidence > CONFIG.MAX_CONFIDENCE) continue;

            var normalizedKey = safeLowerCase(item.title).replace(/\s+/g, '_');
            var key = normalizedKey.substring(0, 100); // Use first 100 chars as key

            if (!seen[key]) {
                seen[key] = true;

                var jobItem = {
                    title: item.title,
                    status: item.status,
                    confidence: item.confidence,
                    domain: item.domain || null,
                    raw: item.raw || ''
                };

                unique.push(jobItem);
            }
        }

        return unique;
    } catch (e) {
        // Catastrophic failure - return empty array
        // CRITICAL: Never throw, never return invalid structure
        return [];
    }
}

module.exports = { extractJobs: extractJobs };