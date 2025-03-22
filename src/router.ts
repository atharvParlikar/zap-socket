import { z } from 'zod';

const router = {
  getUser: {
    input: z.object({ id: z.number() }),
    resolve: (input: { id: number }) => {
      return { id: input.id, name: "Atharv" };
    },
  },
};

// Infer the type of the router
type RouterType = typeof router;

function createClient<TRouter extends Record<string, { input: any; resolve: any }>>() {
  return new Proxy({} as {
    [K in keyof TRouter]: {
      query: (input: z.infer<TRouter[K]["input"]>) => ReturnType<TRouter[K]["resolve"]>;
    };
  }, {
    get(_, prop: string) {
      return {
        query: (input: any) => {
          console.log("Fake call with", input);
        },
      };
    },
  });
}

// Pass only the type, NOT the actual router
const client = createClient<RouterType>();

client.getUser.query({
  id: 12
})
