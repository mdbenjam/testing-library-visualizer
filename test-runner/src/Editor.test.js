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
