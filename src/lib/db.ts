import { Pool } from 'pg';
import type { V4PeriodData } from '@/data/types'; // Ensure V4PeriodData is imported

// It's HIGHLY recommended to use environment variables for these settings,
// especially for password, host, and port in production.
// Example: process.env.PGUSER, process.env.PGHOST, etc.
// Ensure you have a .env file at the root of your project for local development:
// PGUSER=your_db_user
// PGHOST=your_db_host
// PGDATABASE=your_db_name
// PGPASSWORD=your_db_password
// PGPORT=5432

const pool = new Pool({
  user: process.env.PGUSER || 'postgres', // Replace 'postgres' with your DB user if not using env var
  host: process.env.PGHOST || 'localhost',  // Replace 'localhost' with your DB host if not using env var
  database: process.env.PGDATABASE || 'car_insurance_db', // Replace 'car_insurance_db' with your DB name
  password: process.env.PGPASSWORD || 'password', // Replace 'password' with your DB password
  port: parseInt(process.env.PGPORT || '5432', 10),
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined, // Basic SSL example
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query:', { text, params, error });
    throw error;
  }
};

// Example function to test connection (optional, can be called on server start or for a test endpoint)
export async function testDbConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database!');
    // You can also run a simple query here like:
    // const res = await client.query('SELECT NOW()');
    // console.log('Current time from DB:', res.rows[0].now);
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error; // Re-throw or handle as needed
  } finally {
    if (client) {
      client.release(); // Always release the client!
    }
  }
}

/**
 * Placeholder function to fetch all distinct period IDs and labels from your database.
 * You'll need to adapt the SQL query to your specific table and column names.
 */
export async function getAllPeriodOptionsFromDb() {
  // const { rows } = await query('SELECT DISTINCT period_id, period_label FROM your_periods_table ORDER BY period_label DESC');
  // return rows.map(row => ({ value: row.period_id, label: row.period_label }));
  console.warn("DB: getAllPeriodOptionsFromDb is not yet implemented with actual DB queries.");
  return []; // Return empty array until implemented
}

/**
 * Placeholder function to fetch business data for a specific period from your database.
 * This will be a more complex query involving joins if your data is normalized.
 * The structure of the returned data should ideally match V4PeriodData or be transformable to it.
 */
export async function getPeriodDataFromDb(periodId: string) {
  // Example structure of query needed:
  // SELECT 
  //   p.period_id, p.period_label, p.comparison_period_id_yoy, p.comparison_period_id_mom,
  //   bd.business_type, bd.premium_written, bd.premium_earned, ... (all V4BusinessDataEntry fields) ...,
  //   t.total_premium_written_overall
  // FROM 
  //   your_periods_table p
  // LEFT JOIN 
  //   your_business_data_table bd ON p.period_id = bd.period_id
  // LEFT JOIN
  //   your_period_totals_table t ON p.period_id = t.period_id
  // WHERE 
  //   p.period_id = $1;
  //
  // You would then need to process these rows to reconstruct the V4PeriodData structure,
  // especially the business_data array and totals_for_period object.
  console.warn(`DB: getPeriodDataFromDb for period ${periodId} is not yet implemented with actual DB queries.`);
  return null; // Return null or throw error until implemented
}

/**
 * Fetches all data from the database and structures it similarly to the V4PeriodData array.
 * This would replace reading from the JSON file.
 */
export async function getAllV4DataFromDb(): Promise<V4PeriodData[]> {
    // This function would need to:
    // 1. Query all distinct period_ids.
    // 2. For each period_id, query its business_data and totals_for_period.
    // 3. Assemble each period's data into the V4PeriodData structure.
    // This can be complex and might involve multiple queries or a large join.
    //
    // Example conceptual query (highly dependent on your schema):
    // SELECT
    //     p.period_id,
    //     p.period_label,
    //     p.comparison_period_id_yoy,
    //     p.comparison_period_id_mom,
    //     (SELECT json_agg(json_build_object(
    //         'business_type', bd.business_type,
    //         'premium_written', bd.premium_written,
    //         'premium_earned', bd.premium_earned,
    //         'total_loss_amount', bd.total_loss_amount,
    //         'expense_amount_raw', bd.expense_amount_raw,
    //         'claim_count', bd.claim_count,
    //         'policy_count_earned', bd.policy_count_earned,
    //         'avg_premium_per_policy', bd.avg_premium_per_policy,
    //         'avg_loss_per_case', bd.avg_loss_per_case,
    //         'avg_commercial_index', bd.avg_commercial_index,
    //         'loss_ratio', bd.loss_ratio,
    //         'expense_ratio', bd.expense_ratio,
    //         'variable_cost_ratio', bd.variable_cost_ratio,
    //         'premium_earned_ratio', bd.premium_earned_ratio,
    //         'claim_frequency', bd.claim_frequency
    //     )) FROM your_business_data_table bd WHERE bd.period_id = p.period_id) AS business_data,
    //     (SELECT json_build_object(
    //         'total_premium_written_overall', t.total_premium_written_overall
    //     ) FROM your_period_totals_table t WHERE t.period_id = p.period_id) AS totals_for_period
    // FROM
    //     your_periods_table p
    // ORDER BY p.period_id;

    console.warn("DB: getAllV4DataFromDb is not yet implemented with actual DB queries. Returning empty array as placeholder.");
    // Simulate a delay for testing UI responsiveness
    // await new Promise(resolve => setTimeout(resolve, 1500)); 
    // Simulate an error for testing:
    // throw new Error("Simulated DB connection error. Please check your connection string and ensure the database server is running.");
    return []; // Placeholder: return empty array
}