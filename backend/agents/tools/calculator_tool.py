from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class CalculatorRequest(BaseModel):
    expression: str

@app.post("/agent/calculator_tool")
def handle_calculation(req: CalculatorRequest):
    try:
        result = eval(req.expression, {"__builtins__": {}})
        return {"result": str(result)}
    except Exception as e:
        return {"result": f"Error: {e}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("calculator_tool:app", host="0.0.0.0", port=8001, reload=True)