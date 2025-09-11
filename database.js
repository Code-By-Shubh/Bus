import {Pool} from 'pg';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // user: 'postgres',
  // host: 'localhost',
  // database: 'Bus_Track',
  // password: 'ecd',
  // port: 6000,
});

export default db;