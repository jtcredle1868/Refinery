"""End-to-end API test script for Refinery backend."""
import os
import sys
import json
import time
import subprocess
import signal
import requests

BASE = "http://localhost:8000/api/v1"
PASS = 0
FAIL = 0


def check(condition, label, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS - {label} {detail}")
    else:
        FAIL += 1
        print(f"  FAIL - {label} {detail}")


def main():
    global PASS, FAIL

    print("=" * 50)
    print("  REFINERY API - End-to-End Test Suite")
    print("=" * 50)

    # 1. Health
    print("\n--- Health ---")
    r = requests.get(f"{BASE}/health")
    check(r.status_code == 200 and r.json()["status"] == "healthy", "Health check")

    # 2. Register
    print("\n--- Auth: Register ---")
    r = requests.post(f"{BASE}/auth/register", json={
        "email": "demo@refinery.io", "password": "demopass123",
        "full_name": "Demo User", "tier": "indie_pro"
    })
    data = r.json()
    check(data["success"] and data["data"]["user"]["email"] == "demo@refinery.io", "Register",
          f"user={data['data']['user']['email']}")
    token = data["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Login
    print("\n--- Auth: Login ---")
    r = requests.post(f"{BASE}/auth/login", json={"email": "demo@refinery.io", "password": "demopass123"})
    data = r.json()
    check(data["success"], "Login")

    # 4. Get Me
    print("\n--- Auth: Get Me ---")
    r = requests.get(f"{BASE}/auth/me", headers=headers)
    data = r.json()
    check(data["success"] and data["data"]["email"] == "demo@refinery.io", "Get Me",
          f"name={data['data']['full_name']} tier={data['data']['tier']}")

    # 5. Upload
    print("\n--- Manuscripts: Upload ---")
    sample_path = "/tmp/sample_manuscript.txt"
    if not os.path.exists(sample_path):
        with open(sample_path, "w") as f:
            f.write("""Chapter 1: The Beginning

Eleanor Voss stood at the edge of the courtyard, watching the morning sun cast long shadows.

"I never thought it would come to this," Eleanor said quietly.

Marcus Chen appeared at the doorway. "You don't understand what's at stake here," Marcus replied.

Dr. Sarah Webb watched from her office window above. "Fascinating," she murmured.

Chapter 2: The Discovery

The library was dark and silent when Eleanor arrived. She started to wonder if she had made a mistake.

She felt sad when she realized how much time had been wasted. It was very clear.

James Hartley was already inside. "I wasn't expecting company," James said.

The town was beautiful in autumn. Leaves drifted past the library windows.

Chapter 3: The Confrontation

Marcus stood before the committee. Lily Moreau sat at the far end of the table.

"Listen to me," Marcus began. "Mark my words."

"With all due respect," Dr. Webb interjected, "your conclusions are premature."

She was angry about what had happened. The sound echoed through the chamber.

"Here's the deal," Lily said. "Bottom line — we need more time."

Chapter 4: The Revelation

Eleanor sat alone, surrounded by papers. "I suppose I should have seen it sooner," she murmured.

Marcus called that evening. "I owe you an apology," he said.

"We start over," Eleanor said. "We get it right this time."

And so they did.
""")

    with open(sample_path, "rb") as f:
        r = requests.post(f"{BASE}/manuscripts", headers=headers,
                          files={"file": ("sample_manuscript.txt", f, "text/plain")},
                          data={"title": "The Discovery - A Novel"})
    data = r.json()
    check(data["success"] and data["data"]["word_count"] > 0, "Upload",
          f"words={data['data']['word_count']} chapters={data['data']['chapter_count']}")
    mid = data["data"]["id"]

    # 6. List
    print("\n--- Manuscripts: List ---")
    r = requests.get(f"{BASE}/manuscripts", headers=headers)
    data = r.json()
    check(data["success"] and len(data["data"]) > 0, "List manuscripts", f"count={len(data['data'])}")

    # 7. Get Status
    print("\n--- Manuscripts: Status ---")
    r = requests.get(f"{BASE}/manuscripts/{mid}/status", headers=headers)
    data = r.json()
    check(data["success"], "Get status", f"status={data['data']['status']}")

    # 8. Analyze
    print("\n--- Analysis: Full ---")
    r = requests.post(f"{BASE}/manuscripts/{mid}/analyze", headers=headers, json={})
    data = r.json()
    check(data["success"] and len(data["data"]["modules_completed"]) == 6, "Full analysis",
          f"modules={len(data['data']['modules_completed'])}")

    # 9. Each Module
    print("\n--- Analysis: Module Results ---")
    modules = ["manuscript_intelligence", "voice_isolation", "pacing_architect",
               "character_arc", "prose_refinery", "revision_command"]
    for mod in modules:
        r = requests.get(f"{BASE}/manuscripts/{mid}/analysis/{mod}", headers=headers)
        data = r.json()
        has_data = data["success"] and data["data"] is not None
        scores = data["data"].get("scores", {}) if has_data else {}
        check(has_data, f"Module: {mod}", f"overall_score={scores.get('overall', 'N/A')}")

    # 10. All Results
    print("\n--- Analysis: All Results ---")
    r = requests.get(f"{BASE}/manuscripts/{mid}/analysis", headers=headers)
    data = r.json()
    check(data["success"] and len(data["data"]) >= 6, "All results", f"modules={len(data['data'])}")

    # 11. Edit Queue
    print("\n--- Revision: Edit Queue ---")
    r = requests.get(f"{BASE}/manuscripts/{mid}/edit-queue", headers=headers)
    data = r.json()
    check(data["success"] and len(data["data"]) > 0, "Edit queue", f"items={len(data['data'])}")
    items = data["data"]

    # 12. Accept/Reject
    print("\n--- Revision: Update Items ---")
    if items:
        r = requests.patch(f"{BASE}/manuscripts/{mid}/edit-queue/{items[0]['id']}",
                           headers=headers, json={"status": "ACCEPTED"})
        data = r.json()
        check(data["success"] and data["data"]["status"] == "ACCEPTED", "Accept item")

        if len(items) > 1:
            r = requests.patch(f"{BASE}/manuscripts/{mid}/edit-queue/{items[1]['id']}",
                               headers=headers, json={"status": "REJECTED"})
            data = r.json()
            check(data["success"] and data["data"]["status"] == "REJECTED", "Reject item")

    # 13. Export DOCX
    print("\n--- Export: DOCX ---")
    r = requests.post(f"{BASE}/manuscripts/{mid}/export", headers=headers,
                      json={"format": "docx", "report_type": "analysis"})
    check(r.status_code == 200 and len(r.content) > 100, "Export DOCX", f"size={len(r.content)} bytes")
    with open("/tmp/refinery_report.docx", "wb") as f:
        f.write(r.content)

    # 14. Export PDF
    print("\n--- Export: PDF ---")
    r = requests.post(f"{BASE}/manuscripts/{mid}/export", headers=headers,
                      json={"format": "pdf", "report_type": "analysis"})
    check(r.status_code == 200 and len(r.content) > 100, "Export PDF", f"size={len(r.content)} bytes")
    with open("/tmp/refinery_report.pdf", "wb") as f:
        f.write(r.content)

    # 15. Reader Report
    print("\n--- Export: Reader Report ---")
    r = requests.post(f"{BASE}/manuscripts/{mid}/reports/reader", headers=headers)
    check(r.status_code == 200 and len(r.content) > 100, "Reader Report PDF", f"size={len(r.content)} bytes")
    with open("/tmp/refinery_reader_report.pdf", "wb") as f:
        f.write(r.content)

    # 16. Delete
    print("\n--- Manuscripts: Delete ---")
    r = requests.delete(f"{BASE}/manuscripts/{mid}", headers=headers)
    data = r.json()
    check(data["success"], "Delete manuscript")

    # Summary
    print("\n" + "=" * 50)
    total = PASS + FAIL
    print(f"  Results: {PASS}/{total} PASSED, {FAIL}/{total} FAILED")
    if FAIL == 0:
        print("  ALL TESTS PASSED!")
    print("=" * 50)

    return FAIL == 0


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
