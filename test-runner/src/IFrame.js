import React, { useState } from "react";
import { createPortal } from "react-dom";

export const IFrame = ({ children, styleLinks }) => {
  const [contentRef, setContentRef] = useState(null);
  const mountNode = contentRef?.contentWindow?.document?.body;

  return (
    <iframe
      title="test-page-content"
      className="test-iframe"
      ref={setContentRef}
    >
      {mountNode &&
        createPortal(
          <>
            <style type="text/css">
              {".react-test-highlight-element {border: 1px solid red;flex: 1;}"}
            </style>
            <div dangerouslySetInnerHTML={{ __html: children }} />
          </>,
          mountNode
        )}
    </iframe>
  );
};
