import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import userEvent from "@testing-library/user-event";
import { debugTest } from "react-testing-visualizer";

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

  await user.click(screen.getAllByRole("textbox")[1]);
  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
  });

  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  await waitFor(() =>
    expect(screen.getByTitle("test-page-content")).toHaveAttribute(
      "srcDoc",
      "<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style><div>Goodbye</div>"
    )
  );

  expect(screen.getAllByRole("textbox")[0]).toHaveTextContent(/refresh\(\)/);
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

  await user.click(screen.getAllByRole("textbox")[1]);

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

  await user.click(screen.getAllByRole("textbox")[1]);
  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
  });

  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  await waitFor(() =>
    expect(screen.getAllByRole("textbox")[0]).toHaveTextContent(/refresh\(\)/)
  );

  mockAxios.onPost("/reset").reply(200, {
    html: "<div>Reset</div>",
  });
  await user.click(screen.getByText(/Reset Test/));

  await user.click(screen.getAllByRole("textbox")[1]);
  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  expect(screen.getAllByRole("textbox")[0]).toHaveTextContent(
    /refresh\(\).*\/\/ <------ Test Reset ------>.*refresh\(\)/
  );

  expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
    "TEST_HISTORY",
    '[{"content":"refresh()\\n","errors":[],"wasReset":true},{"content":"refresh()\\n","errors":[]}]'
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

  await user.click(screen.getAllByRole("textbox")[1]);
  mockAxios.onPost("/command", { command: "refresh()" }).reply(200, {
    html: "<div>Goodbye</div>",
  });

  await user.keyboard("refresh()");
  await user.click(screen.getByText("Submit"));

  await waitFor(() =>
    expect(screen.getAllByRole("textbox")[0]).toHaveTextContent(/refresh\(\)/)
  );

  await user.click(screen.getAllByRole("textbox")[1]);
  await user.keyboard("[ControlLeft>][ArrowUp][/ControlLeft]");

  await waitFor(() =>
    expect(screen.getAllByRole("textbox")[1]).toHaveTextContent(/refresh\(\)/)
  );

  expect(window.localStorage.setItem).toHaveBeenCalledWith(
    "HISTORY",
    '["refresh()"]'
  );
});
