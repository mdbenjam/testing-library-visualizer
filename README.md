# Testing Library Visualizer

## Motivation

[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and the whole testing library family of tools has made testing frontends more rigorous and much simpler than it used to be. However, one of the persistent challenges when writing these tests is their debug-ability. When a test fails, testing library dumps the HTML into the console. It's often difficult to parse, and difficult to understand what made the test fail. Furthermore, interactively building up tests is complicated.

The goal of this library is to make writing and debugging tests iteratively easier by showing you what your test is doing, and allowing you to interact with it.


https://user-images.githubusercontent.com/3885236/159789963-48f9d4df-3f99-4ea8-b366-2d1dec1b445d.mp4




## Setup

Install the package via:

`npm install testing-library-visualizer`

If you want to have your app's styling and assets available while debugging then you should build the application and put the following in a jest setup file. If you're using Create React App the following can go into `setupTests.js`. If you don't have a file that sets up the jest context, you can [specify one](https://jestjs.io/docs/configuration#setupfiles-array).

```javascript
import { setup } from "testing-library-visualizer";
import path from "path";
import { expect } from "@jest/globals";
import { screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

setup(path.join(__dirname, "..", "build")); // This should point to wherever your built assets are

registerCommands({ screen, within, fireEvent, userEvent, expect }); // This should include any commands you want to run. See the custom command section below.
```

For users using Create React App we automatically use the generated `asset-manifest.json` file to:

1. Determine the compiled CSS file for the application
2. Translate requests for assets (images etc) so the debug view pulls from the correct URL

If you're not using CRA these things may not work out of the box. Feel free to create an issue as we'd like to support many different setups.

## Debugging a test

Once setup, debugging a test is simple. In the test file with the test you want to debug add:

```javascript
import { debugTest } from "testing-library-visualizer";
```

Then replace `test` with `debugTest`. For example:

```javascript
import { render } from "@testing-library/react";
import App from "./App";
import { debugTest } from "testing-library-visualizer";

debugTest("Test App", async () => {
  render(<App />);
});
```

When you run your test you'll see printed:

`Debug server is running, open at 127.0.0.1:3001`

Go to the URL and you should see the debug interface:

https://user-images.githubusercontent.com/3885236/152245374-0a60bae9-974e-4d02-9979-001d2e8c9c8e.mp4

From this interface you can run commands to interact with your test. Specifically, you can run the following built in commands:

```
highlight
refresh
console
```

And if you configured your test setup as specified above you'll have access to:

```
screen
within
userEvent
fireEvent
expect
```

Highlight and refresh are defined by Testing Library Visualizer. `highlight` takes a HTML element(s) and draws boxes around them. This is a good way to understand what components you're selecting with your testing library commands. `refresh` asks for the latest state of the application. This is useful when an operation might take some time to complete, and you want to see the most up to date version of the component you're testing.

Using these commands you can build up a full test interactively.

## Errors

All errors are caught by the library and shown via the interactive editor. This enables you to see why commands failed while building up your test.

https://user-images.githubusercontent.com/3885236/152245412-e7f47199-a494-4c4d-bc0d-fbc82bc0a7fb.mp4

The library also reads from console.error and reports any errors printed out while running a command. These errors cannot be linked to a specific line, since they happen asynchronously, but the library reports them to the user as soon as it detects them. This is especially useful for catching [act warnings](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning).

## History

The library maintains the list of commands run in the upper read only code editor. It also maintains a buffer of previous commands that can be accessed in the code input section by using `ctrl+arrow up/down` (`alt+arrow up/down` on Mac). This history is stored in local storage so that you can access it between test runs. You can clear this history by using the `Clear History` button.

## Restarting Tests

Clicking the `Reset Test` button will clear the dom and rerun the test code specified in the test file. This can be useful if you have lost track of the state of your test and would like to start over. Note, this doesn't actually cause Jest to rerun the test. Any changes made to the test code or underlying component will not be picked up. To get those changes you need to stop the test by clicking the `Stop Test` button and restarting it with Jest. Furthermore, if there is any other state in the test, clicking reset test will not clear that state which can cause errors. (i.e. no before or after blocks are run when you reset the test.)

## Custom Styling

In many projects there are multiple sources for styling. While by default we look for a `manifest.json` generated by Create React App's build process, you can add styling from other sources as well.

To do this you'll need to add the following to your jest test setup file.

```javascript
import { registerStyling } from "testing-library-visualizer";

registerStyling(/* <URL of styling> */);
```

You can specify a URL hosted by a server, or a path that points to the static built assets in a directory defined by the `setup` command above. This means you can just copy a CSS file into your build folder, and specify the path using the `registerStyling` function to pick it up.

Specifying a file in the build directory would look something like this:

```
registerStyling("static/css/test.css")
```

Where the build folder has sub folders `static/css` and where `test.css` is in that folder.

Specifying a URL would look something like this:

```
registerStyling("http://some-url.com/css/css-file.css)
```

It must start with an `http` or `https` to be considered an absolute URL.

## Custom Commands

In many projects you'll define custom commands that you will want to run in the interactive debug mode. To add commands you'll need to add the following to you jest setup file.

```javascript
import { registerCommands } from "testing-library-visualizer";

registerCommands({
  test: () => {
    console.log("test command");
  }, // This is an example command
});
```

You can pass an object to `registerCommands` where each key is the name of the command, and the value is the function it will run when invoked.

## Shortcuts

| Key | Shortcut|
|---|---|
| Ctrl + Arrow Up/Down (Mac: Alt + Arrow Up/Down) | Navigate history |
| Ctrl + Enter (Mac: Cmd + Enter) | Submit command |
| Esc then Tab | Tab out of the command editor. Without hitting escape first, tab acts to indent |

