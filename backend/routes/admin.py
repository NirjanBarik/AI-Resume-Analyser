from fastapi import APIRouter, Depends, HTTPException
from db import users_collection, resumes_collection
from routes.auth import get_current_user
from collections import Counter
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user=Depends(get_current_user)):
    record = users_collection.find_one({"email": user["email"]})
    if not record or record.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
def get_stats(user=Depends(require_admin)):
    total_users = users_collection.count_documents({})
    total_resumes = resumes_collection.count_documents({})
    scores = [r.get("score", 0) for r in resumes_collection.find({}, {"score": 1})]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0

    # Score distribution buckets
    buckets = {"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}
    for s in scores:
        if s <= 25:
            buckets["0-25"] += 1
        elif s <= 50:
            buckets["26-50"] += 1
        elif s <= 75:
            buckets["51-75"] += 1
        else:
            buckets["76-100"] += 1

    # Activity last 7 days
    since = datetime.utcnow() - timedelta(days=7)
    recent_resumes = resumes_collection.count_documents({"created_at": {"$gte": since}})
    recent_users = users_collection.count_documents({"created_at": {"$gte": since}})

    return {
        "total_users": total_users,
        "total_resumes": total_resumes,
        "average_score": avg_score,
        "score_distribution": buckets,
        "recent_resumes_7d": recent_resumes,
        "new_users_7d": recent_users,
    }


@router.get("/skill-demand")
def skill_demand(user=Depends(require_admin)):
    """Return top matched and top missing skills across all resumes."""
    matched_counter: Counter = Counter()
    missing_counter: Counter = Counter()

    for doc in resumes_collection.find({}, {"matched_skills": 1, "missing_skills": 1}):
        matched_counter.update(doc.get("matched_skills", []))
        missing_counter.update(doc.get("missing_skills", []))

    return {
        "top_matched": matched_counter.most_common(15),
        "top_missing": missing_counter.most_common(15),
    }


@router.get("/users")
def list_users(user=Depends(require_admin)):
    docs = list(users_collection.find({}, {"password": 0}).sort("created_at", -1).limit(50))
    for d in docs:
        d["_id"] = str(d["_id"])
        if "created_at" in d:
            d["created_at"] = d["created_at"].isoformat()
    return docs


@router.get("/resumes")
def list_resumes(user=Depends(require_admin)):
    docs = list(resumes_collection.find({}, {"resume_text": 0}).sort("created_at", -1).limit(50))
    for d in docs:
        d["_id"] = str(d["_id"])
        if "created_at" in d:
            d["created_at"] = d["created_at"].isoformat()
    return docs

