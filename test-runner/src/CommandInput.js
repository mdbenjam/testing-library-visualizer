import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import Editor, { useEditor } from "./Editor";

const HISTORY_KEY = "HISTORY";

function CommandInput({ setInnerHTML, availableCommands }) {
  // const readOnlyEditorProps = useEditor();
  // const editorProps = useEditor();
  // const { codeMirrorRef, codeHistory, appendToHistory, setText } = editorProps;
  const [commandHistory, setCommandHistory] = useState([]);
  const [readOnlyEditor, setReadOnlyEditor] = useState({
    content: "",
    errors: [],
  });
  const [editorValue, setEditorValue] = useState("");

  // useEffect(() => {
  //   const existingHistory = window.localStorage.setItem(
  //     HISTORY_KEY,
  //     commandHistory
  //   );
  // }, [commandHistory]);

  const submit = useCallback(() => {
    axios.post("/command", { command: editorValue }).then((response) => {
      setInnerHTML(response.data.html);
      setCommandHistory([
        ...commandHistory,
        {
          command: editorValue,
          error: response.data.error,
        },
      ]);
      setReadOnlyEditor({
        content: readOnlyEditor.content + editorValue + "\n",
        errors: response.data.error
          ? [
              ...readOnlyEditor.errors,
              {
                line:
                  response.data.lineNumber +
                  readOnlyEditor.content.split("\n").length,
                error: response.data.error,
              },
            ]
          : [...readOnlyEditor.errors],
      });
      setEditorValue("");
    });
  }, [
    commandHistory,
    setCommandHistory,
    setInnerHTML,
    editorValue,
    readOnlyEditor,
  ]);
  // const errors = useMemo(
  //   () =>
  //     commandHistory.reduce(
  //       (acc, history) => {
  //         acc.line += 1;
  //         if (history.error) {
  //           acc.errors.push({ message: history.error, line: acc.line });
  //         }
  //         return acc;
  //       },
  //       { line: 0, errors: [] }
  //     ).errors,
  //   [commandHistory]
  // );
  console.log(readOnlyEditor);
  return (
    <>
      <Editor
        content={readOnlyEditor.content}
        availableCommands={availableCommands}
        errors={readOnlyEditor.errors}
        readonly
      />
      <Editor
        content={editorValue}
        onContentChange={setEditorValue}
        availableCommands={availableCommands}
        submit={submit}
        commandHistory={commandHistory}
      />
      <button onClick={submit}>Submit</button>
    </>
  );
}

export default CommandInput;
