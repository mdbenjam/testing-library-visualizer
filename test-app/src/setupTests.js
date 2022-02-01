// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import {
  registerStyling,
  setup,
  registerCommands,
} from "react-testing-visualizer";
import path from "path";

setup(path.join(__dirname, "..", "build"));

registerStyling("static/css/test.css");
registerCommands({
  test: () => {
    console.log("test command");
  },
});
