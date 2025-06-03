# Request Response Model.

Request response model in zap-socket works exactly as you expect. You send a request you receive a response, the difference is that you are doing this over ws instead of http.

There is also an example of this check it out here.

You create a req-res event using `zapEvent` function.

### Server

```ts
const events = {
  soemEvent: zapEvent({
    input: z.string(),
    process: () => {
      return "something",
    }
  }),
}
```

Because in the `process` you returned something, `someEvent` event automatically becomes a req-res model.

### Client

```ts
const zap = createZapClient<Events>("ws://some-url/");
const response = await zap.events.someEvent.send('something');
```

With req-res you don't have to listen anywhere you just await it and response is now whatever you returned in process.

To read more about zapEvent method, check out its docs here.
