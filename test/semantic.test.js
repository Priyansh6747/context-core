/**
 * Semantic Extraction Tests
 * Tests for all 18 test cases
 */

var contextCore = require('../index.js');

var testCases = [
    {
        id: 1,
        input: "I want to reset my Windows PC but I don't want to lose my Chrome passwords. My data is fully cloud backed.",
        expected: {
            goals: [{ description: "reset my windows pc", horizon: "short", status: "active" }],
            intents: [{ type: "ask", target: "backup_method" }],
            facts: [{ key: "data_storage", value: "cloud_backed" }],
            tools: [
                { type: "software", name: "windows", context: "in_use" },
                { type: "software", name: "google_chrome", context: "in_use" },
                { type: "service", name: "cloud_storage", context: "in_use" }
            ],
            warnings: [{ type: "data_loss_risk", related_to: "pc_reset" }]
        }
    },
    {
        id: 3,
        input: "I'm on a train and can't really work properly with just my Android phone.",
        expected: {
            events: [{ name: "travel", details: { mode: "train" } }],
            constraints: [
                { type: "limited_interaction", description: "on mobile during travel" }
            ],
            tools: [{ type: "platform", name: "android", context: "in_use" }]
        }
    },
    {
        id: 5,
        input: "I've worked with distributed systems before and now I'm building a PostgreSQL based analytics platform.",
        expected: {
            experiences: [{ description: "worked with distributed systems" }],
            jobs: [{ title: "postgresql based analytics platform", status: "active" }],
            tools: [{ type: "software", name: "postgresql", context: "in_use" }]
        }
    },
    {
        id: 6,
        input: "I'm building an ESP32 sensor project and want advice on which sensor to use.",
        expected: {
            jobs: [{ title: "esp32 sensor project", status: "active" }],
            intents: [{ type: "ask", target: "sensor_recommendation" }],
            tools: [{ type: "hardware", name: "esp32", context: "in_use" }]
        }
    },
    {
        id: 7,
        input: "After resetting my PC, all local files were wiped unexpectedly.",
        expected: {
            events: [{ name: "system_reset", details: { scope: "full" } }],
            results: [{ outcome: "local_files_deleted", source: "system_reset" }]
        }
    },
    {
        id: 8,
        input: "Call me sovereign. I'm stuck using only my phone right now.",
        expected: {
            identity: [{ type: "alias", value: "sovereign" }],
            constraints: [{ type: "device_limitation", description: "only mobile available" }],
            tools: [{ type: "hardware", name: "phone", context: "in_use" }]
        }
    },
    {
        id: 9,
        input: "I want to migrate my workflow to Linux, but right now I'm stuck using Windows on my laptop.",
        expected: {
            goals: [{ description: "migrate workflow to linux", horizon: "medium", status: "active" }],
            preferences: [{ key: "operating_system", value: "linux", polarity: "positive" }],
            constraints: [{ type: "environment_limitation", description: "currently restricted to windows laptop" }],
            tools: [{ type: "software", name: "windows", context: "in_use" }]
        }
    },
    {
        id: 10,
        input: "I'm a student currently working on my final year project and I've built similar systems before.",
        expected: {
            identity: [{ type: "role", value: "student" }],
            jobs: [{ title: "final year project", status: "active" }],
            experiences: [{ description: "built similar systems previously" }]
        }
    },
    {
        id: 11,
        input: "Can you help me check if resetting Windows will break my current development setup?",
        expected: {
            intents: [{ type: "ask", target: "system_reset_impact" }],
            warnings: [{ type: "system_breakage_risk", related_to: "windows_reset" }],
            tools: [{ type: "software", name: "windows", context: "in_use" }]
        }
    },
    {
        id: 12,
        input: "My internet went down today, so I prefer doing offline work until it's fixed.",
        expected: {
            events: [{ name: "internet_outage", temporal: { tense: "past", decay: "short" } }],
            constraints: [{ type: "connectivity_limitation", description: "no internet access" }],
            preferences: [{ key: "work_mode", value: "offline", polarity: "positive" }]
        }
    },
    {
        id: 13,
        input: "I want to learn Docker properly because I'm not confident managing containers yet.",
        expected: {
            goals: [{ description: "learn docker properly", horizon: "medium", status: "active" }],
            skills: [{ type: "technical", name: "docker", level: "basic" }]
        }
    },
    {
        id: 14,
        input: "I paused my side project after my laptop crashed and stopped booting yesterday.",
        expected: {
            events: [{ name: "system_failure", details: { device: "laptop" }, temporal: { tense: "past", decay: "medium" } }],
            jobs: [{ title: "side project", status: "paused" }],
            constraints: [{ type: "hardware_failure", description: "laptop not booting" }]
        }
    },
    {
        id: 15,
        input: "All my files are backed up, but I still worry about data loss during resets.",
        expected: {
            facts: [{ key: "data_backup_status", value: "complete" }],
            warnings: [{ type: "data_loss_risk", related_to: "system_reset" }]
        }
    },
    {
        id: 16,
        input: "I'm no longer a student and now I want to focus fully on backend engineering.",
        expected: {
            identity: [{ type: "role", value: "backend engineer" }],
            goals: [{ description: "focus on backend engineering", horizon: "long", status: "active" }]
        }
    },
    {
        id: 17,
        input: "After upgrading my system, I stopped using Expo Go entirely.",
        expected: {
            events: [{ name: "system_upgrade", temporal: { tense: "past", decay: "medium" } }],
            tools: [{ type: "software", name: "expo_go", context: "deprecated" }]
        }
    },
    {
        id: 18,
        input: "I want to clean my storage and set up a fresh dev environment, but I'm short on time.",
        expected: {
            goals: [
                { description: "clean storage", horizon: "short", status: "active" },
                { description: "set up fresh development environment", horizon: "short", status: "active" }
            ],
            constraints: [{ type: "time_limitation", description: "short on time" }]
        }
    }
];

