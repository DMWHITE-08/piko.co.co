import serverless from 'serverless-http';
import { app } from '../src/serverApp';

export const handler = serverless(app);
