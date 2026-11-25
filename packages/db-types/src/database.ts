
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "arandu_facts": {
                  Row: {
                    "created_at": string,"id": number,"source": string,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"source": string,"text": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"source"?: string,"text"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "arandu_facts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"arandu_memories": {
                  Row: {
                    "profile": Json | null,"summary": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "profile"?: Json | null,"summary"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "profile"?: Json | null,"summary"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "arandu_memories_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"arandu_messages": {
                  Row: {
                    "content": string,"created_at": string,"id": number,"role": string,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: never,"role": string,"session_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: never,"role"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "arandu_messages_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "arandu_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"arandu_sessions": {
                  Row: {
                    "covered": (string)[],"id": string,"kind": string,"profession_slug": string | null,"started_at": string,"summarized_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "covered"?: (string)[],"id"?: string,"kind": string,"profession_slug"?: string | null,"started_at"?: string,"summarized_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "covered"?: (string)[],"id"?: string,"kind"?: string,"profession_slug"?: string | null,"started_at"?: string,"summarized_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "arandu_sessions_profession_slug_fkey"
      columns: ["profession_slug"]
isOneToOne: false
      referencedRelation: "professions"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "arandu_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"book_reflections": {
                  Row: {
                    "chips": (string)[],"discipline_id": number,"text": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chips"?: (string)[],"discipline_id": number,"text"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "chips"?: (string)[],"discipline_id"?: number,"text"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "book_reflections_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_reflections_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"caixas": {
                  Row: {
                    "contents": Json | null,"created_at": string,"id": number,"opened_at": string | null,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contents"?: Json | null,"created_at"?: string,"id"?: never,"opened_at"?: string | null,"reason": string,"user_id": string
                  }
                  Update: {
                    "contents"?: Json | null,"created_at"?: string,"id"?: never,"opened_at"?: string | null,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "caixas_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_cards": {
                  Row: {
                    "cards": NonNullable<Json>,"created_at": string,"discipline_id": number,"topic": number,"topic_text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cards": NonNullable<Json>,"created_at"?: string,"discipline_id": number,"topic": number,"topic_text": string
                  }
                  Update: {
                    "cards"?: NonNullable<Json>,"created_at"?: string,"discipline_id"?: number,"topic"?: number,"topic_text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_cards_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_contents": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"discipline_id": number,"topic": number,"topic_text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"created_at"?: string,"discipline_id": number,"topic": number,"topic_text": string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"discipline_id"?: number,"topic"?: number,"topic_text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_contents_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_questions": {
                  Row: {
                    "answer": string,"created_at": string,"discipline_id": number,"id": number,"question": string,"summarized_at": string | null,"topic": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"discipline_id": number,"id"?: never,"question": string,"summarized_at"?: string | null,"topic": number,"user_id": string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"discipline_id"?: number,"id"?: never,"question"?: string,"summarized_at"?: string | null,"topic"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_questions_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chapter_questions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_rereads": {
                  Row: {
                    "created_at": string,"discipline_id": number,"topic": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"discipline_id": number,"topic": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"discipline_id"?: number,"topic"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_rereads_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chapter_rereads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_results": {
                  Row: {
                    "completed_at": string,"discipline_id": number,"mistakes": number,"relampago_mistakes": number | null,"sabedoria": number,"topic": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"discipline_id": number,"mistakes": number,"relampago_mistakes"?: number | null,"sabedoria": number,"topic": number,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string,"discipline_id"?: number,"mistakes"?: number,"relampago_mistakes"?: number | null,"sabedoria"?: number,"topic"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_results_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chapter_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"cine_areas": {
                  Row: {
                    "code": string,"name": string,"parent_code": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"name": string,"parent_code"?: string | null
                  }
                  Update: {
                    "code"?: string,"name"?: string,"parent_code"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cine_areas_parent_code_fkey"
      columns: ["parent_code"]
isOneToOne: false
      referencedRelation: "cine_areas"
      referencedColumns: ["code"]
    }
                  ]
                },"courses": {
                  Row: {
                    "campus_name": string | null,"campus_source_id": number | null,"city": string | null,"degree": string | null,"duration_years": number | null,"id": number,"inep_code": number,"institution_id": number,"modality": string,"name": string,"profession_id": number | null,"shift": string | null,"source_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "campus_name"?: string | null,"campus_source_id"?: number | null,"city"?: string | null,"degree"?: string | null,"duration_years"?: number | null,"id"?: never,"inep_code": number,"institution_id": number,"modality"?: string,"name": string,"profession_id"?: number | null,"shift"?: string | null,"source_id": number
                  }
                  Update: {
                    "campus_name"?: string | null,"campus_source_id"?: number | null,"city"?: string | null,"degree"?: string | null,"duration_years"?: number | null,"id"?: never,"inep_code"?: number,"institution_id"?: number,"modality"?: string,"name"?: string,"profession_id"?: number | null,"shift"?: string | null,"source_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_campus_source_id_fkey"
      columns: ["campus_source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_profession_id_fkey"
      columns: ["profession_id"]
isOneToOne: false
      referencedRelation: "professions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "courses_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"curriculum_subjects": {
                  Row: {
                    "course_id": number,"discipline_id": number | null,"hours": number | null,"id": number,"is_elective": boolean | null,"name": string,"shift": string | null,"source_id": number,"subject_key": string | null,"term": number | null,"term_to": number | null,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": number,"discipline_id"?: number | null,"hours"?: number | null,"id"?: never,"is_elective"?: boolean | null,"name": string,"shift"?: string | null,"source_id": number,"subject_key"?: never,"term"?: number | null,"term_to"?: number | null,"year"?: number | null
                  }
                  Update: {
                    "course_id"?: number,"discipline_id"?: number | null,"hours"?: number | null,"id"?: never,"is_elective"?: boolean | null,"name"?: string,"shift"?: string | null,"source_id"?: number,"subject_key"?: never,"term"?: number | null,"term_to"?: number | null,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "curriculum_subjects_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "curriculum_subjects_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "curriculum_subjects_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"disciplines": {
                  Row: {
                    "bibliography": (string)[] | null,"code": string,"id": number,"institution_id": number,"name": string,"program": string | null,"source_id": number,"subject_key": string | null,"topics": (string)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bibliography"?: (string)[] | null,"code": string,"id"?: never,"institution_id": number,"name": string,"program"?: string | null,"source_id": number,"subject_key"?: never,"topics"?: (string)[] | null
                  }
                  Update: {
                    "bibliography"?: (string)[] | null,"code"?: string,"id"?: never,"institution_id"?: number,"name"?: string,"program"?: string | null,"source_id"?: number,"subject_key"?: never,"topics"?: (string)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "disciplines_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disciplines_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"game_settings": {
                  Row: {
                    "id": boolean,"league_anchor_on": string,"league_period_days": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"league_anchor_on": string,"league_period_days": number,"updated_at"?: string
                  }
                  Update: {
                    "id"?: boolean,"league_anchor_on"?: string,"league_period_days"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"institutions": {
                  Row: {
                    "id": number,"inep_code": number,"kind": string,"logo_license": string | null,"logo_source_url": string | null,"logo_url": string | null,"name": string,"photo_credit": string | null,"photo_license": string | null,"photo_source_url": string | null,"photo_url": string | null,"short_name": string | null,"source_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"inep_code": number,"kind": string,"logo_license"?: string | null,"logo_source_url"?: string | null,"logo_url"?: string | null,"name": string,"photo_credit"?: string | null,"photo_license"?: string | null,"photo_source_url"?: string | null,"photo_url"?: string | null,"short_name"?: string | null,"source_id": number
                  }
                  Update: {
                    "id"?: never,"inep_code"?: number,"kind"?: string,"logo_license"?: string | null,"logo_source_url"?: string | null,"logo_url"?: string | null,"name"?: string,"photo_credit"?: string | null,"photo_license"?: string | null,"photo_source_url"?: string | null,"photo_url"?: string | null,"short_name"?: string | null,"source_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "institutions_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"journeys": {
                  Row: {
                    "age": number | null,"answers": Json | null,"course_id": number | null,"discipline_id": number | null,"profession_slug": string | null,"updated_at": string,"user_id": string,"weekly_goal": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "age"?: number | null,"answers"?: Json | null,"course_id"?: number | null,"discipline_id"?: number | null,"profession_slug"?: string | null,"updated_at"?: string,"user_id": string,"weekly_goal"?: number | null
                  }
                  Update: {
                    "age"?: number | null,"answers"?: Json | null,"course_id"?: number | null,"discipline_id"?: number | null,"profession_slug"?: string | null,"updated_at"?: string,"user_id"?: string,"weekly_goal"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "journeys_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "journeys_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "journeys_profession_slug_fkey"
      columns: ["profession_slug"]
isOneToOne: false
      referencedRelation: "professions"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "journeys_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_results": {
                  Row: {
                    "completed_at": string,"discipline_id": number,"lesson": number,"missed": NonNullable<Json>,"sabedoria": number,"topic": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"discipline_id": number,"lesson": number,"missed"?: NonNullable<Json>,"sabedoria": number,"topic": number,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string,"discipline_id"?: number,"lesson"?: number,"missed"?: NonNullable<Json>,"sabedoria"?: number,"topic"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_results_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: false
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"owned_items": {
                  Row: {
                    "created_at": string,"item": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"item": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"item"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "owned_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "league": number,"league_week": string,"nickname": string | null,"promoted_from": number | null,"updated_at": string,"user_id": string,"wearing": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "league"?: number,"league_week": string,"nickname"?: string | null,"promoted_from"?: number | null,"updated_at"?: string,"user_id": string,"wearing"?: string | null
                  }
                  Update: {
                    "league"?: number,"league_week"?: string,"nickname"?: string | null,"promoted_from"?: number | null,"updated_at"?: string,"user_id"?: string,"wearing"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"professions": {
                  Row: {
                    "area_code": string | null,"cine_code": string,"id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_code"?: never,"cine_code": string,"id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "area_code"?: never,"cine_code"?: string,"id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "professions_area_code_fkey"
      columns: ["area_code"]
isOneToOne: false
      referencedRelation: "cine_areas"
      referencedColumns: ["code"]
    }
                  ]
                },"scrape_runs": {
                  Row: {
                    "adapter": string,"error": string | null,"finished_at": string | null,"id": number,"rows_written": number | null,"started_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter": string,"error"?: string | null,"finished_at"?: string | null,"id"?: never,"rows_written"?: number | null,"started_at"?: string,"status"?: string
                  }
                  Update: {
                    "adapter"?: string,"error"?: string | null,"finished_at"?: string | null,"id"?: never,"rows_written"?: number | null,"started_at"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"season_claims": {
                  Row: {
                    "created_at": string,"level": number,"season": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"level": number,"season": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"level"?: number,"season"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "season_claims_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"session_refresh_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": number,"revoked_at": string | null,"session_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: never,"revoked_at"?: string | null,"session_id": string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: never,"revoked_at"?: string | null,"session_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_refresh_tokens_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"ip": string | null,"last_seen_at": string,"revoked_at": string | null,"revoked_reason": string | null,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"ip"?: string | null,"last_seen_at"?: string,"revoked_at"?: string | null,"revoked_reason"?: string | null,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"ip"?: string | null,"last_seen_at"?: string,"revoked_at"?: string | null,"revoked_reason"?: string | null,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "adapter": string,"created_at": string,"id": number,"label": string,"last_content_hash": string | null,"last_fetched_at": string | null,"refresh_interval": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter": string,"created_at"?: string,"id"?: never,"label": string,"last_content_hash"?: string | null,"last_fetched_at"?: string | null,"refresh_interval"?: string,"url": string
                  }
                  Update: {
                    "adapter"?: string,"created_at"?: string,"id"?: never,"label"?: string,"last_content_hash"?: string | null,"last_fetched_at"?: string | null,"refresh_interval"?: string,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"story_facts": {
                  Row: {
                    "book": string,"figure": string | null,"id": number,"page": number,"position": number,"source_label": string | null,"source_url": string | null,"text": string,"verified_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book": string,"figure"?: string | null,"id"?: never,"page": number,"position": number,"source_label"?: string | null,"source_url"?: string | null,"text": string,"verified_on": string
                  }
                  Update: {
                    "book"?: string,"figure"?: string | null,"id"?: never,"page"?: number,"position"?: number,"source_label"?: string | null,"source_url"?: string | null,"text"?: string,"verified_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_facts_book_page_fkey"
      columns: ["book","page"]
isOneToOne: false
      referencedRelation: "story_pages"
      referencedColumns: ["book","page"]
    }
                  ]
                },"story_pages": {
                  Row: {
                    "book": string,"page": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book": string,"page": number,"title": string
                  }
                  Update: {
                    "book"?: string,"page"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subjects": {
                  Row: {
                    "discipline_id": number,"key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "discipline_id": number,"key": string
                  }
                  Update: {
                    "discipline_id"?: number,"key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subjects_discipline_id_fkey"
      columns: ["discipline_id"]
isOneToOne: true
      referencedRelation: "disciplines"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "avatar_url": string | null,"banned_at": string | null,"created_at": string,"email": string | null,"google_sub": string | null,"id": string,"last_seen_at": string,"name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"banned_at"?: string | null,"created_at"?: string,"email"?: string | null,"google_sub"?: string | null,"id"?: string,"last_seen_at"?: string,"name"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"banned_at"?: string | null,"created_at"?: string,"email"?: string | null,"google_sub"?: string | null,"id"?: string,"last_seen_at"?: string,"name"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"wallets": {
                  Row: {
                    "marcadores": number,"novelos": number,"novelos_at": string,"novelos_bought": number,"novelos_bought_on": string | null,"peixinhos": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "marcadores"?: number,"novelos"?: number,"novelos_at"?: string,"novelos_bought"?: number,"novelos_bought_on"?: string | null,"peixinhos"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "marcadores"?: number,"novelos"?: number,"novelos_at"?: string,"novelos_bought"?: number,"novelos_bought_on"?: string | null,"peixinhos"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wallets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "career_grids": {
                  Row: {
                    "profession_id": number | null,"source_id": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "courses_profession_id_fkey"
      columns: ["profession_id"]
isOneToOne: false
      referencedRelation: "professions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "curriculum_subjects_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "subject_key":
{ Args: { "p_name": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
