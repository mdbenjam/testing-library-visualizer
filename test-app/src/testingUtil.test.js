import { replaceFilePaths } from "./testingUtil";

const assetManifest = {
  "main.css": "/static/css/main.073c9b0a.css",
  "main.js": "/static/js/main.5d58cadf.js",
  "static/js/787.85457e2e.chunk.js": "/static/js/787.85457e2e.chunk.js",
  "static/media/logo.svg":
    "/static/media/logo.6ce24c58023cc2f8fd88fe9d219db6c6.svg",
  "index.html": "/index.html",
  "main.073c9b0a.css.map": "/static/css/main.073c9b0a.css.map",
  "main.5d58cadf.js.map": "/static/js/main.5d58cadf.js.map",
  "787.85457e2e.chunk.js.map": "/static/js/787.85457e2e.chunk.js.map",
};

test("replace assets properly", async () => {
  const html = `<body><img src="logo.svg" class="App-logo" alt="logo"></body>`;

  expect(replaceFilePaths(html, assetManifest)).toEqual(
    `<body><img src="/static/media/logo.6ce24c58023cc2f8fd88fe9d219db6c6.svg" class="App-logo" alt="logo"></body>`
  );
});
