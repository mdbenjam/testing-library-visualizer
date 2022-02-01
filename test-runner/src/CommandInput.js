import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import Editor from "./Editor";
import ErrorBoundary from "./ErrorBoundary";

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
        ...readOnlyEditor.slice(0, readOnlyEditor.length - 1),
        { ...readOnlyEditor[readOnlyEditor.length - 1], wasReset: true },
        {
          content: "",
          errors: [],
          wasReset: false,
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
              editor.wasReset ? "Test Reset" : "Browser Refreshed"
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
      <ErrorBoundary>
        <div className="editor-div">
          <h1 className="code-window-titles">Code History</h1>
          <Editor
            content={existingContent.content}
            availableCommands={availableCommands}
            errors={existingContent.errors}
            readonly
          />
        </div>
        <div className="editor-div">
          <h1 className="code-window-titles">Code Input</h1>
          <Editor
            content={editorValue}
            onContentChange={setEditorValue}
            availableCommands={availableCommands}
            submit={submit}
            commandHistory={commandHistory}
          />
        </div>
      </ErrorBoundary>
      <div>
        <button onClick={submit}>Submit</button>
        <button onClick={resetTest}>Reset Test</button>
        <button
          onClick={() => {
            window.localStorage.clear();
            setReadOnlyEditor([
              {
                content: "",
                errors: [],
                wasReset: false,
              },
            ]);
          }}
        >
          Clear history
        </button>
        <button onClick={() => axios.post("/stop")}>Stop Test</button>
      </div>
    </>
  );
}

export default CommandInput;
