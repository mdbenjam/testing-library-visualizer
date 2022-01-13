import { render, screen } from "@testing-library/react";

import { runCommand } from "./commandParser";
const util = require("util");
let acorn = require("acorn");

test("parses simple command", async () => {
  render(<>Hello World</>);

  expect(
    runCommand('expect(screen.getByText("Hello World")).toBeInTheDocument();')
      .error
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
    runCommand(
      'expect(within(screen.getByTestId("first-div")).getByText("Hello")).toBeInTheDocument();'
    ).error
  ).toBeNull();
  expect(
    runCommand(
      'expect(within(screen.getByTestId("first-div")).queryByText("World")).toBeNull();'
    ).error
  ).toBeNull();
});

test("parses regex command", async () => {
  render(<>Hello World</>);

  expect(
    runCommand("expect(screen.getByText(/Hello/)).toBeInTheDocument();").error
  ).toBeNull();
});

test("parses await command", async () => {
  render(<>Hello World</>);
  setTimeout(() => {
    render(<>Goodbye</>);
  }, 100);
  expect(
    await runCommand(
      "expect(await screen.findByText(/Hello/)).toBeInTheDocument();"
    ).error
  ).toBeNull();
});
