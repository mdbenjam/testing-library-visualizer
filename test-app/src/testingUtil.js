import Fastify from "fastify";
import fastifyStatic from "fastify-static";
import path from "path";
import fs from "fs";
import { runCommand } from "./commandParser";

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

fastify.get("/load", async (request, reply) => {
  return {
    html: replaceFilePaths(document.documentElement.innerHTML, manifest),
    cssFiles: [manifest["main.css"]],
  };
});

fastify.get("/styling", async (request, reply) => {
  return reply.sendFile("main.073c9b0a.css");
});

fastify.get("/stop", async (request, reply) => {
  isListening = false;
  fastify.close();
  return "stopping";
});

fastify.post("/command", async (request, reply) => {
  const output = await runCommand(request.body.command);

  return {
    html: replaceFilePaths(document.documentElement.innerHTML, manifest),
    error: output.error && {
      name: output.error.name,
      message: output.error.message,
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

export const start = async () => {
  try {
    isListening = true;
    await getCssFiles();
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
