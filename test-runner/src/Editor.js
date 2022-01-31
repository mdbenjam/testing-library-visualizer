import { useEffect, useCallback, useRef, useMemo } from "react";

import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
} from "@codemirror/view";
import { RangeSet, Range } from "@codemirror/rangeset";
import { EditorState, StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration } from "@codemirror/view";
import { history, historyKeymap } from "@codemirror/history";
import { foldGutter, foldKeymap } from "@codemirror/fold";
import { indentOnInput } from "@codemirror/language";
import {
  lineNumbers,
  highlightActiveLineGutter,
  gutter,
  GutterMarker,
} from "@codemirror/gutter";
import { defaultKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { commentKeymap } from "@codemirror/comment";
import { rectangularSelection } from "@codemirror/rectangular-selection";
import { defaultHighlightStyle } from "@codemirror/highlight";
import { lintKeymap } from "@codemirror/lint";
import { hoverTooltip } from "@codemirror/tooltip";

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

const submitFunctionEffect = StateEffect.define({});
const submitFunctionState = StateField.define({
  create() {
    return { submitFunction: () => {} };
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(submitFunctionEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

const updateCommandHistoryEffect = StateEffect.define({});
const updateHistoryIndexEffect = StateEffect.define({});
const commandHistoryState = StateField.define({
  create() {
    return { index: 0, commandHistory: [] };
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(updateCommandHistoryEffect)) {
        return { ...value, commandHistory: effect.value.commandHistory };
      }
      if (effect.is(updateHistoryIndexEffect)) {
        return { ...value, index: effect.value.index };
      }
    }
    return value;
  },
});

class ErrorGutterMarker extends GutterMarker {
  constructor(errorData) {
    super();
    this.errorData = errorData;
  }

  toDOM() {
    return document.createTextNode("🛑");
  }
}
const underlineMark = Decoration.mark({ class: "cm-underline" });

const errorEffect = StateEffect.define({});
const errorState = StateField.define({
  create() {
    return RangeSet.empty;
  },
  update(value, transaction) {
    // value = value.map(transaction.changes);
    const errorEffects = transaction.effects.filter((error) =>
      error.is(errorEffect)
    );
    value = value.update({
      add: errorEffects.map((error) =>
        new ErrorGutterMarker(error.value).range(
          error.value.from,
          error.value.to
        )
      ),
      sort: true,
    });

    return value;
  },
  provide: (field) => {
    return EditorView.decorations.from(field, (value) => {
      console.log(value);
      let marks = Decoration.none;
      for (let iter = value.iter(); iter.value !== null; iter.next()) {
        console.log(iter.from, iter.to);
        marks = marks.update({
          add: [underlineMark.range(iter.from, iter.to)],
        });
      }
      console.log(marks);
      return marks;
    });
  },
});

const cursorTooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip-error": {
    backgroundColor: "#4f4e4a",
    color: "white",
    border: "none",
    padding: "2px 7px",
  },
});

const errorHover = hoverTooltip((view, pos, side) => {
  const state = view.state.field(errorState);
  let { from, to } = view.state.doc.lineAt(pos);

  for (let iter = state.iter(); iter.value !== null; iter.next()) {
    if (from === iter.from) {
      return {
        pos: from,
        end: to,
        above: true,
        create(view) {
          let dom = document.createElement("div");
          dom.className = "cm-tooltip-error";
          dom.innerHTML = `<p>${iter.value.errorData.error.message}</p>`;
          return { dom };
        },
      };
    }
  }

  return null;
});

const errorGutter = [
  errorState,
  gutter({
    class: "cm-breakpoint-gutter",
    markers: (v) => v.state.field(errorState),
    initialSpacer: () => new ErrorGutterMarker(),
  }),
  EditorView.baseTheme({
    ".cm-breakpoint-gutter .cm-gutterElement": {
      color: "red",
      paddingLeft: "5px",
      cursor: "default",
    },
  }),
];

const underlineTheme = EditorView.baseTheme({
  ".cm-underline": { textDecoration: "underline 1px red wavy" },
});

const setCodeHistory = (codeMirrorRef, commandHistory) => {
  if (!codeMirrorRef.current) return;
  codeMirrorRef.current.dispatch({
    effects: updateCommandHistoryEffect.of({ commandHistory }),
  });
};

const setText = (codeMirrorRef, content) => {
  if (!codeMirrorRef.current) return;

  const doc = codeMirrorRef.current.state.doc;

  // Don't update the document if it's equal to the `content` prop.
  // Otherwise it would reset the cursor position.
  const currentDocument = doc.toString();
  if (content === currentDocument) return;

  codeMirrorRef.current.dispatch({
    changes: { from: 0, to: doc.length, insert: content },
  });
};

