// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import {
  // registerStyling,
  setup,
  registerCommands,
} from "testing-library-visualizer";
import path from "path";
import { screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

setup(path.join(__dirname, "..", "build"));

// Example of importing styling placed in the build folder
// registerStyling("static/css/test.css");
// Example of importing styling from a URL
// registerStyling(
//   "https://www.test-website.org/media/css/styling-file.css"
// );

registerCommands({ screen, within, fireEvent, userEvent, expect });
