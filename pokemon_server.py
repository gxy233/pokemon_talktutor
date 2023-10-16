from fastapi import FastAPI, UploadFile, File, HTTPException,Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Set, List, Dict
from agentverse.agentverse import AgentVerse
from agentverse.message import Message
from audio.audio2text import audio_to_text


class UserRequest(BaseModel):
    content: str = Field(default="")
    sender: str = Field(default="Brendan")
    receiver: str
    receiver_id: int


class UserRequest_(BaseModel):
    sender: str = "Brendan"
    receiver: str
    receiver_id: int



class RoutineRequest(BaseModel):
    agent_ids: List[int]


class UpdateRequest(BaseModel):
    agent_locations: Dict[str, str]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent_verse = AgentVerse.from_task("pokemon")


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/chat")
def chat(message: UserRequest):
    content = message.content
    receiver = message.receiver
    receiver_id = message.receiver_id
    response = agent_verse.next(
        is_player=True,
        player_content=content,
        receiver=receiver,
        receiver_id=receiver_id,
    )
    return response[0].dict()


@app.post("/make_decision")
def update(message: RoutineRequest):
    response = agent_verse.next(is_player=False, agent_ids=message.agent_ids)
    return [r.dict() for r in response]
    # import json

    # return [
    #     # {
    #     #     "content": json.dumps(
    #     #         {
    #     #             "to": "Maxie",
    #     #             "action": "Speak",
    #     #             "text": "Hello Hello Hello Hello Hello Hello",
    #     #         }
    #     #     )
    #     # }
    #     {"content": json.dumps({"to": "Pokémon Center", "action": "MoveTo"})}
    # ]


@app.post("/update_location")
def update_location(message: UpdateRequest):
    agent_verse.update_state(message.agent_locations)

@app.post("/record_log")
def record_log(    
    file: UploadFile = File(...),
    sender: str = Form(...),
    receiver: str = Form(...),
    receiver_id: int = Form(...)):
    print("in record_log")
    try:
        # 保存音频文件
        file_location = f"/home/ubuntu/gxy/AgentVerse/audio/{file.filename}"

        file_content = file.file.read()  # 读取文件内容
        file_size = len(file_content)    # 获取文件大小

        print(f'File size: {file_size} bytes')

        with open(file_location, "wb") as buffer:
            buffer.write(file_content)

        # 使用Whisper模型将音频转换为文本
        recognized_text = audio_to_text(file_location)
        
        content = recognized_text
        receiver = receiver
        receiver_id = receiver_id
        response = agent_verse.next(
            is_player=True,
            player_content=content,
            receiver=receiver,
            receiver_id=receiver_id,
        )
        print(f'tttttttttttttt {response[0].dict()=}')
        return response[0].dict()
        
        # return {"recognized_text": recognized_text}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
