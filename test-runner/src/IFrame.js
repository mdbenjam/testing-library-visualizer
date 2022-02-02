import React, { useMemo } from "react";

export const IFrame = ({ children }) => {
  const iframe = useMemo(() => {
    return (
      <iframe
        title="test-page-content"
        className="test-iframe"
        srcDoc={`<style type='text/css'>.react-test-highlight-element {border: 1px solid red;flex: 1;}</style>${children}`}
      />
    );
  }, [children]);

  return iframe;
};