function checkMatch(actual, expected, path) {
    var issues = [];

    if (expected === undefined) return issues;

    if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) {
            issues.push(path + ': expected array, got ' + typeof actual);
            return issues;
        }

        // Check if all expected items are found
        for (var i = 0; i < expected.length; i++) {
            var expItem = expected[i];
            var found = false;

            for (var j = 0; j < actual.length; j++) {
                var actItem = actual[j];
                var itemIssues = checkMatch(actItem, expItem, path + '[' + i + ']');
                if (itemIssues.length === 0) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                issues.push(path + '[' + i + ']: expected item not found: ' + JSON.stringify(expItem));
            }
        }
    } else if (typeof expected === 'object' && expected !== null) {
        if (typeof actual !== 'object' || actual === null) {
            issues.push(path + ': expected object, got ' + typeof actual);
            return issues;
        }

        for (var key in expected) {
            if (expected.hasOwnProperty(key)) {
                if (actual[key] === undefined) {
                    issues.push(path + '.' + key + ': missing key');
                } else {
                    var subIssues = checkMatch(actual[key], expected[key], path + '.' + key);
                    issues = issues.concat(subIssues);
                }
            }
        }
    } else {
        // Primitive value - check contains for strings
        if (typeof expected === 'string' && typeof actual === 'string') {
            if (actual.indexOf(expected) === -1 && expected.indexOf(actual) === -1) {
                // Allow partial matches
                var expWords = expected.split(/\s+/);
                var actWords = actual.split(/\s+/);
                var matchCount = 0;

                for (var w = 0; w < expWords.length; w++) {
                    if (actual.indexOf(expWords[w]) !== -1) matchCount++;
                }

                if (matchCount < expWords.length * 0.5) {
                    issues.push(path + ': expected "' + expected + '", got "' + actual + '"');
                }
            }
        } else if (actual !== expected) {
            issues.push(path + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
        }
    }

    return issues;
}

function runTests() {
    console.log('Running ' + testCases.length + ' test cases...\n');

    var passed = 0;
    var failed = 0;

    for (var t = 0; t < testCases.length; t++) {
        var testCase = testCases[t];
        console.log('Test ' + testCase.id + ': ' + testCase.input.substring(0, 60) + '...');

        try {
            var result = contextCore.extractContext(testCase.input);
            var allIssues = [];

            for (var category in testCase.expected) {
                if (testCase.expected.hasOwnProperty(category)) {
                    var issues = checkMatch(result[category], testCase.expected[category], category);
                    allIssues = allIssues.concat(issues);
                }
            }

            if (allIssues.length === 0) {
                console.log('  ✓ PASSED\n');
                passed++;
            } else {
                console.log('  ✗ FAILED');
                for (var i = 0; i < Math.min(allIssues.length, 5); i++) {
                    console.log('    - ' + allIssues[i]);
                }
                if (allIssues.length > 5) {
                    console.log('    ... and ' + (allIssues.length - 5) + ' more issues');
                }
                console.log('');
                failed++;
            }
        } catch (e) {
            console.log('  ✗ ERROR: ' + e.message + '\n');
            failed++;
        }
    }

    console.log('\n========================================');
    console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
    console.log('========================================');

    return failed === 0;
}

runTests();
