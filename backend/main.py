from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import analyze, auth, admin

app = FastAPI(title="AI Resume Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analyze.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "AI Resume Analyzer API", "version": "1.0.0"}

