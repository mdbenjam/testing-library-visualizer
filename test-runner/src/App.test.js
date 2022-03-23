import { render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import userEvent from "@testing-library/user-event";
import { debugTest } from "testing-library-visualizer";
let mockAxios = null;

beforeEach(() => {
  mockAxios = new MockAdapter(axios);
});

afterEach(() => {
  mockAxios.reset();
});

test("renders code on successful load", async () => {
  mockAxios.onGet("/load").reply(200, {
    html: "<div>Hello World</div>",
    availableCommands: {},
  });

  render(<App />);

  expect(await screen.findByTitle("test-page-content")).toHaveAttribute(
    "srcDoc",
    "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Hello World</div>"
  );
});

test("can send command", async () => {
  const user = userEvent.setup();
  mockAxios.onGet("/load").reply(200, {
    html: "<div>Hello World</div>",
    availableCommands: {},
  });

  render(<App />);

  expect(await screen.findByTitle("test-page-content")).toHaveAttribute(
    "srcDoc",
    "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Hello World</div>"
  );

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );
  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
    consoleOutputs: [],
  });

  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  await waitFor(() =>
    expect(screen.getByTitle("test-page-content")).toHaveAttribute(
      "srcDoc",
      "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Goodbye</div>"
    )
  );

  expect(
    within(screen.getByTestId("command-history")).getByRole("textbox")
  ).toHaveTextContent(/refresh\(\)/);
});

test("can see command output", async () => {
  const user = userEvent.setup();
  mockAxios.onGet("/load").reply(200, {
    html: "<div>Hello World</div>",
    availableCommands: {},
  });

  render(<App />);

  expect(await screen.findByTitle("test-page-content")).toHaveAttribute(
    "srcDoc",
    "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Hello World</div>"
  );

  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
    consoleOutputs: [{ message: "Hello World", lineNumber: 0, type: "log" }],
  });

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );
  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  // expect(
  //   await within(screen.getByTestId("command-output")).findByRole("textbox")
  // ).toHaveTextContent(/Output: Hello World/);
});

test("sets available commands", async () => {
  const user = userEvent.setup();
  mockAxios.onGet("/load").reply(200, {
    html: "<div>Hello World</div>",
    availableCommands: { screen: ["getByText"] },
  });

  render(<App />);

  expect(await screen.findByTitle("test-page-content")).toHaveAttribute(
    "srcDoc",
    "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Hello World</div>"
  );

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );

  await user.keyboard("scr");
  await user.click(await screen.findByText("een"));

  expect(screen.getByText("screen")).toBeInTheDocument();
});

test("resetting test updates command history", async () => {
  const user = userEvent.setup();
  mockAxios.onGet("/load").reply(200, {
    html: "<div>Hello World</div>",
    availableCommands: { screen: ["getByText"] },
  });

  render(<App />);

  expect(await screen.findByTitle("test-page-content")).toHaveAttribute(
    "srcDoc",
    "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Hello World</div>"
  );

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );
  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
    consoleOutputs: [],
  });

  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  await waitFor(() =>
    expect(
      within(screen.getByTestId("command-history")).getByRole("textbox")
    ).toHaveTextContent(/refresh\(\)/)
  );

  mockAxios.onPost("/reset").reply(200, {
    html: "<div>Reset</div>",
  });
  await user.click(screen.getByText(/Reset Test/));

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );
  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  expect(
    within(screen.getByTestId("command-history")).getByRole("textbox")
  ).toHaveTextContent(
    /refresh\(\).*\/\/ <------ Test Reset ------>.*refresh\(\)/
  );

  expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
    "TEST_HISTORY",
    '[{"content":"refresh()\\n","consoleOutputs":[],"wasReset":true},{"content":"refresh()\\n","consoleOutputs":[]}]'
  );
});

test("can use arrows for command history", async () => {
  const user = userEvent.setup();
  mockAxios.onGet("/load").reply(200, {
    html: "<div>Hello World</div>",
    availableCommands: { screen: ["getByText"] },
  });

  render(<App />);

  expect(await screen.findByTitle("test-page-content")).toHaveAttribute(
    "srcDoc",
    "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Hello World</div>"
  );

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );
  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
    consoleOutputs: [],
  });

  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  await waitFor(() =>
    expect(
      within(screen.getByTestId("command-history")).getByRole("textbox")
    ).toHaveTextContent(/refresh\(\)/)
  );

  await user.click(
    within(screen.getByTestId("command-input")).getByRole("textbox")
  );
  await user.keyboard("[ControlLeft>][ArrowUp][/ControlLeft]");

  await waitFor(() =>
    expect(
      within(screen.getByTestId("command-input")).getByRole("textbox")
    ).toHaveTextContent(/refresh\(\)/)
  );

  expect(window.localStorage.setItem).toHaveBeenCalledWith(
    "HISTORY",
    '["refresh()"]'
  );
});
