import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import Editor, { useEditor } from "./Editor";

const HISTORY_KEY = "HISTORY";
const TEST_HISTORY_KEY = "TEST_HISTORY";

function CommandInput({ setInnerHTML, availableCommands }) {
  const [commandHistory, setCommandHistory] = useState(() =>
    window.localStorage.getItem(HISTORY_KEY)
      ? JSON.parse(window.localStorage.getItem(HISTORY_KEY))
      : []
  );
  const [readOnlyEditor, setReadOnlyEditor] = useState(() => {
    return window.localStorage.getItem(TEST_HISTORY_KEY)
      ? JSON.parse(window.localStorage.getItem(TEST_HISTORY_KEY))
      : {
          content: "",
          errors: [],
        };
  });
  const [editorValue, setEditorValue] = useState("");
  console.log(readOnlyEditor.content, readOnlyEditor.errors);
  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(commandHistory));
  }, [commandHistory]);

  useEffect(() => {
    window.localStorage.setItem(
      TEST_HISTORY_KEY,
      JSON.stringify(readOnlyEditor)
    );
  }, [readOnlyEditor]);

  const submit = useCallback(() => {
    axios.post("/command", { command: editorValue }).then((response) => {
      setInnerHTML(response.data.html);
      setCommandHistory([editorValue, ...commandHistory]);
      setReadOnlyEditor({
        content: readOnlyEditor.content + editorValue + "\n",
        errors: response.data.error
          ? [
              ...readOnlyEditor.errors,
              {
                line:
                  response.data.error.lineNumber +
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

  const resetTest = useCallback(() => {
    axios.post("/reset").then((response) => {
      setInnerHTML(response.data.html);
      setReadOnlyEditor(
        {
          content: "",
          errors: [],
        },
        ...readOnlyEditor
      );
    });
  }, [setInnerHTML, setReadOnlyEditor, readOnlyEditor]);

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
      <button onClick={resetTest}>Reset Test</button>
    </>
  );
}

export default CommandInput;
