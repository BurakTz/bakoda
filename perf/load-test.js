import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Custom metrics
const bookingDuration = new Trend("booking_duration");
const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // ramp up
    { duration: "1m",  target: 50 },   // sustained load
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],   // p95 < 500ms
    error_rate: ["rate<0.05"],          // error rate < 5%
  },
};

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { "health ok": (r) => r.status === 200 });

  // 2. List available rooms
  const roomsRes = http.get(`${BASE_URL}/api/rooms?check_in=2027-07-01&check_out=2027-07-05`);
  const roomsOk = check(roomsRes, {
    "rooms status 200": (r) => r.status === 200,
    "rooms is array": (r) => Array.isArray(r.json()),
  });
  errorRate.add(!roomsOk);

  if (!roomsOk || roomsRes.json().length === 0) {
    sleep(1);
    return;
  }

  const roomId = roomsRes.json()[0].id;

  // 3. Create booking
  const payload = JSON.stringify({
    room_id: roomId,
    guest_name: `Guest ${__VU}-${__ITER}`,
    guest_email: `guest${__VU}${__ITER}@test.com`,
    check_in: `2027-0${((__VU % 9) + 1)}-01`,
    check_out: `2027-0${((__VU % 9) + 1)}-05`,
  });

  const bookingStart = Date.now();
  const bookingRes = http.post(`${BASE_URL}/api/bookings`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  bookingDuration.add(Date.now() - bookingStart);

  const bookingCreated = check(bookingRes, {
    "booking created or conflict": (r) => r.status === 201 || r.status === 409,
  });
  errorRate.add(!bookingCreated);

  // 4. Cancel if just created
  if (bookingRes.status === 201) {
    const bookingId = bookingRes.json().id;
    const cancelRes = http.patch(`${BASE_URL}/api/bookings/${bookingId}/cancel`);
    check(cancelRes, { "cancel ok": (r) => r.status === 200 });
  }

  sleep(1);
}
