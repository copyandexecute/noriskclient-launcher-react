use quick_xml::events::{BytesCData, Event};
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::str;
use std::sync::Arc;
use uuid::Uuid;

use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader};
use tokio::task;

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

    fn format_unix_ms_to_hhmmss(unix_timestamp_ms: i64) -> String {
        use chrono::{DateTime, NaiveDateTime, Utc};
        let naive_datetime = NaiveDateTime::from_timestamp_millis(unix_timestamp_ms)
            .unwrap_or_else(|| NaiveDateTime::from_timestamp_opt(0, 0).unwrap());
        let datetime_utc: DateTime<Utc> = DateTime::from_naive_utc_and_offset(naive_datetime, Utc);
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
                                _ => {} 
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
                }
                Ok(Event::End(ref e)) if e.name().as_ref() == b"log4j:Message" => {
                    in_message_tag = false;
                }
                Ok(Event::End(ref e)) if e.name().as_ref() == b"log4j:Event" => {
                    break; 
                }
                Ok(Event::Eof) => break, 
                Err(e) => {
                    log::warn!(
                        "Error during XML parsing for process {}: {:?}, XML block: '{}'",
                        process_id_uuid,
                        e,
                        xml_block
                    );
                    return None; 
                }
                _ => {} 
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
        line_option: Option<String>,
        process_id: Uuid,
        event_state: &EventState,
    ) {
        if let Some(line) = line_option.as_ref() {
            if !line.is_empty() {
                self.buffer.push_str(line);
                self.buffer.push('\n'); 
            }
        }

        loop {
            if let Some(mut actual_start_index) = self.buffer.find("<log4j:Event") {
                if actual_start_index > 0 {
                    let prefix_garbage = self.buffer[..actual_start_index].to_string();
                    if !prefix_garbage.trim().is_empty() {
                        log::trace!(
                            "Non-XML data found and discarded before <log4j:Event> in buffer for process {}: '{}'",
                            process_id,
                            prefix_garbage.trim()
                        );
                    }
                    self.buffer = self.buffer[actual_start_index..].to_string();
                    actual_start_index = 0;
                }

                if let Some(end_tag_index) = self.buffer.find("</log4j:Event>") {
                    let end_block_marker = end_tag_index + "</log4j:Event>".len();
                    let xml_block_to_process = self.buffer[..end_block_marker].to_string();
                    self.buffer = self.buffer[end_block_marker..].to_string();

                    if let Some(parsed_payload) = Self::parse_xml_block(&xml_block_to_process, process_id) {
                        let event_id = Uuid::new_v4();
                        match serde_json::to_string(&parsed_payload) {
                            Ok(json_payload) => {
                                let general_event = EventPayload {
                                    event_id,
                                    event_type: EventType::MinecraftXmlLogEntry, 
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
                    if line_option.is_none() && !self.buffer.is_empty() {
                        log::trace!(
                            "Flush called for process {}, but remaining buffer is an incomplete XML block ({} bytes): '{}'", 
                            process_id, self.buffer.len(), self.buffer.chars().take(200).collect::<String>()
                        );
                    }
                    break; 
                }
            } else {
                if !self.buffer.is_empty() {
                    if line_option.is_none() || self.buffer.len() > 4096 {
                        log::trace!(
                            "Buffer for process {} contains non-XML data or grew too large. Clearing. Content (first 200 chars): '{}'", 
                            process_id, self.buffer.chars().take(200).collect::<String>()
                        );
                        self.buffer.clear(); 
                    }
                }
                break; 
            }
        }
    }

    pub fn spawn_task_for_pipe<T: AsyncRead + Unpin + Send + 'static>(
        pipe: T,
        process_id: Uuid,
        event_state_clone: Arc<EventState>,
    ) {
        task::spawn(async move {
            let mut parser = XmlLogParser::new();
            let mut reader = BufReader::new(pipe);
            let mut line_buffer = String::new();
            
            log::debug!(
                "Pipe reading task started for process {} using XmlLogParser.",
                process_id
            );

            loop {
                match reader.read_line(&mut line_buffer).await {
                    Ok(0) => {
                        log::debug!(
                            "Pipe for process {} closed. Flushing parser and finishing task.",
                            process_id
                        );
                        parser.process_line(None, process_id, &event_state_clone).await;
                        break;
                    }
                    Ok(_bytes_read) => {
                        let current_line = line_buffer.trim_end().to_string();
                        if !current_line.is_empty() {
                            log::debug!(
                                "Pipe for {} received line for parser: '{}'",
                                process_id,
                                current_line
                            );
                            parser.process_line(Some(current_line), process_id, &event_state_clone).await;
                        }
                        line_buffer.clear();
                    }
                    Err(e) => {
                        log::error!(
                            "Error reading from pipe for process {}: {}. Task finishing.",
                            process_id,
                            e
                        );
                        break;
                    }
                }
            }
            log::debug!(
                "Pipe reading task finished for process {}",
                process_id
            );
        });
    }
} 