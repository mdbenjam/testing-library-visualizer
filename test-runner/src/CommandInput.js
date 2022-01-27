import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import Editor, { useEditor } from "./Editor";

function CommandInput({ setInnerHTML, availableCommands }) {
  const readOnlyEditorProps = useEditor();
  const editorProps = useEditor();
  const { codeMirrorRef, codeHistory, appendToHistory, setText } = editorProps;
  const [commandHistory, setCommandHistory] = useState([]);

  const submit = useCallback(() => {
    axios
      .post("/command", { command: codeMirrorRef.current.state.doc })
      .then((response) => {
        setInnerHTML(response.data.html);
        setCommandHistory([
          ...commandHistory,
          {
            command: codeMirrorRef.current.state.doc,
            error: response.data.error,
          },
        ]);
        appendToHistory(codeMirrorRef.current.state.doc);
        setText("");
      });
  }, [
    codeMirrorRef,
    appendToHistory,
    setText,
    commandHistory,
    setCommandHistory,
    setInnerHTML,
  ]);

  return (
    <>
      <Editor
        {...readOnlyEditorProps}
        text={commandHistory.map((history) => history.command).join("\n")}
      />
      <Editor
        {...editorProps}
        submit={submit}
        availableCommands={availableCommands}
      />
      <button onClick={submit}>Submit</button>
    </>
  );
}

export default CommandInput;