const setErrors = (codeMirrorRef, errors) => {
  if (!codeMirrorRef.current || !errors) return;
  const existingErrorState = codeMirrorRef.current.state.field(errorState);

  const existingErrors = [];
  for (let iter = existingErrorState.iter(); iter.value !== null; iter.next()) {
    existingErrors.push(iter.value);
  }

  codeMirrorRef.current.dispatch({
    effects: errors
      .map((error) =>
        errorEffect.of({
          from: codeMirrorRef.current.state.doc.line(error.line).from,
          to: codeMirrorRef.current.state.doc.line(error.line).to,
          error: error.message,
        })
      )
      .filter((error) => {
        console.log(existingErrors, error);
        return !existingErrors.find(
          (existingError) => existingError.errorData.from === error.value.from
        );
      }),
  });
};

export default function Editor({
  onContentChange,
  availableCommands,
  submit,
  content,
  commandHistory,
  errors,
  readonly = false,
}) {
  const codeEditorRef = useRef();
  const { codeMirrorRef, codeHistory } = useEditor();

  useEffect(() => {
    if (!codeMirrorRef.current) return;
    codeMirrorRef.current.dispatch({
      effects: submitFunctionEffect.of({ submit }),
    });
  }, [submit, codeMirrorRef]);

  useEffect(() => {
    setCodeHistory(codeMirrorRef, commandHistory);
  }, [commandHistory, codeMirrorRef]);

  useEffect(() => {
    setText(codeMirrorRef, content);
  }, [content, codeMirrorRef]);

  useEffect(() => {
    setErrors(codeMirrorRef, errors);
  }, [errors, codeMirrorRef]);

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

  const updateListener = useMemo(() => {
    return EditorView.updateListener.of((update) => {
      if (
        !update.docChanged ||
        !onContentChange ||
        typeof onContentChange !== "function"
      )
        return;
      onContentChange(update.state.doc.toString());
    });
  }, [onContentChange]);

  useEffect(() => {
    if (codeEditorRef.current) {
      const ctrlCursorArrowUp = (props) => {
        const { state, dispatch } = props;
        const commandHistory = state.field(commandHistoryState);

        const newIndex = Math.min(
          commandHistory.index + 1,
          commandHistory.commandHistory.length
        );
        dispatch({
          effects: updateHistoryIndexEffect.of({ index: newIndex }),
          changes: {
            from: 0,
            to: state.doc.length,
            insert: commandHistory.commandHistory[newIndex - 1],
          },
        });
      };

      const ctrlCursorArrowDown = (props) => {
        const { state, dispatch } = props;
        const commandHistory = state.field(commandHistoryState);

        const newIndex = Math.max(commandHistory.index - 1, 0);
        console.log(commandHistory, newIndex);
        dispatch({
          effects: updateHistoryIndexEffect.of({ index: newIndex }),
          changes: {
            from: 0,
            to: state.doc.length,
            insert:
              newIndex === 0 ? "" : commandHistory.commandHistory[newIndex - 1],
          },
        });
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
          run: ({ state }) => {
            state.field(submitFunctionState).submit();
          },
          preventDefault: true,
        },
      ];
      let state = EditorState.create({
        doc: "",
        extensions: [
          [errorGutter, lineNumbers()],
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
          updateListener,
          submitFunctionState,
          commandHistoryState,
          errorHover,
          cursorTooltipBaseTheme,
          underlineTheme,
          EditorView.editable.of(!readonly),
        ],
      });
      if (
        codeMirrorRef.current &&
        typeof codeMirrorRef.current.destroy === "function"
      ) {
        codeMirrorRef.current.destroy();
      }
      codeMirrorRef.current = new EditorView({
        state,
        parent: codeEditorRef.current,
      });
      codeMirrorRef.current.focus();
      setCodeHistory(codeMirrorRef, commandHistory);
      setText(codeMirrorRef, content);
      setErrors(codeMirrorRef, errors);
    }
  }, [
    codeEditorRef,
    codeMirrorRef,
    myCompletions,
    codeHistory,
    updateListener,
    readonly,
  ]);

  useEffect(() => {
    return () => {
      if (
        codeMirrorRef.current &&
        typeof codeMirrorRef.current.destroy === "function"
      )
        codeMirrorRef.current.destory();
    };
  }, []);
  return (
    <>
      <div className="code-editor" ref={codeEditorRef} />
    </>
  );
}
