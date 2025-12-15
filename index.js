"use strict";
const identity = require("./modules/identity");

let test = identity.extractIdentity("Online I go by the alias sovereign but my real name is Priyansh.and i am 22 years");
console.log(test)

function example() {
    return "ok";
}

module.exports = {
    example
};
