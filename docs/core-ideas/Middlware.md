# Middleware

Middleware work the same way they do in something like tRPC, they are pieces of code that determine if incoming message should be processed or not and also give you access to context object that can be used later in processing the message just like in tRPC.

(note: middlewares are not to be used for input validation that is automatically done by defining the input field in zapEvent object)

## API

```ts 
zapEvent({
  input: ...,
  middleware: function[],
  process: ...
});
```

middleware in zap-socket is just an array of functions, each function must return either true or false if it returns true the middleware lets the message pass if it returns false message can't go through. a message must pass all the middlewares to be processed. these functions can be async or sync.

**middleware execution flow**

the middleware stack executes in order:

1️⃣ middleware[0] → true

2️⃣ middleware[1] → true

3️⃣ … → continues through all middleware

4️⃣ **finally** → calls the process() function.

## Example

```ts
const events = {
  privateAction: zapEvent({
    input: z.object({ data: z.string() }),
    middleware: [
      logger,
      auth,
      rateLimiter({ limit: 10, windowMs: 30000 }) // this returns a function, do not call your middleware functions directly.
    ],
    process: ({ input }) => `Secure data: ${input.data}`
  })
};
```

## Middleware Function

```ts
type MiddlewareType = (ctx: MiddlwareContext, msg: MiddlwareMsg) => boolean | Promise<boolean>;

type MiddlwareContext = Record<string, any>;

type MiddlwareMsg = {
    event: string;
    data: any;
    metadata: MiddlewareMetadata;
};

type MiddlewareMetadata = {
    id: string;
    ip: string;
    timestamp: number;
    size: number;
};
```

### Context

you can edit middlewareContext inside the middleware i.e add values to it and then use that in process like,

```ts
const events = {
  someEvent: zapEvent({
    input: z.string(),
    middleware: [
      async (ctx, { metadata }) => {
        const { ip } = metadata;

        const res = await fetch(`http://localhost:8000/getLocation?ip=${ip}`);
        const data = await res.json();

        // Store location in context
        ctx['location'] = data.location;
      }
    ],
    process: (input, { buffer }) => {
      const { location } = buffer;

      console.log("User location:", location);
    }
  })
};
```
