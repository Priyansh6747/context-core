"use strict";
const identity = require("./modules/identity");
const goals = require("./modules/goals");
const tools = require("./modules/tools");
const skills = require("./modules/skills");
const jobs = require("./modules/jobs");
let test = jobs.extractJobs("I’m working at a startup handling backend infrastructure and APIs.")
console.log(test)

function example() {
    return "ok";
}

module.exports = {
    example
};
