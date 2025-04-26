

  llm: zapStream({
    input: z.string(),
    process: async function* (input) {
      for (const token of input.toUpperCase().split(" ")) {
        yield await new Promise((resolve) => setTimeout(() => resolve(token), 10));
      }
    }
  }),
