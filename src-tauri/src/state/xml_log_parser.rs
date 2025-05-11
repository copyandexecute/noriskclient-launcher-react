use quick_xml::events::{BytesCData, Event};
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::str;
use uuid::Uuid;

use crate::state::event_state::{EventPayload, EventState, EventType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedXmlLogPayload {
    pub process_id: String, 
    pub timestamp: String,  
    pub thread_name: String,
    pub level: String,
    pub message: String,
    pub raw_xml: String, 
}

#[derive(Debug, Default)]
pub struct XmlLogParser {
    buffer: String,
}

impl XmlLogParser {
    pub fn new() -> Self {
        Self::default()
    }

    // Helper to format Unix MS to HH:MM:SS
    // Similar to the one in frontend, but in Rust
    fn format_unix_ms_to_hhmmss(unix_timestamp_ms: i64) -> String {
        use chrono::{DateTime, NaiveDateTime, Utc};
        // Create a NaiveDateTime from the Unix timestamp in milliseconds
        let naive_datetime = NaiveDateTime::from_timestamp_millis(unix_timestamp_ms)
            .unwrap_or_else(|| NaiveDateTime::from_timestamp_opt(0, 0).unwrap()); // Fallback to epoch
        // Convert to DateTime<Utc>
        let datetime_utc: DateTime<Utc> = DateTime::from_naive_utc_and_offset(naive_datetime, Utc);
        // Format to HH:MM:SS
        datetime_utc.format("%H:%M:%S").to_string()
    }

    fn parse_xml_block(xml_block: &str, process_id_uuid: Uuid) -> Option<ParsedXmlLogPayload> {
        let mut reader = Reader::from_str(xml_block);
        reader.trim_text(true);

        let mut timestamp_ms: Option<i64> = None;
        let mut level: Option<String> = None;
        let mut thread_name: Option<String> = None;
        let mut message: Option<String> = None;

        let mut buf = Vec::new();
        let mut in_message_tag = false;

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) if e.name().as_ref() == b"log4j:Event" => {
                    for attr_result in e.attributes() {
                        if let Ok(attr) = attr_result {
                            match attr.key.as_ref() {
                                b"timestamp" => {
                                    if let Ok(val_str) = str::from_utf8(&attr.value) {
                                        timestamp_ms = val_str.parse::<i64>().ok();
                                    }
                                }
                                b"level" => {
                                    if let Ok(val_str) = str::from_utf8(&attr.value) {
                                        level = Some(val_str.to_uppercase());
                                    }
                                }
                                b"thread" => {
                                    if let Ok(val_str) = str::from_utf8(&attr.value) {
                                        thread_name = Some(val_str.to_string());
                                    }
                                }
                                _ => {} // Ignore other attributes
                            }
                        }
                    }
                }
                Ok(Event::Start(ref e)) if e.name().as_ref() == b"log4j:Message" => {
                    in_message_tag = true;
                }
                Ok(Event::CData(ref cdata)) if in_message_tag => {
                    if let Ok(text) = str::from_utf8(cdata.as_ref()) {
                        message = Some(text.to_string());
                    }
                    // Assuming CDATA is the only content of log4j:Message
                    // and we exit after finding it.
                    // More robust parsing might handle other nested elements if they exist.
                }
                Ok(Event::End(ref e)) if e.name().as_ref() == b"log4j:Message" => {
                    in_message_tag = false;
                }
                Ok(Event::End(ref e)) if e.name().as_ref() == b"log4j:Event" => {
                    // End of the event, break if we have all parts or decide based on requirements
                    break; 
                }
                Ok(Event::Eof) => break, // End of file
                Err(e) => {
                    log::warn!(
                        "Error during XML parsing for process {}: {:?}, XML block: '{}'",
                        process_id_uuid,
                        e,
                        xml_block
                    );
                    return None; // Parsing error
                }
                _ => {} // Ignore other XML events
            }
            buf.clear();
        }
        
        if let (Some(ts_ms), Some(lvl), Some(thread), Some(msg)) =
            (timestamp_ms, level, thread_name, message)
        {
            Some(ParsedXmlLogPayload {
                process_id: process_id_uuid.to_string(),
                timestamp: Self::format_unix_ms_to_hhmmss(ts_ms),
                level: lvl,
                thread_name: thread,
                message: msg,
                raw_xml: xml_block.to_string(),
            })
        } else {
            log::warn!(
                "Failed to extract all required fields from XML for process {}. XML: '{}'",
                process_id_uuid,
                xml_block
            );
            None
        }
    }

    pub async fn process_line(
        &mut self,
        line: String,
        process_id: Uuid,
        event_state: &EventState,
    ) {
        self.buffer.push_str(&line);
        self.buffer.push('\n'); // Add newline in case lines are sent without them

        // Process all complete <log4j:Event>...</log4j:Event> blocks in the buffer
        loop {
            if let Some(start_index) = self.buffer.find("<log4j:Event") {
                // We found a potential start. Now look for the corresponding end.
                // This assumes events are not nested and well-formed regarding this tag.
                if let Some(end_tag_index) = self.buffer[start_index..].find("</log4j:Event>") {
                    // Calculate the actual end index in the full buffer
                    let end_index = start_index + end_tag_index + "</log4j:Event>".len();
                    
                    // Extract the complete XML block
                    let xml_block_to_process = self.buffer[start_index..end_index].to_string();
                    
                    // Remove the processed block (including the start_index part if it's not 0)
                    // and anything before it, if we started not at buffer index 0.
                    // This handles cases where there might be garbage data before the first valid event.
                    self.buffer = self.buffer[end_index..].to_string();

                    // Offload parsing to a non-blocking task if it's potentially heavy,
                    // though quick-xml is fast. For now, direct call.
                    if let Some(parsed_payload) = Self::parse_xml_block(&xml_block_to_process, process_id) {
                        let event_id = Uuid::new_v4();
                        match serde_json::to_string(&parsed_payload) {
                            Ok(json_payload) => {
                                let general_event = EventPayload {
                                    event_id,
                                    event_type: EventType::MinecraftXmlLogEntry, // New event type
                                    target_id: Some(process_id),
                                    message: json_payload,
                                    progress: None,
                                    error: None,
                                };
                                if let Err(e) = event_state.emit(general_event).await {
                                    log::error!(
                                        "Failed to emit MinecraftXmlLogEntry for process {}: {}",
                                        process_id,
                                        e
                                    );
                                }
                            }
                            Err(e) => {
                                log::error!(
                                    "Failed to serialize ParsedXmlLogPayload for process {}: {}",
                                    process_id,
                                    e
                                );
                            }
                        }
                    }
                } else {
                    // Found a start tag, but no end tag yet in the current buffer.
                    // Need more lines.
                    break; 
                }
            } else {
                // No start tag found.
                // If buffer is not empty, it means it contains partial data not forming a complete event.
                // Or it contains non-XML data.
                // For now, we clear it if it gets too large to prevent memory bloat,
                // or if we are sure no more XML is coming.
                // This part needs more robust handling for mixed content.
                // If the buffer contains data but no start tag, it's likely non-XML or garbage.
                // If we only expect XML from these streams, we might log and clear.
                // Let's assume for now that if there's no start tag, the current buffer is not XML.
                // If it's very long, it could be an issue.
                if !self.buffer.is_empty() && self.buffer.len() > 4096 { // Arbitrary limit
                    log::warn!("XML log buffer for process {} grew large without a complete event, clearing: {} bytes", process_id, self.buffer.len());
                    // Before clearing, we could try to emit it as raw lines
                    // For now, just clear to prevent runaway buffer with malformed data.
                    self.buffer.clear();
                }
                break; 
            }
        }
    }
}

// To ensure the module is recognized by the main lib or binary, you might need to add:
// pub mod xml_log_parser;
// in src-tauri/src/state/mod.rs (if you have one) or lib.rs / main.rs
// And then use crate::state::xml_log_parser::XmlLogParser; 