// public/sharedWorker.js

let socket = null;
const ports = [];
let isConnected = false;

onconnect = function (e) {
    console.log("connected")
  const port = e.ports[0];
  ports.push(port);

  port.onmessage = function (event) {
    const data = event.data;

    console.log(data);
    

    if (data.type === "INIT") {
      const { userId } = data;

      // Only create socket if it doesn't exist
      if (!socket) {
        socket = new WebSocket("ws://localhost:8080/ws?userId=" + encodeURIComponent(userId)); // Optional query param

        socket.onopen = () => {
          isConnected = true;
          broadcast({ type: "status", message: "✅ WebSocket connected" });
        };

        socket.onmessage = (msg) => { 
            console.log("this is msg ", msg);
            
          let parsed;
          try {
            parsed = JSON.parse(msg.data);
          } catch (err) {
            parsed = msg.data; // fallback: raw string
          }

          // You can customize the event type here if backend sends different types
          broadcast({
            type: parsed?.type || "message",
            message: parsed,
          });
        };

        socket.onerror = (err) => {
          broadcast({ type: "error", message: "❌ WebSocket error" });
        };

        socket.onclose = () => {
          isConnected = false;
          broadcast({ type: "status", message: "🔌 WebSocket disconnected" });
          socket = null;
        };
      }
    }

    if (data.type === "SEND") {
      if (socket && isConnected) {
        try {
          const payload = typeof data.message === "string" ? data.message : JSON.stringify(data.message);
          socket.send(payload);
        } catch (err) {
          port.postMessage({ type: "error", message: "❗ Failed to send message" });
        }
      } else {
        port.postMessage({ type: "error", message: "WebSocket not connected" });
      }
    }
  };

  port.start();

  // Optional: notify new port immediately if already connected
  if (isConnected) {
    port.postMessage({ type: "status", message: "✅ WebSocket already connected" });
  }
};

function broadcast(msg) {
    console.log("fucck u ", msg );
    
  ports.forEach((p) => {
    try {
      p.postMessage(msg);
    } catch (err) {
      // Optionally: remove port if unreachable
      console.warn("Failed to post message to port:", err);
    }
  });
}
