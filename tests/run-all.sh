#!/bin/bash
# اجرا: bash tests/run-all.sh — اگر هر آزمون شکست بخورد، کل اجرا با کد غیرصفر تمام می‌شود.
# نیاز: node، python3، playwright+chromium، Pillow با raqm، fontTools
set -uo pipefail
cd "$(dirname "$0")/.."
PORT=8765
if (exec 3<>/dev/tcp/127.0.0.1/$PORT) 2>/dev/null; then echo "FAILED: پورت $PORT از قبل در حال استفاده است"; exit 2; fi
python3 -m http.server $PORT >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null' EXIT
for i in $(seq 1 50); do (exec 3<>/dev/tcp/127.0.0.1/$PORT) 2>/dev/null && break; sleep 0.1; done
kill -0 $SRV 2>/dev/null || { echo "FAILED: سرور آزمایشی راه‌اندازی نشد"; exit 2; }
fail=0
for t in "node tests/test-font.js" "node tests/test-engine.js" "node tests/test-grid.js" "python3 tests/shape.py" "python3 tests/ui-smoke.py" "python3 tests/ui-pipeline.py" "python3 tests/sheet-photo.py"; do
  echo "=== $t"
  out=$($t 2>&1); rc=$?
  printf '%s\n' "$out" | grep -v '^  ' || true
  if [ $rc -ne 0 ]; then echo "FAILED (exit $rc): $t"; fail=1; fi
done
[ $fail -eq 0 ] && echo "ALL TESTS PASSED" || echo "SOME TESTS FAILED"
exit $fail
