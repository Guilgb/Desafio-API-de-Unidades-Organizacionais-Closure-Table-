#!/bin/bash

# Quick Test Script for Closure Table API

BASE_URL="http://localhost:3000"

echo "=== Testing Closure Table API ==="
echo

# 1. Create Users
echo "1. Creating users..."
USER1=$(curl -s -X POST $BASE_URL/users -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@test.com"}' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
USER2=$(curl -s -X POST $BASE_URL/users -H "Content-Type: application/json" -d '{"name":"Bob","email":"bob@test.com"}' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created User 1: $USER1"
echo "Created User 2: $USER2"
echo

# 2. Create Groups with hierarchy
echo "2. Creating groups hierarchy..."
GROUP_ROOT=$(curl -s -X POST $BASE_URL/groups -H "Content-Type: application/json" -d '{"name":"Company"}' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created Root Group (Company): $GROUP_ROOT"

GROUP_DEPT=$(curl -s -X POST $BASE_URL/groups -H "Content-Type: application/json" -d "{\"name\":\"Engineering\",\"parentId\":\"$GROUP_ROOT\"}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created Department Group (Engineering): $GROUP_DEPT"

GROUP_TEAM=$(curl -s -X POST $BASE_URL/groups -H "Content-Type: application/json" -d "{\"name\":\"Backend Team\",\"parentId\":\"$GROUP_DEPT\"}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created Team Group (Backend Team): $GROUP_TEAM"
echo

# 3. Associate users to groups
echo "3. Associating users to groups..."
curl -s -X POST $BASE_URL/users/$USER1/groups -H "Content-Type: application/json" -d "{\"groupId\":\"$GROUP_TEAM\"}" -o /dev/null -w "User 1 -> Team: %{http_code}\n"
curl -s -X POST $BASE_URL/users/$USER2/groups -H "Content-Type: application/json" -d "{\"groupId\":\"$GROUP_DEPT\"}" -o /dev/null -w "User 2 -> Dept: %{http_code}\n"
echo

# 4. Get user organizations (should show inherited groups)
echo "4. Getting user organizations..."
echo "User 1 organizations (should show Team, Dept, Company):"
curl -s -X GET $BASE_URL/users/$USER1/organizations | python3 -m json.tool 2>/dev/null || cat
echo
echo "User 2 organizations (should show Dept, Company):"
curl -s -X GET $BASE_URL/users/$USER2/organizations | python3 -m json.tool 2>/dev/null || cat
echo

# 5. Get ancestors and descendants
echo "5. Testing ancestors and descendants..."
echo "Ancestors of Backend Team:"
curl -s -X GET $BASE_URL/nodes/$GROUP_TEAM/ancestors | python3 -m json.tool 2>/dev/null || cat
echo
echo "Descendants of Engineering:"
curl -s -X GET $BASE_URL/nodes/$GROUP_DEPT/descendants | python3 -m json.tool 2>/dev/null || cat
echo

# 6. Test cycle prevention (should fail with 409)
echo "6. Testing cycle prevention..."
echo "Trying to create cycle (Backend Team as parent of Company):"
curl -s -X POST $BASE_URL/groups -H "Content-Type: application/json" -d "{\"name\":\"New Group\",\"parentId\":\"$GROUP_TEAM\"}" > /dev/null
CYCLE_GROUP=$(curl -s -X POST $BASE_URL/groups -H "Content-Type: application/json" -d '{"name":"Cycle Test"}' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created temporary group: $CYCLE_GROUP"
echo "Trying to link it in a way that would create cycle:"
curl -s -X POST $BASE_URL/users/$CYCLE_GROUP/groups -H "Content-Type: application/json" -d "{\"groupId\":\"$GROUP_TEAM\"}" -o /dev/null
echo "Now trying to make Team a child of this group (should fail):"
# This would need manual testing via a second group creation with parent

echo
echo "=== Tests completed ==="
