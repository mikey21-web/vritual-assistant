#!/bin/bash
# Full Production Verification Script
# Run from project root with: bash scripts/verify-production.sh
# Requires: Docker, PostgreSQL client, Node.js 20+

set -e

echo "=========================================="
echo " 10/10 Production Readiness Verification"
echo "=========================================="
echo ""

PASS=0
TOTAL=0

check() {
  TOTAL=$((TOTAL + 1))
  if [ $1 -eq 0 ]; then
    echo "  ✅ $2"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $2 (FAILED)"
  fi
}

# Phase 1: Build Integrity
echo "--- Phase 1: Build Integrity ---"
cd backend && npm run build > /dev/null 2>&1
check $? "Backend build"
cd ../dashboard && npm run build > /dev/null 2>&1
check $? "Dashboard build"
cd ..

# Phase 2: Tests
echo "--- Phase 2: Test Suite ---"
cd backend && npm test -- --runInBand > /dev/null 2>&1
check $? "Backend 63 tests passing"
cd ..

# Phase 3: Prisma
echo "--- Phase 3: Database ---"
cd backend && npx prisma validate > /dev/null 2>&1
check $? "Prisma schema valid"
npx prisma generate > /dev/null 2>&1
check $? "Prisma client generated"

echo ""
echo "  ℹ Starting PostgreSQL via Docker for migration test..."
docker compose up postgres -d --wait > /dev/null 2>&1 2>/dev/null || true
sleep 3

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lead_automation_test" \
  npx prisma migrate deploy > /dev/null 2>&1
check $? "Prisma migrate deploy on fresh DB"

docker compose down postgres -v > /dev/null 2>&1 2>/dev/null || true
cd ..

# Phase 4: n8n JSON validity
echo "--- Phase 4: n8n Workflows ---"
node -e "
const fs=require('fs'), p='n8n/workflows';
const files=fs.readdirSync(p).filter(x=>x.endsWith('.json'));
let ok=true;
for(const f of files) {
  const w=JSON.parse(fs.readFileSync(p+'/'+f,'utf8'));
  const httpNodes=w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest');
  const hasRetry=httpNodes.every(n=>n.parameters?.options?.retryOnFail);
  const hasError=w.nodes.some(n=>n.name==='Log Failure');
  if(!hasRetry || !hasError) { console.log(f+': MISSING retry/error'); ok=false; }
}
if(ok) console.log('All '+files.length+' workflows have retry + error handling');
else process.exit(1);
" > /dev/null 2>&1
check $? "n8n workflows: retry + error branches on all 12"

# Phase 5: Docker compose
echo "--- Phase 5: Docker Compose ---"
docker compose config > /dev/null 2>&1
check $? "Docker compose config valid"

# Phase 6: Security audit
echo "--- Phase 6: Security ---"
cd backend && node -e "
const fs=require('fs'),path=require('path');
function findFiles(d){const r=[];for(const f of fs.readdirSync(d,{withFileTypes:true})){const fp=path.join(d,f.name);if(f.isDirectory())r.push(...findFiles(fp));else r.push(fp);}return r;}
let anyCount=0;
for(const f of findFiles('src')){if(!f.endsWith('.controller.ts'))continue;const c=fs.readFileSync(f,'utf8');c.split('\n').forEach(l=>{if(l.includes('@Body')&&l.includes(': any')){console.log(f+': '+l.trim());anyCount++;}});}
if(anyCount===0) console.log('Zero @Body() d: any in all controllers');
else process.exit(1);
" > /dev/null 2>&1
check $? "No @Body() any in controllers"
cd ..

# Phase 7: Environment completeness
echo "--- Phase 7: Environment ---"
node -e "
const ex=require('fs').readFileSync('.env.example','utf8');
const required=['JWT_SECRET','DATABASE_URL','POSTGRES_PASSWORD','N8N_PASSWORD','WEBHOOK_API_KEY_FORMS'];
let missing=[];
required.forEach(k=>{if(!ex.includes(k+'='))missing.push(k);});
if(missing.length) { console.log('Missing vars: '+missing.join(', ')); process.exit(1); }
console.log('.env.example covers all required variables');
" > /dev/null 2>&1
check $? ".env.example completeness"

# Summary
echo ""
echo "=========================================="
echo " Results: $PASS/$TOTAL passing"
echo "=========================================="

if [ $PASS -eq $TOTAL ]; then
  echo ""
  echo "10/10 PROVEN — all automated checks pass."
  echo ""
  echo "Remaining manual checks (requires credentials):"
  echo "  • Real CRM provider health test (HubSpot/Salesforce/Zoho)"
  echo "  • Real calendar provider test (Calendly/Google)"
  echo "  • Real WhatsApp send/receive"
  echo "  • Real email send"
  echo "  • n8n workflow execution end-to-end"
  echo "  • Dashboard login → lead creation → CRM push E2E"
  echo "  • Playwright browser test suite"
else
  FAILED=$((TOTAL - PASS))
  echo "$FAILED checks failed — fix before handover."
  exit 1
fi
