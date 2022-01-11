import { render, screen } from "@testing-library/react";

import { runCommand } from "./commandParser";
const util = require("util");
let acorn = require("acorn");

test("parses simple command", async () => {
  render(<>Hello World</>);

  runCommand('expect(screen.getByText("Hello World")).toBeInTheDocument();');
});

test("parses within command", async () => {
  render(
    <>
      <div data-testid="first-div">Hello</div>
      <div data-testid="second-div">World</div>
    </>
  );

  runCommand(
    'expect(within(screen.getByTestId("first-div")).getByText("Hello")).toBeInTheDocument();'
  );
  runCommand(
    'expect(within(screen.getByTestId("first-div")).queryByText("World")).toBeNull();'
  );
});

test("parses regex command", async () => {
  render(<>Hello World</>);

  runCommand("expect(screen.getByText(/Hello/)).toBeInTheDocument();");
});
