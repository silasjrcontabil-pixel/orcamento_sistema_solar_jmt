from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, budgets, client_lookup, clients, dashboard, geo, products, users
from app.services.reference_data import load_reference_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Carrega municipios_geo.json e monta o cKDTree de irradiância uma única vez, mantendo em
    # memória durante toda a vida do processo (não entram no Postgres — são estáticos).
    load_reference_data()
    yield


app = FastAPI(title="JMT Solar - Sistema de Orçamentos", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(geo.router)
app.include_router(clients.router)
app.include_router(client_lookup.router)
app.include_router(products.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}
