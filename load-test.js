import http from 'k6/http';
import { check, sleep } from 'k6';

// Test Configuration: Ramp up from 0 to 1,000 users
export const options = {
    stages: [
        { duration: '30s', target: 100 },   // Warm-up to 100 users
        { duration: '1m', target: 500 },   // Ramp up to 500 users
        { duration: '2m', target: 1000 },  // Hold at 1,000 concurrent users
        { duration: '30s', target: 0 },     // Cool down to 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],     // Fail if error rate > 1%
        http_req_duration: ['p(95)<500'],   // 95% of requests must complete under 500ms
    },
};

const BASE_URL = 'http://localhost:8080'; // Change to your live backend URL if testing production

export default function () {
    // 1. Simulate User Login
    const loginPayload = JSON.stringify({
        email: 'agent@helpdesk.com',
        password: 'password123',
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' },
    });

    check(loginRes, {
        'login succeeded (200)': (r) => r.status === 200,
    });

    const token = loginRes.json('accessToken');
    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    // 2. Fetch Tickets (Read query)
    const ticketsRes = http.get(`${BASE_URL}/ticket?page=0&size=20`, { headers: authHeaders });
    check(ticketsRes, {
        'tickets fetched (200)': (r) => r.status === 200,
    });

    // 3. Fetch Dashboard Metrics
    const metricsRes = http.get(`${BASE_URL}/ticket/dashboard`, { headers: authHeaders });
    check(metricsRes, {
        'metrics fetched (200)': (r) => r.status === 200,
    });

    // 4. Simulate reading and think time (realistic user pause between actions)
    sleep(1);
}
