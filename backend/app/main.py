from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router


app = FastAPI()
app.add_middleware(
	CORSMiddleware,
	allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://twinmind-live-suggestions.vercel.app",  # replace with your actual Vercel URL
    ],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(router)