import Fastify from "fastify";
import fastifyStatic from "fastify-static";
import path from "path";
import fs from "fs";
import { screen } from "@testing-library/react";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "build"),
  prefix: "/", // optional: default '/'
  wildcard: true,
});

var isListening = false;
var cssFileNames = [];

async function getCssFiles() {
  cssFileNames = (
    await fs.promises.readdir(
      path.join(__dirname, "..", "build", "static", "css")
    )
  )
    .filter((fileName) => fileName.endsWith("css"))
    .map((fileName) => `static/css/${fileName}`);
}

fastify.get("/load", async (request, reply) => {
  console.log(document.documentElement.innerHTML);

  console.log("hi");
  return { html: document.documentElement.innerHTML, cssFiles: cssFileNames };
});

fastify.get("/styling", async (request, reply) => {
  return reply.sendFile("main.073c9b0a.css");
});

fastify.get("/stop", async (request, reply) => {
  isListening = false;
  fastify.close();
  return "stopping";
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    fastify.log.error(err);
    process.exit(1);
  }
};
