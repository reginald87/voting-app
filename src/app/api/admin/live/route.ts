import { requireAdmin } from "@/lib/session";
import { getLiveResults } from "@/lib/election";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = async () => {
        try {
          const results = await getLiveResults();
          send({ type: "results", results, at: Date.now() });
        } catch (e) {
          send({ type: "error", message: String(e) });
        }
      };

      await tick();

      const interval = setInterval(tick, 2000);
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
