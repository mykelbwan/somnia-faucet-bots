import { startCleanupService } from "./faucet/rateLimit.service";
import app from "./main";

const PORT = 3300;

function server() {
  app.listen(PORT, () => {
    console.log(`Server running on PORT: http://localhost:${PORT}`);
    startCleanupService();
  });
}

server();
