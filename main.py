from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from typing import Optional, Literal
import random
import secrets

app = FastAPI(title="CityCare Grid — Indore Connected Hospital")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

engine = create_engine("sqlite:///citycare.db", echo=False, future=True)

# -------------------------
# DB SCHEMA (new + existing)
# -------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS facilities(
  id TEXT PRIMARY KEY, name TEXT, type TEXT, lat REAL, lon REAL,
  district TEXT, contact TEXT
);
CREATE TABLE IF NOT EXISTS beds(
  facility_id TEXT, type TEXT, total INTEGER, available INTEGER, updated_at TEXT,
  PRIMARY KEY (facility_id, type)
);
CREATE TABLE IF NOT EXISTS incidents(
  id TEXT PRIMARY KEY, lat REAL, lon REAL, severity INTEGER, type TEXT,
  status TEXT, started_at TEXT
);
CREATE TABLE IF NOT EXISTS ambulances(
  id TEXT PRIMARY KEY, lat REAL, lon REAL, status TEXT, updated_at TEXT
);

-- NEW: users (very simple role login with PIN, demo only)
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, name TEXT, role TEXT, pin TEXT
);

-- NEW: patients + reports (dashboard)
CREATE TABLE IF NOT EXISTS patients(
  id TEXT PRIMARY KEY, name TEXT, dob TEXT, phone TEXT, primary_facility_id TEXT
);
CREATE TABLE IF NOT EXISTS reports(
  id TEXT PRIMARY KEY, patient_id TEXT, title TEXT, url TEXT, created_at TEXT
);

-- NEW: scheduling
CREATE TABLE IF NOT EXISTS appointments(
  id TEXT PRIMARY KEY, patient_id TEXT, facility_id TEXT,
  kind TEXT, slot TEXT, status TEXT, created_at TEXT
);

-- NEW: consent sharing (data-sharing permissions)
CREATE TABLE IF NOT EXISTS consents(
  id TEXT PRIMARY KEY, patient_id TEXT, target TEXT, -- 'pharmacy','clinic','hospital'
  scope TEXT, granted INTEGER, updated_at TEXT
);

-- NEW: notifications/alerts
CREATE TABLE IF NOT EXISTS alerts(
  id TEXT PRIMARY KEY, audience TEXT, title TEXT, body TEXT, severity TEXT,
  created_at TEXT, read INTEGER DEFAULT 0
);

