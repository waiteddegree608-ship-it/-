import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '../config.json');
const configFile = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configFile);

export default config;
