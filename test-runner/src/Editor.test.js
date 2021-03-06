import { useState } from "react";
import { render, screen } from "@testing-library/react";
import Editor from "./Editor";
import userEvent from "@testing-library/user-event";

const EditorWrapper = (props) => {
  const [content, setContent] = useState("");

  return <Editor content={content} onContentChange={setContent} {...props} />;
};

test("can render errors in editor", async () => {
  render(
    <EditorWrapper
      content="hello world\ngoodbye"
      consoleOutputs={[
        { message: "This is an error", lineNumber: 1, type: "error" },
      ]}
    />
  );

  const errorSymbols = screen.queryAllByText("🔴");
  expect(errorSymbols[0]).toHaveStyle({ visibility: "hidden" });
  expect(errorSymbols[1]).toBeInTheDocument();
});

test("can render error tooltip in editor", async () => {
  const user = userEvent.setup();

  render(
    <EditorWrapper
      content="hello world\ngoodbye"
      consoleOutputs={[
        { message: "This is an error", lineNumber: 1, type: "error" },
      ]}
    />
  );
  await user.hover(await screen.findByText(/hello/));
  expect(await screen.findByText(/This is an error/)).toBeInTheDocument();
});

test("command history is reset when changed", async () => {
  const user = userEvent.setup();

  const { rerender } = render(<EditorWrapper commandHistory={["old"]} />);

  await user.click(screen.getByRole("textbox"));
  await user.keyboard("[ControlLeft>][ArrowUp][/ControlLeft]");

  await expect(await screen.findByText(/old/)).toBeInTheDocument();

  rerender(
    <EditorWrapper
      consoleOutputs={[
        { message: "This is an error", lineNumber: 1, type: "error" },
      ]}
      commandHistory={["new", "old"]}
    />
  );

  await user.click(screen.getByRole("textbox"));
  await user.keyboard("[ControlLeft>][ArrowUp][/ControlLeft]");

  await expect(await screen.findByText(/new/)).toBeInTheDocument();
});

test("can render console logs in editor", async () => {
  render(
    <EditorWrapper
      content="hello"
      consoleOutputs={[
        { message: "This is a log", lineNumber: 1, type: "log" },
      ]}
    />
  );

  expect(screen.getByText("⚠️")).toBeInTheDocument();
  // eslint-disable-next-line testing-library/no-node-access
  expect(screen.getByText("hello").parentNode).toHaveClass(
    "cm-underline-warning"
  );
});
