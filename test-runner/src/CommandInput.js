import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { history, historyKeymap } from "@codemirror/history";
import { foldGutter, foldKeymap } from "@codemirror/fold";
import { indentOnInput } from "@codemirror/language";
import { lineNumbers, highlightActiveLineGutter } from "@codemirror/gutter";
import { defaultKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { commentKeymap } from "@codemirror/comment";
import { rectangularSelection } from "@codemirror/rectangular-selection";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { lintKeymap } from "@codemirror/lint";

import { javascript } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import { tags, HighlightStyle } from "@codemirror/highlight";
import {
  oneDarkTheme,
  oneDarkHighlightStyle,
} from "@codemirror/theme-one-dark";

const myHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#fc6" },
  { tag: tags.comment, color: "#f5d", fontStyle: "italic" },
]);

const completePropertyAfter = ["PropertyName", ".", "?."];
const dontCompleteIn = [
  "TemplateString",
  "LineComment",
  "BlockComment",
  "VariableDefinition",
  "PropertyDefinition",
];

function completeProperties(from: number, object: Object) {
  let options = [];
  for (let name in object) {
    options.push({
      label: name,
      type: typeof object[name] == "function" ? "function" : "variable",
    });
  }
  return {
    from,
    options,
    span: /^[\w$]*$/,
  };
}

const fixedHeightEditor = EditorView.theme({
  "&": { height: "300px" },
  ".cm-scroller": { overflow: "auto" },
});

function CommandInput({ setInnerHTML, availableCommands }) {
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [navigatingHistory, setNavigatingHistory] = useState(0);
  // const [editor, setEditor] = useState();

  // const onChange = (value) => {
  //   console.log(command, value);
  //   setCommand(value);
  // };

  // const commandHistoryText = useMemo(
  //   () => commandHistory.map((history) => history.command).join("\n"),
  //   [commandHistory]
  // );
  // const annotations = useMemo(
  //   () =>
  //     commandHistory.reduce(
  //       (acc, history) => {
  //         if (history.error) {
  //           acc.annotations.push({
  //             row: acc.lineStart,
  //             column: 0,
  //             type: "error",
  //             text: history.error.message.replace(
  //               /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
  //               ""
  //             ),
  //           });
  //         }

  //         acc.lineStart =
  //           acc.lineStart + (history.command.match(/\n/g) || []).length + 1;
  //         return acc;
  //       },
  //       { annotations: [], lineStart: 0 }
  //     ).annotations,
  //   [commandHistory]
  // );

  // useEffect(() => {
  //   if (editor) {
  //     editor.getSession().setAnnotations(annotations);
  //   }
  // }, [annotations]);

  const editorDidMount = (editor, monaco) => {
    console.log("editorDidMount", editor);
    editor.focus();
  };

  // console.log(annotations, commandHistoryText);
  const options = {
    selectOnLineNumbers: true,
  };
  const codeEditorRef = useRef();
  const codeMirrorRef = useRef();
  const codeHistory = useRef({ index: 0, history: [] });
  const submit = useCallback(() => {
    axios
      .post("/command", { command: codeMirrorRef.current.state.doc })
      .then((response) => {
        setInnerHTML(response.data.html);
        setCommandHistory([
          ...commandHistory,
          { command, error: response.data.error },
        ]);
        codeHistory.current.history = [
          codeMirrorRef.current.state.doc,
          ...codeHistory.current.history,
        ];
        codeHistory.current.index = 0;
        const transaction = codeMirrorRef.current.state.update({
          changes: { from: 0, to: codeMirrorRef.current.state.doc.length },
        });
        codeMirrorRef.current.dispatch(transaction);
      });
  }, [codeMirrorRef, codeHistory]);

  const myCompletions = useCallback(
    (context) => {
      let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
      if (
        completePropertyAfter.includes(nodeBefore.name) &&
        nodeBefore.parent?.name === "MemberExpression"
      ) {
        let object = nodeBefore.parent.getChild("Expression");
        if (object?.name === "VariableName") {
          let from = /\./.test(nodeBefore.name)
            ? nodeBefore.to
            : nodeBefore.from;
          let variableName = context.state.sliceDoc(object.from, object.to);
          console.log(variableName, from);
          return {
            from,
            options: (availableCommands[variableName] || []).map(
              (property) => ({
                label: property,
                type: "function",
              })
            ),
            span: /^[\w$]*$/,
          };
        }
      } else if (nodeBefore.name === "VariableName") {
        return {
          from: nodeBefore.from,
          options: (Object.keys(availableCommands) || []).map((keyword) => ({
            label: keyword,
            type: "function",
          })),
          span: /^[\w$]*$/,
        };
        // } else if (context.explicit && !dontCompleteIn.includes(nodeBefore.name)) {
        //   return completeProperties(context.pos, window);
      }
      return null;
    },
    [availableCommands]
  );

  useEffect(() => {
    if (codeEditorRef.current) {
      const ctrlCursorArrowUp = (props) => {
        const { state, dispatch } = props;
        codeHistory.current.index = Math.min(
          codeHistory.current.index + 1,
          codeHistory.current.history.length
        );
        const transaction = state.update({
          changes: {
            from: 0,
            to: state.doc.length,
            insert: codeHistory.current.history[codeHistory.current.index - 1],
          },
        });
        dispatch(transaction);
      };

      const ctrlCursorArrowDown = (props) => {
        const { state, dispatch } = props;
        codeHistory.current.index = Math.max(codeHistory.current.index - 1, 0);

        const transaction = state.update({
          changes: {
            from: 0,
            to: state.doc.length,
            insert:
              codeHistory.current.index === 0
                ? ""
                : codeHistory.current.history[codeHistory.current.index - 1],
          },
        });
        dispatch(transaction);
      };

      const previousCommandsKeyMap = [
        {
          key: "Ctrl-ArrowUp",
          mac: "Cmd-ArrowUp",
          run: ctrlCursorArrowUp,
          preventDefault: true,
        },
        {
          key: "Ctrl-ArrowDown",
          mac: "Cmd-ArrowDown",
          run: ctrlCursorArrowDown,
          preventDefault: true,
        },
      ];

      const sendCommandKeyMap = [
        {
          key: "Ctrl-Enter",
          mac: "Cmd-Enter",
          run: submit,
          preventDefault: true,
        },
      ];
      let state = EditorState.create({
        doc: "",
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          defaultHighlightStyle.fallback,
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          keymap.of([
            ...sendCommandKeyMap,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...commentKeymap,
            ...completionKeymap,
            ...lintKeymap,
            ...previousCommandsKeyMap,
          ]),
          javascript(),
          autocompletion({ override: [myCompletions] }),
          oneDarkHighlightStyle,
          oneDarkTheme,
          fixedHeightEditor,
        ],
      });
      if (codeMirrorRef.current) {
        codeMirrorRef.current.destroy();
      }
      codeMirrorRef.current = new EditorView({
        state,
        parent: codeEditorRef.current,
      });
    } else if (codeMirrorRef.current) {
      codeMirrorRef.current.destory();
    }
  }, [codeEditorRef, codeMirrorRef, myCompletions, submit]);

  return (
    <>
      <div className="code-editor" id="code-editor" ref={codeEditorRef} />
      <button onClick={submit}>Submit</button>
    </>
  );
}

export default CommandInput;
