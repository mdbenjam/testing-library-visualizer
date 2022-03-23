import Fastify from "fastify";
import fastifyStatic from "fastify-static";
import path from "path";
import fs from "fs";
import { runCommand, availableCommands, Evaluator } from "./commandParser.js";
import { cleanup } from "@testing-library/react";

const fastify = Fastify({
  logger: true,
});

let buildDirectory = "";

const ASSET_DIRECTORY = "assets";

export const setup = (directory) => {
  buildDirectory = directory;
  fastify.register(fastifyStatic, {
    root: buildDirectory,
    prefix: `/${ASSET_DIRECTORY}/`, // optional: default '/'
    wildcard: true,
  });
};

let evaluator = null;

export const debugTest = async (name, fn) => {
  await test(
    name,
    async () => {
      try {
        await debuggerSetup(async () => {
          await start(() => {
            evaluator = new Evaluator();
            fn();
          });
        });
      } catch (error) {
        throw error;
      } finally {
        stop();
      }
    },
    3600000
  );
};

export const consoleLogQueue = [];
const registeredStyling = [];

export const registerStyling = (styling) => {
  registeredStyling.push(styling);
};

export const debuggerSetup = async (fn) => {
  var _log = console.log,
    _warn = console.warn,
    _error = console.error;

  console.log = function () {
    consoleLogQueue.push({ method: "log", arguments: arguments });
    return _log.apply(console, arguments);
  };
  console.log_without_reporting = function () {
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

  await fn();

  console.log = _log;
  console.warn = _warn;
  console.error = _error;
};

var isListening = false;
var manifest = {};
var resetFunction = null;

function loadManifest() {
  const manifestFileLocation = path.join(buildDirectory, "asset-manifest.json");

  if (fs.existsSync(manifestFileLocation)) {
    const rawdata = fs.readFileSync(manifestFileLocation);
    manifest = JSON.parse(rawdata).files;
    registerStyling(manifest["main.css"]);
  } else {
    console.warn(
      "Could not find asset-manifest.json, this likely means you haven't run `npm run build` or you haven't called the setup function. Run `npm run build` in order to see styling and assets."
    );
    manifest = {};
  }
}

export function replaceFilePaths(html, manifest) {
  const srcReplaced = html.replace(/src="(.*?)"/, (_match, p1) => {
    return `src="/${ASSET_DIRECTORY}${
      manifest[p1] || manifest["static/media/" + p1] || p1
    }"`;
  });

  const hrefReplaced = srcReplaced.replace(/href="(.*?)"/, (_match, p1) => {
    return `href="/${ASSET_DIRECTORY}${
      manifest[p1] || manifest["static/media/" + p1] || p1
    }"`;
  });

  return hrefReplaced;
}

function addStyleLinks(html) {
  const cssFiles = registeredStyling.filter((cssFile) => cssFile);
  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, "text/html");

  cssFiles.forEach((cssFile) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    if (cssFile.indexOf("http://") === 0 || cssFile.indexOf("https://") === 0) {
      link.href = cssFile;
    } else {
      link.href = `${ASSET_DIRECTORY}/` + cssFile;
    }

    newDoc.head.appendChild(link);
  });

  return newDoc.documentElement.innerHTML;
}

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "build"),
  prefix: "/", // optional: default '/'
  wildcard: true,
  decorateReply: false,
});

fastify.get("/", async (request, reply) => {
  return reply.sendFile("index.html", path.join(__dirname, "..", "build"));
});

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
  const output = await runCommand(
    request.body.command,
    consoleLogQueue,
    evaluator
  );

  return {
    html: addStyleLinks(
      replaceFilePaths(document.documentElement.innerHTML, manifest)
    ),
    consoleOutputs: output.consoleOutputs,
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

    loadManifest();
    await setupFunction();
    await fastify.listen(3001);
    console.log_without_reporting(
      "Debug server is running, open at localhost:3001"
    );
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
