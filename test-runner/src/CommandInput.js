import { useMemo, useEffect, useState, useCallback } from "react";
import axios from "axios";

import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
// import "ace-builds/src-noconflict/snippets/javascript";
import "ace-builds/src-noconflict/theme-tomorrow";

import langTools from "ace-builds/src-min-noconflict/ext-language_tools";
var customCompleter = {
  getCompletions: function (editor, session, pos, prefix, callback) {
    callback(null, [
      {
        name: "screen",
        value: "screen",
        score: 1,
        meta: "The screen object in react testing library",
      },
      {
        name: "getByText",
        value: "getByText",
        score: 1,
        meta: "The getByText object in react testing library",
      },
    ]);
  },
};
langTools.addCompleter(customCompleter);

function CommandInput({ setInnerHTML }) {
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [navigatingHistory, setNavigatingHistory] = useState(0);
  const [editor, setEditor] = useState();

  const onChange = (value) => {
    console.log(command, value);
    setCommand(value);
  };
  const submit = useCallback(() => {
    axios.post("/command", { command }).then((response) => {
      setInnerHTML(response.data.html);
      setCommandHistory([
        ...commandHistory,
        { command, error: response.data.error },
      ]);
    });
  }, [command]);

  const commandHistoryText = useMemo(
    () => commandHistory.map((history) => history.command).join("\n"),
    [commandHistory]
  );
  const annotations = useMemo(
    () =>
      commandHistory.reduce(
        (acc, history) => {
          if (history.error) {
            acc.annotations.push({
              row: acc.lineStart,
              column: 0,
              type: "error",
              text: history.error.message.replace(
                /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
                ""
              ),
            });
          }

          acc.lineStart =
            acc.lineStart + (history.command.match(/\n/g) || []).length + 1;
          return acc;
        },
        { annotations: [], lineStart: 0 }
      ).annotations,
    [commandHistory]
  );

  useEffect(() => {
    if (editor) {
      editor.getSession().setAnnotations(annotations);
    }
  }, [annotations]);

  console.log(annotations, commandHistoryText);

  return (
    <>
      <h2>Command History</h2>
      <AceEditor
        readOnly
        mode="javascript"
        theme="tomorrow"
        name="command line editor"
        fontSize={16}
        showPrintMargin={true}
        showGutter={true}
        value={commandHistoryText}
        onLoad={setEditor}
        setOptions={{
          tabSize: 2,
        }}
      />
      <h2>Command</h2>
      <div
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            submit();
            event.preventDefault();
            setCommand("");
          }
        }}
      >
        <AceEditor
          placeholder="Placeholder Text"
          mode="javascript"
          theme="tomorrow"
          name="command line editor"
          maxLines={3}
          onChange={onChange}
          fontSize={16}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          value={command}
          setOptions={{
            tabSize: 2,
          }}
          enableBasicAutocompletion={true}
          enableLiveAutocompletion={true}
        />
      </div>
    </>
  );
}

export default CommandInput;
