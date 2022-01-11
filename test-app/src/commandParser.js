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
    return IDENTIFIER_MAP[node.name];
  }

  if (node.type === "CallExpression") {
    const func = traverseTree(node.callee);

    return func(...node.arguments.map((arg) => traverseTree(arg)));
  }

  if (node.type === "MemberExpression") {
    return traverseTree(node.object)[node.property.name];
  }
}

export function runCommand(string) {
  const parseTree = acorn.parse(string, { ecmaVersion: 2020 });

  if (parseTree.type !== "Program") {
    throw SyntaxError;
  }

  parseTree.body.forEach((statement) => {
    traverseTree(statement);
  });
}
