
import { v4 as uuidv4 } from 'uuid';

const userId = '...'; // The user will replace this with the actual user_id
const priceId = '...'; // The user will replace this with the actual price_id
const subscriptionId = `sub_${uuidv4()}`;

const sql = `
INSERT INTO subscriptions (id, user_id, status, price_id, cancel_at_period_end, created, current_period_start, current_period_end)
VALUES ('${subscriptionId}', '${userId}', 'active', '${priceId}', false, NOW(), NOW(), NOW() + INTERVAL '1 year');
`;

console.log(sql);
