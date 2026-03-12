# AI Cost Analysis for Mediscribe

## Overview
This document provides a comprehensive analysis of all AI service costs in the Mediscribe application. The system uses multiple OpenAI services and models for various medical AI functionalities.

## AI Services Used

### 1. Speech-to-Text (STT) - Real-time Voice Transcription
**Service**: OpenAI Realtime Voice API  
**Implementation**: `src/ai/stt-handler.ts`
- **Model**: `gpt-4o-mini-realtime-preview-2024-12-17`
- **Transcription Model**: `gpt-4o-transcribe`
- **Usage**: Real-time medical conversation transcription
- **Cost Structure**: Per-session connection + audio processing time
- **Features**: Voice Activity Detection (VAD), Indian English optimization

### 2. Medical Transcript Processing
**Service**: Groq/OpenAI  
**Implementation**: `src/ai/agents/processing-agent.ts`
- **Model**: `groq/openai/gpt-oss-20b`
- **Usage**: Batch processing of transcript segments
- **Functions**: 
  - Highlighting medical terms
  - Generating clinical summaries
- **Trigger**: After minimum 10 words + 1+ new messages + 1000ms debounce

### 3. Chat Assistant
**Service**: OpenAI GPT  
**Implementation**: `src/ai/agents/chat-agent.ts`
- **Model**: `gpt-4o-mini` (default, configurable via `CHAT_MODEL` env var)
- **Usage**: Medical Q&A, clinical assistance
- **Features**: 
  - Memory (40 message history)
  - RAG (Retrieval Augmented Generation)
  - Vector search capabilities

### 4. SOAP Notes Generation
**Service**: OpenAI GPT  
**Implementation**: `src/ai/agents/soap-agent.ts`
- **Model**: `gpt-4o-mini` (default, configurable via `CHAT_MODEL` env var)  
- **Usage**: Converting transcripts to structured SOAP clinical notes
- **Output**: JSON with Subjective, Objective, Assessment, Plan sections

### 5. Document Processing
**Service**: OpenAI GPT  
**Implementation**: `src/ai/agents/document-agent.ts`
- **Model**: `gpt-4o-mini` (default, configurable via `CHAT_MODEL` env var)
- **Usage**: OCR cleanup and medical document structuring
- **Functions**: Remove artifacts, fix medical terminology, preserve clinical data

### 6. Embeddings for Vector Search
**Service**: OpenAI Embeddings  
**Implementation**: Multiple locations
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Usage**:
  - Transcript embedding for RAG (`process-transcript.ts`)
  - Document search (`chat-agent.ts` tools)
  - Vector database operations (Chroma)

## Cost Calculation Framework

### Per-Session STT Costs
```
Real-time Voice API:
- Connection setup: $X per session
- Audio processing: $Y per minute
- Transcription: $Z per audio minute
```

### Per-Interaction Costs
```
Chat Agent:
- Input tokens: ~500-2000 tokens (including context + RAG)
- Output tokens: ~200-800 tokens
- Cost: Input rate × input_tokens + Output rate × output_tokens

SOAP Generation:
- Input tokens: ~1000-5000 tokens (full transcript)
- Output tokens: ~500-1500 tokens (structured SOAP)
- Cost: Input rate × input_tokens + Output rate × output_tokens

Document Processing:
- Input tokens: ~2000-10000 tokens (OCR text)
- Output tokens: ~1000-5000 tokens (cleaned text)
- Cost: Input rate × input_tokens + Output rate × output_tokens

Processing Agent (Groq):
- Input tokens: ~500-2000 tokens (transcript batch)
- Output tokens: ~200-800 tokens (highlights/summary)
- Cost: Groq pricing × tokens
```

### Embedding Costs
```
Text Embedding (per operation):
- Model: text-embedding-3-small
- Cost: $X per 1K tokens
- Usage: Every processed transcript batch + document uploads
```

## Usage Patterns

### Typical Session Flow
1. **STT Connection**: Real-time voice processing (~15-60 minutes)
2. **Transcript Processing**: Every ~10 words + 1s debounce (multiple times per session)
3. **Embedding**: For each processed batch (for RAG storage)
4. **SOAP Generation**: Once per session (end of appointment)
5. **Chat Interactions**: Variable (0-20+ per session)
6. **Document Processing**: Per uploaded document

### High-Usage Scenarios
- Long consultations (60+ minutes)
- Multiple document uploads
- Extensive chat interactions
- Complex medical cases requiring multiple SOAP iterations

## Cost Optimization Opportunities

### Current Optimizations
✅ **Debouncing**: 1000ms debounce on transcript processing  
✅ **Batch Processing**: Minimum 10 words before processing  
✅ **Smart Triggers**: Only process when new content available  
✅ **Model Selection**: Using `gpt-4o-mini` for most operations (cost-effective)  
✅ **Groq Integration**: Using Groq for transcript processing (potentially lower cost)  

### Additional Optimizations
1. **Token Management**: Monitor and limit context windows
2. **Caching**: Cache common medical term corrections
3. **Model Tiering**: Use smaller models for simpler tasks
4. **Rate Limiting**: Implement usage caps for demo users
5. **Preprocessing**: Filter out non-medical content before AI processing

## Monitoring & Tracking

### Token Usage Tracking
The system tracks token usage in chat messages:
```typescript
usage: {
    promptTokens: number,
    completionTokens: number, 
    totalTokens: number
}
```

### Recommended Metrics
- Total tokens per session
- Cost per medical consultation
- Usage by feature (STT, Chat, SOAP, Documents)
- Average session duration vs. cost
- Token efficiency ratios

## Demo User Considerations

For test/demo users, consider implementing:
1. **Usage Limits**: Cap total tokens/sessions per day
2. **Feature Restrictions**: Limit document processing or chat interactions
3. **Session Duration Limits**: Maximum STT session length
4. **Cost Alerts**: Notifications when approaching limits
5. **Model Restrictions**: Use only smaller/cheaper models for demos

## Cost Estimation (Example Session)

### Typical 30-minute Medical Consultation
```
STT (30 min): ~$X.XX
Transcript Processing (5 batches): ~$X.XX  
Embedding (5 batches): ~$X.XX
SOAP Generation (1x): ~$X.XX
Chat Interactions (3x): ~$X.XX
Total: ~$X.XX per session
```

*Note: Actual costs depend on current OpenAI/Groq pricing and usage patterns.*

## Recommendations

1. **Implement Usage Monitoring**: Track all AI operations and costs in real-time
2. **Set Demo Limits**: Establish clear boundaries for test users
3. **Optimize Prompts**: Reduce token usage while maintaining quality
4. **Consider Alternatives**: Evaluate local models for some operations
5. **Batch Operations**: Group similar operations when possible
6. **Monitor Performance**: Regular analysis of cost vs. value delivered

---

*Last Updated: March 13, 2026*  
*For questions about AI costs or optimizations, refer to the development team.*
