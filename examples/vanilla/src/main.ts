import { createZapClient } from "@zap-socket/client";
import { Events } from "../server/index";

const client = createZapClient<Events>({ url: "ws://localhost:8000/" });
