import { render } from "@testing-library/react";
import { consoleLogQueue } from "./testingUtil";
import { runCommand, availableCommands } from "./commandParser";
import { useState } from "react";

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
      <button onClick={() => setTimeout(() => setText("Goodbye"), 5)}>
        click me
      </button>
    </>
  );
}

test("reports warnings", async () => {
  render(<TestComponent />);

  expect(
    (
      await runCommand(
        "userEvent.click(screen.getByText('click me'))",
        consoleLogQueue
      )
    ).error.message
  ).toEqual(expect.stringMatching(/not wrapped in act/g));
});
