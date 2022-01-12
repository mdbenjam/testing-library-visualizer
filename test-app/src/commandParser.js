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
  if (Array.isArray(node)) {
    highlightedNodes = node;
  } else {
    highlightedNodes = [node];
  }
  highlightedNodes.forEach((node) => node.classList.add(HIGHLIGHT_CLASS_NAME));
}

const IDENTIFIER_MAP = {
  screen,
  expect,
  fireEvent,
  userEvent,
  within,
  highlight,
};

function traverseTree(node) {
  if (node.type === "ExpressionStatement") {
    traverseTree(node.expression);
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
    const func = traverseTree(node.callee);
    return func(...node.arguments.map((arg) => traverseTree(arg)));
  }

  if (node.type === "MemberExpression") {
    const treeTraversal = traverseTree(node.object);
    const result = treeTraversal[node.property.name];
    if (result) {
      return result;
    } else {
      throw new TypeError(`"${node.property.name}" is not a valid property.`);
    }
  }
}

export function runCommand(string) {
  const parseTree = acorn.parse(string, { ecmaVersion: 2020 });
  try {
    if (parseTree.type !== "Program") {
      throw SyntaxError;
    }

    parseTree.body.forEach((statement) => {
      traverseTree(statement);
    });
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}
