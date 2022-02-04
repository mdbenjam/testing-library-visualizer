import { useState } from "react";
import { render, screen } from "@testing-library/react";
import Editor from "./Editor";
import userEvent from "@testing-library/user-event";
import { debugTest } from "react-testing-visualizer";
const EditorWrapper = (props) => {
  const [content, setContent] = useState("");

  return <Editor content={content} onContentChange={setContent} {...props} />;
};

test("can render errors in editor", async () => {
  render(
    <EditorWrapper
      content="hello world\ngoodbye"
      errors={[{ message: "This is an error", line: 1 }]}
    />
  );

  const errorSymbols = screen.queryAllByText("🛑");
  expect(errorSymbols[0]).toHaveStyle({ visibility: "hidden" });
  expect(errorSymbols[1]).toBeInTheDocument();
});

test("can render error tooltip in editor", async () => {
  const user = userEvent.setup();

  render(
    <EditorWrapper
      content="hello world\ngoodbye"
      errors={[{ message: "This is an error", line: 1 }]}
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
      errors={[{ message: "This is an error", line: 1 }]}
      commandHistory={["new", "old"]}
    />
  );

  await user.click(screen.getByRole("textbox"));
  await user.keyboard("[ControlLeft>][ArrowUp][/ControlLeft]");

  await expect(await screen.findByText(/new/)).toBeInTheDocument();
});
