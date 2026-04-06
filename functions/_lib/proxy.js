const normalizeOrigin = (origin) => {
    if (!origin || typeof origin !== "string") return "";
    return origin.endsWith("/") ? origin.slice(0, -1) : origin;
};

const jsonResponse = (payload, status) => (
    new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
        },
    })
);

const getTargetOrigin = (pathname, env) => {
    const apiOrigin = normalizeOrigin(env.API_BACKEND_ORIGIN);
    const analyzeOrigin = normalizeOrigin(env.ANALYZE_BACKEND_ORIGIN);

    if (pathname === "/api/youtube/info" || pathname === "/api/test-key") {
        return apiOrigin;
    }

    return analyzeOrigin;
};

const buildTargetUrl = (requestUrl, env) => {
    const sourceUrl = new URL(requestUrl);
    const targetOrigin = getTargetOrigin(sourceUrl.pathname, env);

    if (!targetOrigin) {
        const envKey =
            sourceUrl.pathname === "/api/youtube/info" || sourceUrl.pathname === "/api/test-key"
                ? "API_BACKEND_ORIGIN"
                : "ANALYZE_BACKEND_ORIGIN";

        throw new Error(`${envKey} is not configured.`);
    }

    const upstreamPath = sourceUrl.pathname.replace(/^\/api/, "") || "/";
    return `${targetOrigin}${upstreamPath}${sourceUrl.search}`;
};

const buildProxyHeaders = (request) => {
    const headers = new Headers(request.headers);

    headers.delete("host");
    headers.delete("content-length");
    headers.set("x-forwarded-host", new URL(request.url).host);

    return headers;
};

export const proxyRequest = async (context) => {
    const { request, env } = context;

    let targetUrl;
    try {
        targetUrl = buildTargetUrl(request.url, env);
    } catch (error) {
        return jsonResponse({ message: error.message }, 500);
    }

    const init = {
        method: request.method,
        headers: buildProxyHeaders(request),
        redirect: "follow",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = request.body;
    }

    const upstreamResponse = await fetch(targetUrl, init);
    const responseHeaders = new Headers(upstreamResponse.headers);

    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");

    return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
    });
};
