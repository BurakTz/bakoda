import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Custom metrics
const bookingDuration = new Trend("booking_duration");
const errorRate = new Rate("error_rate");

// Kısa CI profili (K6_PROFILE=ci) ~35sn; aksi halde mevcut 2 dakikalık profil.
const CI_PROFILE = __ENV.K6_PROFILE === "ci";

const stages = CI_PROFILE
  ? [
      { duration: "10s", target: 10 },   // ramp up (CI)
      { duration: "20s", target: 20 },   // sustained load (CI)
      { duration: "5s",  target: 0 },    // ramp down (CI)
    ]
  : [
      { duration: "30s", target: 10 },   // ramp up
      { duration: "1m",  target: 50 },   // sustained load
      { duration: "30s", target: 0 },    // ramp down
    ];

export const options = {
  stages,
  thresholds: {
    http_req_duration: ["p(95)<500"],   // p95 < 500ms — her iki profilde de geçerli (kapı)
    error_rate: ["rate<0.05"],          // error rate < 5% — her iki profilde de geçerli (kapı)
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
