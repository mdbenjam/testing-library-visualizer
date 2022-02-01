import { expect } from "@jest/globals";
import { screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const util = require("util");

let acorn = require("acorn");

const HIGHLIGHT_CLASS_NAME = "react-test-highlight-element";
var highlightedNodes = [];

function highlight(node) {
  highlightedNodes.forEach((node) =>
    node.classList.remove(HIGHLIGHT_CLASS_NAME)
  );
  if (!node) {
    throw ReferenceError("Cannot not highlight undefined element");
  }
  if (Array.isArray(node)) {
    highlightedNodes = node;
  } else {
    highlightedNodes = [node];
  }
  highlightedNodes.forEach((node) => node.classList.add(HIGHLIGHT_CLASS_NAME));
}

function refresh() {
  // This is a no op just to refresh the page
}

let IDENTIFIER_MAP = {
  screen,
  expect,
  fireEvent,
  userEvent,
  within,
  highlight,
  refresh,
};
export const registerCommands = (commands) => {
  IDENTIFIER_MAP = { ...IDENTIFIER_MAP, ...commands };
};

export const availableCommands = () => {
  return Object.entries(IDENTIFIER_MAP).reduce((newObject, [key, value]) => {
    newObject[key] = Object.getOwnPropertyNames(value);

    return newObject;
  }, {});
};

async function traverseTree(node) {
  if (node.type === "ExpressionStatement") {
    await traverseTree(node.expression);
  }

  if (node.type === "AwaitExpression") {
    return await traverseTree(node.argument);
  }

  if (node.type === "Literal") {
    return node.value;
  }

  if (node.type === "Identifier") {
    if (IDENTIFIER_MAP[node.name]) {
      return IDENTIFIER_MAP[node.name];
    } else {
      throw new TypeError(`"${node.name}" is not valid`);
    }
  }

  if (node.type === "CallExpression") {
    const func = await traverseTree(node.callee);
    const args = await Promise.all(
      node.arguments.map(async (arg) => await traverseTree(arg))
    );
    const output = await func(...args);
    return output;
  }

  if (node.type === "MemberExpression") {
    const treeTraversal = await traverseTree(node.object);
    const result = treeTraversal[node.property.name];

    if (result) {
      return result;
    } else {
      throw new TypeError(`"${node.property.name}" is not a valid property.`);
    }
  }
}

export async function runCommand(string, consoleLogQueue = []) {
  const parseTree = acorn.parse(string, {
    ecmaVersion: 2020,
    allowAwaitOutsideFunction: true,
  });

  var lineNumber = 0;

  try {
    if (parseTree.type !== "Program") {
      throw SyntaxError;
    }

    for (const statement of parseTree.body) {
      await traverseTree(statement);
      lineNumber += 1;
    }
    lineNumber -= 1;

    function delay(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }

    await delay(10);

    for (const consoleLog of consoleLogQueue) {
      if (consoleLog.method === "error" && !consoleLog.seen) {
        consoleLog.seen = true;
        throw Error(
          `Error printed to console.error. This error occured asynchronously, and may have happened before this line was executed.\n\n${consoleLog.arguments[0]}`
        );
      }
    }

    return { ok: true, error: null, lineNumber: null };
  } catch (error) {
    return { ok: false, error, lineNumber };
  }
}
