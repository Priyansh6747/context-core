var nlp = require('compromise');

/**
 * Identity Extraction Module (v2.0 - Production Grade)
 * Extracts Roles, Names, Aliases, and Age.
 * ES5 compatible with comprehensive error handling.
 */

var ROLE_BLOCKLIST = [
    'bit', 'lot', 'little', 'fan', 'believer', 'skeptic', 'mess', 'hurry',
    'joke', 'mistake', 'while', 'second', 'moment', 'participant', 'student of life',
    'person', 'one', 'someone', 'nobody', 'everybody', 'thing', 'nothing'
];

var NOT_NAMES = [
    'here', 'there', 'now', 'later', 'soon', 'confidential', 'unknown',
    'hidden', 'secret', 'mine', 'yours', 'missing', 'changing', 'important',
    'available', 'busy', 'ready', 'happy', 'sad', 'hungry', 'thirsty', 'tired'
];

var TEMPORAL_WORDS = [
    'later', 'tomorrow', 'tonight', 'soon', 'yesterday', 'morning', 'evening',
    'afternoon', 'back', 'asap', 'now', 'today'
];

var KNOWN_ROLES = [
    'engineer', 'developer', 'designer', 'manager', 'analyst', 'architect',
    'student', 'teacher', 'professor', 'doctor', 'nurse', 'lawyer',
    'backend engineer', 'frontend engineer', 'fullstack engineer',
    'software engineer', 'data scientist', 'product manager',
    'devops engineer', 'sre', 'qa engineer', 'security engineer'
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

function validateName(rawText) {
    try {
        if (!isValidString(rawText)) return null;

        var clean = safeTrim(rawText);
        clean = clean.replace(/^['\"]|['\"]$/g, '');
        clean = clean.replace(/[.,!?;:]$/g, '');
        clean = safeTrim(clean);

        if (clean.length < 2) return null;
        if (clean.length > 100) return null;
        if (arrayContains(NOT_NAMES, clean)) return null;
        if (/^\d+$/.test(clean)) return null;
        if (/^[^a-zA-Z0-9]+$/.test(clean)) return null;
        if (arrayContains(TEMPORAL_WORDS, clean)) return null;

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

function safeHas(match, tag) {
    try {
        if (!match || typeof match.has !== 'function') return false;
        return match.has(tag);
    } catch (e) {
        return false;
    }
}

function extractNames(doc) {
    var results = [];

    try {
        if (!doc) return results;

        var strategies = [
            {
                match: '(my|his|her|the) (real|full|legal|first|last) name is .+',
                type: 'name',
                confidence: 0.95,
                parse: function (m) {
                    try {
                        var text = safeGetText(m);
                        if (!text) return null;

                        var parts = text.split(/name is/i);
                        if (parts.length < 2) return null;

                        var namePart = safeTrim(parts[1]);
                        if (!namePart) return null;

                        var candidate = namePart.split(/\b(and|but|which|who|that)\b|[.,;:]/)[0];
                        return safeTrim(candidate);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(my name is|i am|im) [#Noun+]',
                type: 'name',
                confidence: 0.95,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(my name is|i am|im)');

                        if (safeHas(d, '#Adjective') && !safeHas(d, '#TitleCase')) {
                            return null;
                        }

                        return safeGetText(d);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: '(go by|goes by|known as|alias is|nickname is|username is) (the)? (alias|handle|nickname|name)? [#Noun+]',
                type: 'alias',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, '(go by|goes by|known as|alias is|nickname is|username is)');
                        d = safeRemove(d, '(the|an|a)');
                        d = safeRemove(d, '(alias|handle|nickname|name)');

                        return safeGetText(d);
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: 'call me [#Noun+]',
                type: 'alias',
                confidence: 0.85,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, 'call me');

                        if (safeHas(d, '#Date') || safeHas(d, '#Time') || safeHas(d, '#Expression')) {
                            return null;
                        }

                        var text = safeGetText(d);
                        if (arrayContains(TEMPORAL_WORDS, text)) {
                            return null;
                        }

                        return text;
                    } catch (e) {
                        return null;
                    }
                }
            },
            {
                match: 'online (i|we|they)? (go by|use) [#Noun+]',
                type: 'alias',
                confidence: 0.90,
                parse: function (m) {
                    try {
                        var d = safeClone(m);
                        if (!d) return null;

                        d = safeRemove(d, 'online');
                        d = safeRemove(d, '(i|we|they)');
                        d = safeRemove(d, '(go by|use)');

                        var text = safeGetText(d);
                        var candidate = text.split(/\b(but|and|however)\b/)[0];
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
                        var rawName = strat.parse(m);
                        if (!rawName) return;

                        var validName = validateName(rawName);
                        if (validName) {
                            results.push({
                                type: strat.type,
                                value: validName,
                                confidence: strat.confidence
                            });
                        }
                    } catch (e) { }
                });
            } catch (e) {
                continue;
            }
        }

        // Regex fallback for "call me X" pattern when NLP doesn't recognize the word
        if (results.length === 0 || !results.some(function (r) { return r.type === 'alias'; })) {
            var callMeMatch = doc.all().text().match(/call me\s+(\w+)/i);
            if (callMeMatch && callMeMatch[1]) {
                var alias = safeTrim(callMeMatch[1]);
                if (!arrayContains(TEMPORAL_WORDS, alias) && alias.length >= 2 && alias.length <= 50) {
                    results.push({
                        type: 'alias',
                        value: alias,
                        confidence: 0.85
                    });
                }
            }
        }
    } catch (e) { }

    return results;
}

function extractAge(doc) {
    var results = [];

    try {
        if (!doc) return results;

        try {
            var explicitAge = doc.match('[#Value+] (years|yrs|yr|yo) (old)?');

            if (explicitAge) {
                explicitAge.forEach(function (m) {
                    try {
                        if (typeof m.numbers !== 'function') return;

                        var valArr = m.numbers().get();
                        if (!Array.isArray(valArr) || valArr.length === 0) return;

                        var val = valArr[0];
                        if (!isValidNumber(val)) return;

                        if (val > 0 && val < 120) {
                            results.push({
                                type: 'age',
                                value: val,
                                confidence: 0.95
                            });
                        }
                    } catch (e) { }
                });
            }
        } catch (e) { }

        if (results.length === 0) {
            try {
                var implicitAge = doc.match('(i am|im) [#Value+]').not('#Date');

                if (implicitAge) {
                    implicitAge.forEach(function (m) {
                        try {
                            if (typeof m.numbers !== 'function') return;

                            var valArr = m.numbers().get();
                            if (!Array.isArray(valArr) || valArr.length === 0) return;

                            var val = valArr[0];
                            if (!isValidNumber(val)) return;

                            if (val >= 1 && val < 120) {
                                results.push({
                                    type: 'age',
                                    value: val,
                                    confidence: 0.95
                                });
                            }
                        } catch (e) { }
                    });
                }
            } catch (e) { }
        }
    } catch (e) { }

    return results;
}

function extractRoles(doc, text) {
    var results = [];

    try {
        if (!doc) return results;

        var lowerText = safeLowerCase(text);
        var foundRoles = {};

        // Check for "now I want to focus on X" pattern (implies current role) - Test 16
        var focusMatch = text.match(/(?:now\s+)?(?:i\s+)?want to\s+focus\s+(?:fully\s+)?on\s+([^.]+)/i);
        if (focusMatch && focusMatch[1]) {
            var roleDesc = safeTrim(focusMatch[1]);
            roleDesc = roleDesc.split(/\b(and|but)\b/)[0];
            roleDesc = safeLowerCase(safeTrim(roleDesc));

            // Check if it matches a known role pattern
            if (containsAny(roleDesc, ['engineer', 'developer', 'engineering', 'development'])) {
                var roleValue = roleDesc;
                if (!foundRoles[roleValue]) {
                    foundRoles[roleValue] = true;
                    results.push({
                        type: 'role',
                        value: roleValue,
                        confidence: 0.90
                    });
                }
            }
        }

        // Check for "I'm a X" pattern (Test 10: I'm a student)
        var imAMatch = text.match(/(?:i'm|im|i am)\s+(?:a|an)\s+([^.,]+)/i);
        if (imAMatch && imAMatch[1]) {
            var role = safeLowerCase(safeTrim(imAMatch[1]));
            role = role.split(/\b(currently|who|and|but)\b/)[0];
            role = safeTrim(role);

            if (role.length > 2 && role.length < 50 && !arrayContains(ROLE_BLOCKLIST, role)) {
                if (!foundRoles[role]) {
                    foundRoles[role] = true;
                    results.push({
                        type: 'role',
                        value: role,
                        confidence: 0.95
                    });
                }
            }
        }

        var patterns = [
            { match: '(i|we) (am|was|are) (a|an)? [#Adjective? #Noun+]', conf: 0.95 },
            { match: '(as|speaking as) (a|an) [#Adjective? #Noun+]', conf: 0.85 },
            { match: '(i|we) work as (a|an)? [#Adjective? #Noun+]', conf: 0.90 }
        ];

        for (var i = 0; i < patterns.length; i++) {
            var p = patterns[i];

            try {
                var matches = doc.match(p.match);
                if (!matches) continue;

                matches.forEach(function (m) {
                    try {
                        var roleDoc = safeClone(m);
                        if (!roleDoc) return;

                        roleDoc = safeRemove(roleDoc, '(i|we)');
                        roleDoc = safeRemove(roleDoc, '(am|was|are)');
                        roleDoc = safeRemove(roleDoc, '(work|working|speaking) as');
                        roleDoc = safeRemove(roleDoc, '(a|an|the)');

                        if (typeof roleDoc.text !== 'function') return;

                        var role = safeTrim(roleDoc.text('normal'));
                        if (!role || role.length < 2 || role.length > 100) return;

                        if (arrayContains(ROLE_BLOCKLIST, role)) return;

                        var roleValue = safeLowerCase(role);
                        if (foundRoles[roleValue]) return;

                        foundRoles[roleValue] = true;
                        results.push({
                            type: 'role',
                            value: roleValue,
                            confidence: p.conf
                        });
                    } catch (e) { }
                });
            } catch (e) {
                continue;
            }
        }
    } catch (e) { }

    return results;
}

function extractIdentity(text) {
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

        var names = extractNames(doc);
        var ages = extractAge(doc);
        var roles = extractRoles(doc, text);

        var all = [];

        if (Array.isArray(names)) {
            all = all.concat(names);
        }
        if (Array.isArray(ages)) {
            all = all.concat(ages);
        }
        if (Array.isArray(roles)) {
            all = all.concat(roles);
        }

        // Deduplicate
        var unique = [];
        var seen = {};

        for (var i = 0; i < all.length; i++) {
            var item = all[i];

            if (!item || typeof item !== 'object') continue;
            if (!item.type || item.value === undefined) continue;

            var key = item.type + ':' + String(item.value).toLowerCase();

            if (!seen[key]) {
                seen[key] = true;
                unique.push({
                    type: item.type,
                    value: item.value,
                    confidence: isValidNumber(item.confidence) ? item.confidence : 0.5
                });
            }
        }

        return unique;
    } catch (e) {
        return [];
    }
}

module.exports = { extractIdentity: extractIdentity };