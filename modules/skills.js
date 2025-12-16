var nlp = require('compromise');

/**
 * Skills Extraction Module (v2.0 - Production Grade)
 * Extracts capabilities and competencies from text.
 * ES5 compatible with comprehensive error handling.
 */

// ==========================================
// 1. KNOWLEDGE BASES
// ==========================================

var TECHNICAL_SKILLS = [
    'docker', 'kubernetes', 'git', 'linux', 'python', 'javascript', 'typescript',
    'react', 'vue', 'angular', 'node', 'nodejs', 'rust', 'go', 'golang', 'java',
    'c++', 'cpp', 'c#', 'csharp', 'swift', 'kotlin', 'ruby', 'php', 'sql',
    'mongodb', 'postgresql', 'mysql', 'redis', 'aws', 'azure', 'gcp',
    'machine learning', 'ml', 'deep learning', 'ai', 'data science',
    'devops', 'cicd', 'ci/cd', 'terraform', 'ansible', 'jenkins',
    'containers', 'microservices', 'api', 'rest', 'graphql', 'grpc'
];

var SKILL_INDICATORS = {
    high: ['expert', 'proficient', 'advanced', 'skilled', 'experienced', 'master', 'fluent'],
    medium: ['familiar', 'comfortable', 'know', 'understand', 'can use', 'work with'],
    low: ['learning', 'beginner', 'basic', 'not confident', 'struggling', 'new to']
};

var NEGATION_INDICATORS = [
    'not confident', 'not comfortable', 'struggling with', 'not good at',
    'need to learn', 'want to learn', 'don\'t know', 'don\'t understand'
];

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

// ==========================================
// 3. DETECTION
// ==========================================

function detectSkillLevel(text, skillName) {
    try {
        var lowerText = safeLowerCase(text);

        // Check for negation first (Test 13: not confident)
        if (containsAny(lowerText, NEGATION_INDICATORS)) {
            return { level: 'basic', confidence: 0.6 };
        }

        // Check for high proficiency
        if (containsAny(lowerText, SKILL_INDICATORS.high)) {
            return { level: 'advanced', confidence: 0.95 };
        }

        // Check for medium proficiency
        if (containsAny(lowerText, SKILL_INDICATORS.medium)) {
            return { level: 'intermediate', confidence: 0.85 };
        }

        // Check for low proficiency
        if (containsAny(lowerText, SKILL_INDICATORS.low)) {
            return { level: 'basic', confidence: 0.75 };
        }

        // Default to intermediate
        return { level: 'intermediate', confidence: 0.80 };
    } catch (e) {
        return { level: 'intermediate', confidence: 0.5 };
    }
}

function isKnownSkill(name) {
    try {
        var lowerName = safeLowerCase(name);
        for (var i = 0; i < TECHNICAL_SKILLS.length; i++) {
            if (lowerName === safeLowerCase(TECHNICAL_SKILLS[i]) ||
                lowerName.indexOf(safeLowerCase(TECHNICAL_SKILLS[i])) !== -1) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

// ==========================================
// 4. EXTRACTION
// ==========================================

function extractSkillsFromText(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundSkills = {};

        // Check for learning/confidence patterns (Test 13: Docker)
        var learnMatch = text.match(/(?:want to learn|learn|learning)\s+(\w+)/i);
        if (learnMatch && learnMatch[1]) {
            var skillName = safeLowerCase(learnMatch[1]);
            if (isKnownSkill(skillName) && !foundSkills[skillName]) {
                foundSkills[skillName] = true;
                var levelInfo = detectSkillLevel(text, skillName);
                results.push({
                    type: 'technical',
                    name: skillName,
                    level: levelInfo.level,
                    confidence: levelInfo.confidence
                });
            }
        }

        // Check for "not confident with X" pattern
        var notConfidentMatch = text.match(/not confident\s+(?:with|managing|using)?\s*(\w+)/i);
        if (notConfidentMatch && notConfidentMatch[1]) {
            var skillName = safeLowerCase(notConfidentMatch[1]);
            if (isKnownSkill(skillName) && !foundSkills[skillName]) {
                foundSkills[skillName] = true;
                results.push({
                    type: 'technical',
                    name: skillName,
                    level: 'basic',
                    confidence: 0.6
                });
            }
        }

        // Scan for known technical skills in the text
        for (var i = 0; i < TECHNICAL_SKILLS.length; i++) {
            var skill = TECHNICAL_SKILLS[i];
            if (containsAny(lowerText, [skill]) && !foundSkills[skill]) {
                foundSkills[skill] = true;
                var levelInfo = detectSkillLevel(text, skill);
                results.push({
                    type: 'technical',
                    name: skill,
                    level: levelInfo.level,
                    confidence: levelInfo.confidence
                });
            }
        }
    } catch (e) { }

    return results;
}

// ==========================================
// 5. DEDUPLICATION
// ==========================================

function deduplicateSkills(skills) {
    var unique = [];
    var seen = {};

    try {
        for (var i = 0; i < skills.length; i++) {
            var item = skills[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type || !item.name) continue;

            var key = item.name;

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    name: item.name,
                    level: item.level || 'intermediate',
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

function extractSkills(text) {
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

        var skills = extractSkillsFromText(doc, text);

        return deduplicateSkills(skills);
    } catch (e) {
        return [];
    }
}

module.exports = { extractSkills: extractSkills };