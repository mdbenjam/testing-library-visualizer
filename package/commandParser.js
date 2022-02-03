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

export class Evaluator {
  constructor() {
    this.variables = {};
    this.traverseTree = this.traverseTree.bind(this);
  }

  async traverseTree(node) {
    if (node.type === "ExpressionStatement") {
      await this.traverseTree(node.expression);
    }

    if (node.type === "AwaitExpression") {
      return await this.traverseTree(node.argument);
    }

    if (node.type === "Literal") {
      return node.value;
    }

    if (node.type === "Identifier") {
      if (IDENTIFIER_MAP[node.name]) {
        return IDENTIFIER_MAP[node.name];
      } else if (this.variables[node.name]) {
        return this.variables[node.name];
      } else {
        throw new TypeError(`"${node.name}" is not valid`);
      }
    }

    if (node.type === "VariableDeclaration") {
      await Promise.all(
        node.declarations.map(
          async (declaration) => await this.traverseTree(declaration)
        )
      );
    }

    if (node.type === "VariableDeclarator") {
      this.variables[node.id.name] = await this.traverseTree(node.init);
    }

    if (node.type === "CallExpression") {
      const func = await this.traverseTree(node.callee);
      const args = await Promise.all(
        node.arguments.map(async (arg) => await this.traverseTree(arg))
      );
      const output = await func(...args);
      return output;
    }

    if (node.type === "MemberExpression") {
      const treeTraversal = await this.traverseTree(node.object);
      if (node.property.type === "Identifier") {
        const result = treeTraversal[node.property.name];
        if (result) {
          return result;
        } else {
          throw new TypeError(
            `"${node.property.name}" is not a valid property.`
          );
        }
      } else if (node.property.type === "Literal") {
        const result = treeTraversal[node.property.value];
        if (result) {
          return result;
        } else {
          throw new RangeError(
            `"${node.property.value}" is beyond the length of ${treeTraversal}.`
          );
        }
      } else {
        throw new SyntaxError(`"${node.property.type}" is not recognized.`);
      }
    }
  }
}

const removeUnicodeColor = (text) =>
  text.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );

export async function runCommand(
  string,
  consoleLogQueue = [],
  evaluator = new Evaluator()
) {
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
      await evaluator.traverseTree(statement);
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
          `Error printed to console.error. This error occurred asynchronously, and may have happened before this line was executed.\n\n${consoleLog.arguments[0]}`
        );
      }
    }

    return { ok: true, error: null, lineNumber: null };
  } catch (error) {
    return {
      ok: false,
      error: { ...error, message: removeUnicodeColor(error.message) },
      lineNumber,
    };
  }
}
