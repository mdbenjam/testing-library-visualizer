import React from "react";
import { render } from "@testing-library/react";
import { consoleLogQueue, debuggerSetup } from "./testingUtil.js";
import {
  runCommand,
  availableCommands,
  registerCommands,
} from "./commandParser.js";
import { useState } from "react";
import { expect } from "@jest/globals";
import { screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

beforeAll(() => {
  registerCommands({ screen, within, fireEvent, userEvent, expect });
});

test("parses simple command", async () => {
  render(<>Hello World</>);

  expect(
    (
      await runCommand(
        'expect(screen.getByText("Hello World")).toBeInTheDocument();'
      )
    ).error
  ).toBeNull();
});

test("parses within command", async () => {
  render(
    <>
      <div data-testid="first-div">Hello</div>
      <div data-testid="second-div">World</div>
    </>
  );

  expect(
    (
      await runCommand(
        'expect(within(screen.getByTestId("first-div")).getByText("Hello")).toBeInTheDocument();'
      )
    ).error
  ).toBeNull();
  expect(
    (
      await runCommand(
        'expect(within(screen.getByTestId("first-div")).queryByText("World")).toBeNull();'
      )
    ).error
  ).toBeNull();
});

test("parses regex command", async () => {
  render(<>Hello World</>);

  expect(
    (await runCommand("expect(screen.getByText(/Hello/)).toBeInTheDocument();"))
      .error
  ).toBeNull();
});

test("parses await command", async () => {
  render(<>Hello World</>);
  setTimeout(() => {
    render(<>Goodbye</>);
  }, 200);
  expect(
    (
      await runCommand(
        "expect(await screen.findByText(/Goodbye/)).toBeInTheDocument();"
      )
    ).error
  ).toBeNull();
});

test("availableCommands yields all commands", async () => {
  expect(availableCommands().screen).toEqual(
    expect.arrayContaining(["getByText"])
  );
});

function TestComponent() {
  const [text, setText] = useState("Hello World");

  return (
    <>
      {text}
      <button onClick={() => setTimeout(() => setText("Goodbye"), 0)}>
        click me
      </button>
    </>
  );
}

test("reports warnings", async () => {
  await debuggerSetup(async () => {
    render(<TestComponent />);
    const output = (
      await runCommand(
        "userEvent.click(screen.getByText('click me'))",
        consoleLogQueue
      )
    ).consoleOutputs[0];
    expect(output.message).toEqual(
      expect.stringMatching(/not wrapped in act/g)
    );
    expect(output.type).toEqual("error");
  });
});

test("reports console logs", async () => {
  await debuggerSetup(async () => {
    render(<TestComponent />);

    const output = (
      await runCommand("console.log('hello world')", consoleLogQueue)
    ).consoleOutputs[0];
    expect(output.message).toEqual(expect.stringMatching(/hello world/g));
    expect(output.type).toEqual("log");
  });
});

test("can set variables", async () => {
  render(<>Hello World</>);

  expect(
    (
      await runCommand(`
    const element = screen.getByText(/Hello/);
    expect(element).toBeInTheDocument();`)
    ).error
  ).toBeNull();
});

test("can access arrays", async () => {
  render(<>Hello World</>);

  expect(
    (
      await runCommand(`
    const element = screen.getAllByText(/Hello/)[0];
    expect(element).toBeInTheDocument();`)
    ).error
  ).toBeNull();
});
