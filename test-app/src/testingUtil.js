import Fastify from "fastify";
import fastifyStatic from "fastify-static";
import path from "path";
import fs from "fs";
import { runCommand, availableCommands } from "./commandParser";
import { cleanup } from "@testing-library/react";

export const consoleLogQueue = [];

export const debuggerSetup = () => {
  jest.setTimeout(3600000);

  var _log = console.log,
    _warn = console.warn,
    _error = console.error;

  console.log = function () {
    consoleLogQueue.push({ method: "log", arguments: arguments });
    return _log.apply(console, arguments);
  };

  console.warn = function () {
    consoleLogQueue.push({ method: "warn", arguments: arguments });
    return _warn.apply(console, arguments);
  };

  console.error = function () {
    consoleLogQueue.push({ method: "error", arguments: arguments });
    return _error.apply(console, arguments);
  };
};

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "build"),
  prefix: "/", // optional: default '/'
  wildcard: true,
});

var isListening = false;
var manifest = {};
var resetFunction = null;

async function getCssFiles() {
  const manifestFileLocation = path.join(
    __dirname,
    "..",
    "build",
    "asset-manifest.json"
  );

  if (fs.existsSync(manifestFileLocation)) {
    const rawdata = fs.readFileSync(manifestFileLocation);
    manifest = JSON.parse(rawdata).files;
  } else {
    console.warn(
      "Could not find asset-manifest.json, this likely means you haven't run `npm run build`. Run `npm run build` in order to see styling and assets."
    );
    manifest = {};
  }
}

export function replaceFilePaths(html, manifest) {
  const srcReplaced = html.replace(/src=\"(.*?)\"/, (_match, p1) => {
    return `src="${manifest[p1] || manifest["static/media/" + p1] || p1}"`;
  });

  const hrefReplaced = srcReplaced.replace(/href=\"(.*?)\"/, (_match, p1) => {
    return `href="${manifest[p1] || manifest["static/media/" + p1] || p1}"`;
  });

  return hrefReplaced;
}

function addStyleLinks(html) {
  const cssFiles = [manifest["main.css"]];
  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, "text/html");

  cssFiles.forEach((cssFile) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = cssFile;
    newDoc.head.appendChild(link);
  });

  return newDoc.documentElement.innerHTML;
}

fastify.get("/load", async (request, reply) => {
  return {
    html: addStyleLinks(
      replaceFilePaths(document.documentElement.innerHTML, manifest)
    ),
    availableCommands: availableCommands(),
  };
});

fastify.post("/stop", async (request, reply) => {
  isListening = false;
  fastify.close();
});

fastify.post("/reset", async (request, reply) => {
  cleanup();
  resetFunction();
  return {
    html: addStyleLinks(
      replaceFilePaths(document.documentElement.innerHTML, manifest)
    ),
  };
});

fastify.post("/command", async (request, reply) => {
  const output = await runCommand(request.body.command, consoleLogQueue);

  return {
    html: addStyleLinks(
      replaceFilePaths(document.documentElement.innerHTML, manifest)
    ),
    error: output.error && {
      name: output.error.name,
      message: output.error.message,
      lineNumber: output.lineNumber,
    },
  };
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const stop = () => {
  console.log("stopping");
  fastify.close();
};

export const start = async (setupFunction) => {
  try {
    isListening = true;
    resetFunction = setupFunction;
    await getCssFiles();
    await setupFunction();
    await fastify.listen(3001);
    console.log("opening");
    while (isListening) {
      await sleep(50);
    }
    console.log("closing");
  } catch (err) {
    console.error(err);
    fastify.log.error(err);
    process.exit(1);
  }
};
