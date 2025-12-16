"use strict";

/**
 * context-core - Semantic Extraction Library
 *
 * Extracts structured information from unstructured text.
 * Pure, stateless, deterministic semantic compiler.
 */
const identity = require("./modules/identity");
const goals = require("./modules/goals");
const events = require("./modules/events");
const tools = require("./modules/tools");
const skills = require("./modules/skills");
const jobs = require("./modules/jobs");
const preferences = require("./modules/preferences");
const experiences = require("./modules/experiences");
const facts = require("./modules/facts");
const results = require("./modules/results");
const intents = require("./modules/intents");
const constraints = require("./modules/constraints");
const warnings = require("./modules/warnings");

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function isValidString(val) {
    return typeof val === 'string' && val.length > 0;
}

function safeArray(val) {
    return Array.isArray(val) ? val : [];
}

// ==========================================
// META GENERATION
// ==========================================

function generateMeta(source) {
    return {
        source: source || 'text',
        parser_version: '0.1.0',
        timestamp: new Date().toISOString()
    };
}

// ==========================================
// MAIN EXTRACTION FUNCTION
// ==========================================

/**
 * Extract structured context from unstructured text.
 * 
 * @param {string} text - Input text to extract information from
 * @param {object} options - Optional configuration
 * @param {string} options.source - Source identifier for meta
 * @returns {object} Structured extraction result with all modules
 */
function extractContext(text, options) {
    try {
        // Input validation
        if (!isValidString(text)) {
            return {
                identity: [],
                goals: [],
                events: [],
                tools: [],
                skills: [],
                jobs: [],
                preferences: [],
                experiences: [],
                facts: [],
                results: [],
                intents: [],
                constraints: [],
                warnings: [],
                meta: generateMeta(options && options.source)
            };
        }

        // Truncate very long inputs
        if (text.length > 50000) {
            text = text.substring(0, 50000);
        }

        var opts = options || {};

        // Extract from all modules
        var extractedIdentity = safeArray(identity.extractIdentity(text));
        var extractedGoals = safeArray(goals.extractGoals(text));
        var extractedEvents = safeArray(events.extractEvents(text));
        var extractedTools = safeArray(tools.extractTools(text));
        var extractedSkills = safeArray(skills.extractSkills(text));
        var extractedJobs = safeArray(jobs.extractJobs(text));
        var extractedPreferences = safeArray(preferences.extractPreferences(text));
        var extractedExperiences = safeArray(experiences.extractExperiences(text));
        var extractedFacts = safeArray(facts.extractFacts(text));
        var extractedResults = safeArray(results.extractResults(text));
        var extractedIntents = safeArray(intents.extractIntents(text));
        var extractedConstraints = safeArray(constraints.extractConstraints(text));
        var extractedWarnings = safeArray(warnings.extractWarnings(text));

        return {
            identity: extractedIdentity,
            goals: extractedGoals,
            events: extractedEvents,
            tools: extractedTools,
            skills: extractedSkills,
            jobs: extractedJobs,
            preferences: extractedPreferences,
            experiences: extractedExperiences,
            facts: extractedFacts,
            results: extractedResults,
            intents: extractedIntents,
            constraints: extractedConstraints,
            warnings: extractedWarnings,
            meta: generateMeta(opts.source)
        };
    } catch (e) {
        // Catastrophic failure - return empty structure
        return {
            identity: [],
            goals: [],
            events: [],
            tools: [],
            skills: [],
            jobs: [],
            preferences: [],
            experiences: [],
            facts: [],
            results: [],
            intents: [],
            constraints: [],
            warnings: [],
            meta: generateMeta(options && options.source)
        };
    }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    // Main unified function
    extractContext: extractContext,

    // Individual extractors for targeted use
    extractIdentity: identity.extractIdentity,
    extractGoals: goals.extractGoals,
    extractEvents: events.extractEvents,
    extractTools: tools.extractTools,
    extractSkills: skills.extractSkills,
    extractJobs: jobs.extractJobs,
    extractPreferences: preferences.extractPreferences,
    extractExperiences: experiences.extractExperiences,
    extractFacts: facts.extractFacts,
    extractResults: results.extractResults,
    extractIntents: intents.extractIntents,
    extractConstraints: constraints.extractConstraints,
    extractWarnings: warnings.extractWarnings
};