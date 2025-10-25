import { NextRequest } from "next/server";

/**
 * SSE endpoint for sending real-time status updates
 * This sends immediate notifications when chat generation starts
 */
export async function GET(req: NextRequest) {
  // Set up SSE response headers
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(encoder.encode(data));
      
      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 15000);
      
      // Store the controller for later use
      // In a production app, you'd store this in a Map with a unique ID
      // For now, we'll just close it after a timeout
      setTimeout(() => {
        clearInterval(heartbeat);
        controller.close();
      }, 60000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
