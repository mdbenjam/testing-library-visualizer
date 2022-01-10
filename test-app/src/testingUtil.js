import Fastify from "fastify";
import fastifyStatic from "fastify-static";
import path from "path";
import { screen } from "@testing-library/react";

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "build", "static", "css"),
  prefix: "/", // optional: default '/'
});

var isListening = false;

fastify.get("/initial_html", async (request, reply) => {
  console.log(document.documentElement.innerHTML);
  console.log("hi");
  return document.documentElement.innerHTML;
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
