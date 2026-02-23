interface ITranscriptType {
    type: "transcript",
    id: string,
    text: string,
    role: string,
    final: boolean
}

interface IStatusType {
    type: "status",
    status: string
}

interface IErrorType {
    type: "error",
    error: string
}

export interface IProcessedType {
    type: "processed",
    id: string,
    text: string,
    message_ids: string[]
}

export interface IHighlightType {
    type: "highlight",
    id: string,
    text: string,
    message_ids: string[]
}

export interface ISummarizedType {
    type: "summarized",
    id: string,
    text: string,
    message_ids: string[]
}

export type ITranscriptMessage = ITranscriptType | IStatusType | IErrorType | IProcessedType | IHighlightType | ISummarizedType;


export interface IInitMessage {
    language: string;
    session_id: string;
}