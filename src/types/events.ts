export interface EventPayload {
    event_id: string;
    event_type: string;
    target_id: string | null;
    message: string;
    progress: number | null;
    error: string | null;
}