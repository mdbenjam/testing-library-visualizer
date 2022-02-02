// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { setup } from "react-testing-visualizer";
import path from "path";

setup(path.join(__dirname, "..", "build"));

global.window.document.createRange = () => {
  return {
    setEnd: function () {},
    setStart: function () {},
    getBoundingClientRect: function () {
      return { right: 0 };
    },
    getClientRects: function () {
      return {
        length: 0,
        left: 0,
        right: 0,
      };
    },
    selectNodeContents: function () {},
  };
};

global.window.scrollBy = () => {};

jest.spyOn(window.localStorage.__proto__, "setItem");
