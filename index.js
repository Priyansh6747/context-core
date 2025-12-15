"use strict";
const identity = require("./modules/identity");
const goals = require("./modules/goals");
const tools = require("./modules/tools");
let test = tools.extractTools("This project depends on cloud storage and passkeys for secure authentication.")
console.log(test)

function example() {
    return "ok";
}

module.exports = {
    example
};