-- NEW: IoT readings
CREATE TABLE IF NOT EXISTS device_readings(
  id TEXT PRIMARY KEY, device_id TEXT, patient_id TEXT,
  metric TEXT, value REAL, unit TEXT, recorded_at TEXT
);
"""

def now(): return datetime.utcnow().isoformat()

def seed_indore():
    rnd_lat = lambda: round(random.uniform(22.67, 22.80), 6)
    rnd_lon = lambda: round(random.uniform(75.78, 75.98), 6)
    facilities = [
        ("IND_HSP_001","Indore General","hospital", rnd_lat(), rnd_lon(),"South","+91-731-2000001"),
        ("IND_HSP_002","Vijay Nagar Care","hospital", rnd_lat(), rnd_lon(),"East","+91-731-2000002"),
        ("IND_HSP_003","Rajwada Clinic","clinic", rnd_lat(), rnd_lon(),"Central","+91-731-2000003"),
        ("IND_HSP_004","MR-10 Trauma Center","hospital", rnd_lat(), rnd_lon(),"North","+91-731-2000004"),
    ]
    bed_types = ["icu","oxygen","general"]
    incidents = [
        ("IND_INC_901", rnd_lat(), rnd_lon(), 4, "cardiac", "active", now()),
        ("IND_INC_902", rnd_lat(), rnd_lon(), 2, "trauma", "unconfirmed", now()),
    ]
    ambulances = [
        ("AMB_1", rnd_lat(), rnd_lon(), "enroute", now()),
        ("AMB_2", rnd_lat(), rnd_lon(), "idle", now()),
    ]
    users = [
        ("USR_PAT_001","Asha","patient","1111"),
        ("USR_DOC_001","Dr. Meera","doctor","2222"),
        ("USR_NUR_001","Nurse Ravi","nurse","3333"),
        ("USR_PHA_001","Pharma Kiosk","pharmacist","4444"),
        ("USR_ADM_001","Admin","admin","5555"),
    ]
    patients = [
        ("PAT_001","Asha","2001-04-11","+91-90000-11111","IND_HSP_001"),
        ("PAT_002","Raghav","1998-10-05","+91-90000-22222","IND_HSP_002"),
    ]
    reports = [
        ("RPT_001","PAT_001","CBC report","https://example.com/cbc.pdf", now()),
        ("RPT_002","PAT_001","X-Ray Chest","https://example.com/xray.pdf", now()),
    ]
    appts = [
        ("APT_001","PAT_001","IND_HSP_001","doctor_visit","2025-11-02T10:00","booked", now()),
        ("APT_002","PAT_002","IND_HSP_002","lab_test","2025-11-03T09:00","booked", now()),
    ]
    consents = [
        ("CON_001","PAT_001","pharmacy","medication-history",1, now()),
        ("CON_002","PAT_001","clinic","reports",0, now()),
    ]
    alerts = [
        ("ALT_001","patient:PAT_001","Medicine Reminder","Take Atorvastatin 10mg at 9PM","info", now(),0),
        ("ALT_002","role:doctor","ER Load High","ICU beds < 3 at Indore General","warning", now(),0),
    ]

    with engine.begin() as c:
        for t in ["facilities","beds","incidents","ambulances","users",
                  "patients","reports","appointments","consents","alerts","device_readings"]:
            c.execute(text(f"DELETE FROM {t}"))
        c.execute(text("INSERT INTO facilities VALUES (:id,:n,:t,:lat,:lon,:d,:c)"),
                  [dict(id=a,n=b,t=c1,lat=d,lon=e,d=f,c=g) for (a,b,c1,d,e,f,g) in facilities])
        c.execute(text("INSERT INTO incidents VALUES (:id,:lat,:lon,:sev,:typ,:s,:st)"),
                  [dict(id=a,lat=b,lon=c1,sev=d,typ=e,s=f,st=g) for (a,b,c1,d,e,f,g) in incidents])
        c.execute(text("INSERT INTO ambulances VALUES (:id,:lat,:lon,:s,:u)"),
                  [dict(id=a,lat=b,lon=c1,s=d,u=e) for (a,b,c1,d,e) in ambulances])
        # beds
        rows=[]
        for fid, *_ in facilities:
            for bt in bed_types:
                tot=random.randint(10,40); avail=random.randint(0,tot)
                rows.append(dict(facility_id=fid,type=bt,total=tot,available=avail,updated_at=now()))
        c.execute(text("INSERT INTO beds VALUES (:facility_id,:type,:total,:available,:updated_at)"), rows)
        # users/patients/reports/appts/consents/alerts
        c.execute(text("INSERT INTO users VALUES (:id,:n,:r,:p)"),
                  [dict(id=i,n=n,r=r,p=p) for (i,n,r,p) in users])
        c.execute(text("INSERT INTO patients VALUES (:id,:n,:dob,:ph,:pf)"),
                  [dict(id=i,n=n,dob=dob,ph=ph,pf=pf) for (i,n,dob,ph,pf) in patients])
        c.execute(text("INSERT INTO reports VALUES (:id,:pid,:t,:url,:ca)"),
                  [dict(id=i,pid=pid,t=tit,url=url,ca=ca) for (i,pid,tit,url,ca) in reports])
        c.execute(text("INSERT INTO appointments VALUES (:id,:pid,:fid,:k,:slot,:st,:ca)"),
                  [dict(id=i,pid=pid,fid=fid,k=k,slot=slot,st=st,ca=ca) for (i,pid,fid,k,slot,st,ca) in appts])
        c.execute(text("INSERT INTO consents VALUES (:id,:pid,:target,:scope,:g,:u)"),
                  [dict(id=i,pid=pid,target=tar,scope=sc,g=g,u=u) for (i,pid,tar,sc,g,u) in consents])
        c.execute(text("INSERT INTO alerts VALUES (:id,:aud,:title,:body,:sev,:ca,:rd)"),
                  [dict(id=i,aud=aud,title=t,body=b,sev=sev,ca=ca,rd=rd) for (i,aud,t,b,sev,ca,rd) in alerts])

with engine.begin() as conn:
    for stmt in SCHEMA_SQL.split(";"):
        if stmt.strip(): conn.exec_driver_sql(stmt)
    seed_indore()

# -------------------------
# SIMPLE AUTH (PIN login)
# -------------------------
class LoginReq(BaseModel):
    user_id: str
    pin: str

@app.post("/auth/login")
def login(p: LoginReq):
    with engine.begin() as c:
        row = c.execute(text("SELECT id,name,role FROM users WHERE id=:i AND pin=:p"),
                        {"i": p.user_id, "p": p.pin}).mappings().first()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    # demo token
    token = "tok_" + secrets.token_hex(8)
    return {"token": token, "user": row}  # store role on frontend

# -------------------------
# MAP STATE (unchanged)
# -------------------------
class BedUpdate(BaseModel):
    facility_id: str
    type: str
    available: int

@app.get("/state")
def get_state():
    with engine.begin() as c:
        facs = [dict(r) for r in c.execute(text("SELECT * FROM facilities")).mappings()]
        beds = [dict(r) for r in c.execute(text("SELECT * FROM beds")).mappings()]
        incs = [dict(r) for r in c.execute(text("SELECT * FROM incidents")).mappings()]
        ambs = [dict(r) for r in c.execute(text("SELECT * FROM ambulances")).mappings()]
    return {"facilities":facs,"beds":beds,"incidents":incs,"ambulances":ambs}

@app.post("/beds/update")
def update_beds(p: BedUpdate):
    with engine.begin() as c:
        c.execute(text("UPDATE beds SET available=:a,updated_at=:u WHERE facility_id=:f AND type=:t"),
                  {"a": p.available, "u": now(), "f": p.facility_id, "t": p.type})
    return {"ok": True}

# -------------------------
# PATIENT DASHBOARD
# -------------------------
@app.get("/patients/{patient_id}")
def patient(patient_id: str):
    with engine.begin() as c:
        p = c.execute(text("SELECT * FROM patients WHERE id=:i"), {"i": patient_id}).mappings().first()
        if not p: raise HTTPException(404, "Patient not found")
        reps = [dict(r) for r in c.execute(text("SELECT * FROM reports WHERE patient_id=:i"), {"i": patient_id}).mappings()]
        appts = [dict(r) for r in c.execute(text("SELECT * FROM appointments WHERE patient_id=:i ORDER BY slot DESC"), {"i": patient_id}).mappings()]
        cons = [dict(r) for r in c.execute(text("SELECT * FROM consents WHERE patient_id=:i"), {"i": patient_id}).mappings()]
    return {"patient": p, "reports": reps, "appointments": appts, "consents": cons}

# -------------------------
# SMART SCHEDULING
# -------------------------
class ApptReq(BaseModel):
    patient_id: str
    facility_id: str
    kind: Literal["doctor_visit","lab_test"]
    slot: str  # ISO timestamp

@app.post("/appointments/create")
def appt_create(p: ApptReq):
    appt_id = "APT_" + secrets.token_hex(4).upper()
    with engine.begin() as c:
        c.execute(text("INSERT INTO appointments VALUES (:id,:pid,:fid,:k,:slot,:st,:ca)"),
                  {"id": appt_id, "pid": p.patient_id, "fid": p.facility_id, "k": p.kind,
                   "slot": p.slot, "st": "booked", "ca": now()})
        # auto-notify patient
        c.execute(text("INSERT INTO alerts VALUES (:id,:aud,:t,:b,:sev,:ca,0)"),
                  {"id":"ALT_"+secrets.token_hex(4), "aud":f"patient:{p.patient_id}",
                   "t":"Appointment Confirmed", "b":f"{p.kind} at {p.slot}", "sev":"info", "ca":now()})
    return {"ok": True, "id": appt_id}

# -------------------------
# DATA SHARING (CONSENTS)
# -------------------------
class ConsentReq(BaseModel):
    patient_id: str
    target: Literal["pharmacy","clinic","hospital"]
    scope: str
    granted: bool

@app.post("/consents/set")
def consent_set(p: ConsentReq):
    cid = "CON_" + secrets.token_hex(4).upper()
    with engine.begin() as c:
        c.execute(text("INSERT INTO consents VALUES (:id,:pid,:t,:sc,:g,:u)"),
                  {"id":cid,"pid":p.patient_id,"t":p.target,"sc":p.scope,"g":1 if p.granted else 0,"u":now()})
    return {"ok": True, "id": cid}

# -------------------------
# ALERTS & NOTIFICATIONS
# -------------------------
@app.get("/alerts/poll")
def alerts_poll(audience: str, since: Optional[str] = None):
    """
    audience can be:
      - role:doctor / role:nurse / role:pharmacist / role:admin
      - patient:PAT_001   (for patient-specific alerts)
    """
    with engine.begin() as c:
        if since:
            rows = c.execute(text("SELECT * FROM alerts WHERE created_at > :s AND audience=:a ORDER BY created_at DESC"),
                             {"s": since, "a": audience}).mappings().all()
        else:
            rows = c.execute(text("SELECT * FROM alerts WHERE audience=:a ORDER BY created_at DESC LIMIT 20"),
                             {"a": audience}).mappings().all()
    return {"items": [dict(r) for r in rows], "now": now()}

# -------------------------
# IoT / AUTOMATION ADD-ON
# -------------------------
class Reading(BaseModel):
    device_id: str
    patient_id: str
    metric: Literal["spo2","hr","bp_sys","bp_dia","temp"]
    value: float
    unit: str

@app.post("/devices/ingest")
def ingest(r: Reading):
    rid = "DEV_" + secrets.token_hex(4).upper()
    with engine.begin() as c:
        c.execute(text("INSERT INTO device_readings VALUES (:id,:dev,:pid,:m,:v,:u,:ts)"),
                  {"id":rid,"dev":r.device_id,"pid":r.patient_id,"m":r.metric,"v":r.value,"u":r.unit,"ts":now()})
        # simple rule → create alert if out of range
        alert = None
        if r.metric=="spo2" and r.value<90:
            alert=("Low SpO₂", f"SpO₂={r.value}% for patient {r.patient_id}", "critical")
        if r.metric=="hr" and (r.value<45 or r.value>130):
            alert=("Abnormal Heart Rate", f"HR={r.value} bpm for patient {r.patient_id}", "warning")
        if alert:
            c.execute(text("INSERT INTO alerts VALUES (:id,:aud,:t,:b,:sev,:ca,0)"),
                      {"id":"ALT_"+secrets.token_hex(4), "aud":"role:doctor", "t":alert[0],
                       "b":alert[1], "sev":alert[2], "ca":now()})
    return {"ok": True, "id": rid}
