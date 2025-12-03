// services/gateway/index.js
global.fetch = require("node-fetch");

const { ApolloServer } = require('@apollo/server');
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');
const { startStandaloneServer } = require('@apollo/server/standalone');

async function start() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: "user", url: "http://localhost:4001/" },
      ],
    }),
  });

  const server = new ApolloServer({
    gateway,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
      return {
        tenantId: req.headers["x-tenant-id"] || null,
      };
    },
  });

  console.log(`🚀 Gateway running at ${url}`);
}

start();
