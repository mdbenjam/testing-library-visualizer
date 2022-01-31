import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import Editor from "./Editor";

const HISTORY_KEY = "HISTORY";
const TEST_HISTORY_KEY = "TEST_HISTORY";

function CommandInput({ setInnerHTML, availableCommands }) {
  const [commandHistory, setCommandHistory] = useState(() =>
    window.localStorage.getItem(HISTORY_KEY)
      ? JSON.parse(window.localStorage.getItem(HISTORY_KEY))
      : []
  );
  const [readOnlyEditor, setReadOnlyEditor] = useState(() => {
    const existingHistory = window.localStorage.getItem(TEST_HISTORY_KEY)
      ? JSON.parse(window.localStorage.getItem(TEST_HISTORY_KEY))
      : [];
    return [
      ...existingHistory,
      {
        content: "",
        errors: [],
        wasReset: false,
      },
    ];
  });
  const [editorValue, setEditorValue] = useState("");

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
      setReadOnlyEditor(
        readOnlyEditor.map((editor, index) => {
          if (index === readOnlyEditor.length - 1) {
            return {
              content: editor.content + editorValue + "\n",
              errors: response.data.error
                ? [
                    ...editor.errors,
                    {
                      line:
                        response.data.error.lineNumber +
                        editor.content.split("\n").length,
                      message: response.data.error,
                    },
                  ]
                : [...editor.errors],
            };
          } else {
            return { ...editor };
          }
        })
      );
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
      setReadOnlyEditor([
        ...readOnlyEditor,
        {
          content: "",
          errors: [],
          wasReset: true,
        },
      ]);
    });
  }, [setInnerHTML, setReadOnlyEditor, readOnlyEditor]);

  const existingContent = useMemo(() => {
    return readOnlyEditor.reduce(
      (acc, editor, index) => {
        const currentLine = acc.content.split("\n").length - 1;

        if (index < readOnlyEditor.length - 1) {
          acc.content =
            acc.content +
            `${editor.content}\n// <------ ${
              editor.wasReset ? "Browser Refreshed" : "Test Reset"
            } ------>\n`;
        } else {
          acc.content += editor.content;
        }
        acc.errors = [
          ...acc.errors,
          ...editor.errors.map((error) => ({
            ...error,
            line: error.line + currentLine,
          })),
        ];

        return acc;
      },
      { errors: [], content: "" }
    );
  }, [readOnlyEditor]);

  return (
    <>
      <Editor
        content={existingContent.content}
        availableCommands={availableCommands}
        errors={existingContent.errors}
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
