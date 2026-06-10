from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User, UserRole
from models.workspace import Workspace
from models.conversation import Conversation
from schemas.chat import ChatRequest, ChatResponse, ConversationResponse
from utils.auth_utils import get_current_user
from utils.rag_engine import rag_engine
from utils.groq_client import groq_client, MODEL_CONFIG, SYSTEM_PROMPT

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Ownership check
    workspace = await db.get(Workspace, request.workspace_id)
    if not workspace or (
        workspace.user_id != current_user.id
        and current_user.role != UserRole.admin
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    # 2. Retrieve top-k relevant chunks; use 10 for better coverage
    all_chunks = rag_engine.search(request.message, request.workspace_id, top_k=10)

    # Filter to chunks with meaningful similarity (score >= 0.25 after 1/(1+dist))
    # but always keep at least 3 if available to avoid empty responses on edge queries
    scored = [c for c in all_chunks if c.get("similarity_score", 0) >= 0.25]
    chunks = scored if len(scored) >= 3 else all_chunks[:5]

    if not chunks:
        return ChatResponse(
            response=(
                "There are no papers imported in this workspace yet. "
                "Please import papers via Search Papers or Upload PDF first, "
                "then I can answer questions about them."
            ),
            citations=[],
            workspace_id=request.workspace_id,
        )

    # 3. Build context string
    context = rag_engine.build_context(chunks)

    # 4. Call Groq LLM
    completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"## Retrieved Workspace Documents ({len(chunks)} relevant chunks)\n\n"
                    f"{context}\n\n"
                    f"---\n\n"
                    f"## Question\n{request.message}\n\n"
                    f"Please synthesize an answer using only the documents above. "
                    f"If the documents do not contain enough information to answer accurately, say: "
                    f'"I could not find enough information in the workspace documents to answer this question." ' 
                    f"Use inline citations to reference paper titles from the retrieved documents."
                ),
            },
        ],
        **MODEL_CONFIG,
    )
    ai_text = completion.choices[0].message.content

    # 5. Store conversation in DB
    conversation = Conversation(
        workspace_id=request.workspace_id,
        user_message=request.message,
        ai_response=ai_text,
    )
    db.add(conversation)
    await db.commit()

    # 6. Build citation list from retrieved chunks
    from schemas.chat import Citation

    citations = [
        Citation(
            paper_title=c.get("paper_title", "Unknown"),
            authors=c.get("authors", []),
            source_website=c.get("source_website", "Unknown"),
            retrieval_method=c.get("source_type", "Unknown"),
            url=c.get("url"),
        )
        for c in chunks
    ]

    return ChatResponse(
        response=ai_text,
        citations=citations,
        workspace_id=request.workspace_id,
    )


@router.get("/history", response_model=list[ConversationResponse])
async def get_history(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or (
        workspace.user_id != current_user.id
        and current_user.role != UserRole.admin
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Conversation)
        .where(Conversation.workspace_id == workspace_id)
        .order_by(Conversation.timestamp.asc())
    )
    return result.scalars().all()
