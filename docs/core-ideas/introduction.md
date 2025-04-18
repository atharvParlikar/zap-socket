zap-socket is a lightweight WebSocket library inspired by the conventions of tRPC, designed to make real-time communication clean, type-safe, and maintainable.

Like tRPC, you define an events object (similar to "routes") on the server and share its type with the client for full end-to-end type safety and autocomplete.

It also integrates seamlessly with Zod for runtime type validation, and provides a set of elegant primitives that help you keep your codebase simple, modular, and easy to scale.

Under the hood, it uses uWebSockets.js, which delivers up to 9x higher message throughput compared to Socket.IO.

Start with setting up server, in the next chapter.
