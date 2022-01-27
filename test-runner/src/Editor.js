import { useEffect, useCallback, useRef } from "react";

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
import {
  oneDarkTheme,
  oneDarkHighlightStyle,
} from "@codemirror/theme-one-dark";

const completePropertyAfter = ["PropertyName", ".", "?."];

const fixedHeightEditor = EditorView.theme({
  "&": { height: "300px" },
  ".cm-scroller": { overflow: "auto" },
});

export function useEditor() {
  const codeMirrorRef = useRef();
  const codeHistory = useRef({ index: 0, history: [] });

  const appendToHistory = useCallback(
    (value) => {
      codeHistory.current.history = [value, ...codeHistory.current.history];
      codeHistory.current.index = 0;
    },
    [codeHistory]
  );
  const setText = useCallback(
    (text) => {
      if (codeMirrorRef.current) {
        const transaction = codeMirrorRef.current.state.update({
          changes: {
            from: 0,
            to: codeMirrorRef.current.state.doc.length,
            insert: text,
          },
        });
        codeMirrorRef.current.dispatch(transaction);
      }
    },
    [codeMirrorRef]
  );

  return { codeMirrorRef, codeHistory, appendToHistory, setText };
}

export default function Editor({
  codeMirrorRef,
  codeHistory,
  setText,
  availableCommands,
  submit,
  text,
}) {
  useEffect(() => {
    if (setText) {
      setText(text);
    }
  }, [text, setText]);

  const codeEditorRef = useRef();

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
      codeMirrorRef.current.focus();
    }
  }, [codeEditorRef, codeMirrorRef, myCompletions, submit, codeHistory]);

  useEffect(() => {
    return () => {
      codeMirrorRef.current.destory();
    };
  }, []);
  return (
    <>
      <div className="code-editor" ref={codeEditorRef} />
    </>
  );
}
