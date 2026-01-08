import { startCleanupService } from "./faucet/rateLimit.service";
import app from "./main";

// Railway provides the PORT via process.env.PORT
const PORT = process.env.PORT || 3300;

function server() {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on PORT: http://localhost:${PORT}`);
    startCleanupService();
  });
}

server();
