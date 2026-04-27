import express from 'express';
import http from 'http';
import cors from 'cors';
import config from './config';
import routes from './routes';
import { initSocket } from './socket';
import { initCron } from './services/cron';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api', routes);

initSocket(server);
initCron();

const port = config.server?.port || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
