import { proxyRequest } from "../_lib/proxy";

export const onRequest = (context) => proxyRequest(context);
