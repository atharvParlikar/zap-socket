

  llm: zapStream({
    input: z.string(),
    process: async function* (input) {
      for (const token of input.toUpperCase().split(" ")) {
        yield await new Promise((resolve) => setTimeout(() => resolve(token), 10));
      }
    },
    middleware: [(ctx, msg) => {
      console.log(msg);
      ctx.authenticated = true;
      return true;
    }]
  }),
