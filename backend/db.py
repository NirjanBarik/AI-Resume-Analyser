import os
from pymongo import MongoClient

mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client["resume_analyzer"]

users_collection = db["users"]
resumes_collection = db["resumes"]
